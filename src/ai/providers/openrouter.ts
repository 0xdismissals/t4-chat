import OpenAI from 'openai';
import type { Customisation } from "@/data/db";
import type { ChatBlock, MessagePayload } from './google-genai'; // Re-using types for simplicity
import { formatPrompt } from '@/ai/promptFormat';

// Note: OpenRouter uses prefixed model strings, e.g., "openai/gpt-4o"
// We accept a generic string here.
export type OpenRouterModel = string; 

export interface OpenRouterOptions {
  apiKey: string;
  model: OpenRouterModel;
}

export class OpenRouterProvider {
  private openai: OpenAI;
  private model: OpenRouterModel;

  constructor({ apiKey, model }: OpenRouterOptions) {
    this.openai = new OpenAI({ 
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
            "HTTP-Referer": "https://github.com/di-sukharev/t4-chat", // TODO: Replace with your actual site URL
            "X-Title": "T4-Chat", 
        }
    });
    this.model = model;
  }

  private formatMessagesForApi(messages: MessagePayload[], customisation?: Customisation | null, forceJson: boolean = true): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    if (!forceJson) {
      // For simple text generation (like titles), just use the last message.
      const lastMessage = messages[messages.length - 1];
      return [{ role: "user", content: lastMessage.content }];
    }

    const history = messages.slice(0, -1);
    const latestMessage = messages[messages.length - 1];

    const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    // Add history messages as they are
    history.forEach(msg => {
        formattedMessages.push({ role: msg.role, content: msg.content });
    });
    
    // Format the latest user message with the JSON structure prompt
    const formattedPrompt = formatPrompt(latestMessage.content, customisation);
    formattedMessages.push({ role: 'user', content: formattedPrompt });

    return formattedMessages;
  }

  async *generateTextStream(
    messages: MessagePayload[],
    customisation?: Customisation | null,
    enableThinking?: boolean,
    abortSignal?: AbortSignal,
    forceJson: boolean = true,
  ): AsyncGenerator<ChatBlock, void, unknown> {
    
    const apiMessages = this.formatMessagesForApi(messages, customisation, forceJson);

    const stream = await this.openai.chat.completions.create({
      model: this.model,
      messages: apiMessages,
      stream: true,
      response_format: forceJson ? { type: "json_object" } : undefined,
    });

    let buffer = "";
    if (!forceJson) {
      // Simple text stream
      for await (const chunk of stream) {
        if (abortSignal?.aborted) {
          stream.controller.abort();
          break;
        }
        buffer += chunk.choices[0]?.delta?.content || "";
      }
      if (!abortSignal?.aborted) {
        yield { type: 'paragraph', content: buffer };
      }
      return;
    }

    // JSON stream
    for await (const chunk of stream) {
      if (abortSignal?.aborted) {
        stream.controller.abort();
        break;
      }
      buffer += chunk.choices[0]?.delta?.content || "";
    }
    
    if (abortSignal?.aborted) {
        try {
            const data = JSON.parse(buffer);
            if (data.blocks && Array.isArray(data.blocks)) {
                for (const block of data.blocks) {
                    yield block;
                }
            }
        } catch (e) {
            // Partial data was not valid JSON, which is expected on cancellation.
        }
        return;
    }
    
    console.log("Raw OpenRouter Response Buffer:", buffer);

    try {
      const data = JSON.parse(buffer);
      // Check for the ideal structure first
      if (data.blocks && Array.isArray(data.blocks)) {
        for (const block of data.blocks) {
          yield block;
        }
      } else {
        // If the structure is not what we expect, stringify the whole object
        // and return it in a code block for the user to see the raw output.
        console.warn("Unexpected JSON structure from AI. Displaying raw output:", data);
        yield { 
          type: 'code', 
          language: 'json',
          content: JSON.stringify(data, null, 2) 
        };
      }
    } catch (e) {
      // If parsing fails, it's likely a raw string.
      console.warn("Response was not valid JSON, treating as raw text. Buffer:", buffer);
      yield { type: 'paragraph', content: buffer };
    }
  }
} 
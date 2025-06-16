import OpenAI from 'openai';
import type { Customisation } from "@/data/db";
import type { ChatBlock, MessagePayload } from './google-genai'; // Reuse types for simplicity
import { formatPrompt } from '@/ai/promptFormat';

export type OpenAIModel =
  | "gpt-4o"
  | "gpt-4-turbo"
  | "gpt-3.5-turbo";

export interface OpenAIOptions {
  apiKey: string;
  model: OpenAIModel;
}

// This class is designed to be compatible with the existing GoogleGenAIProvider structure
export class OpenAIProvider {
  private openai: OpenAI;
  private model: OpenAIModel;

  constructor({ apiKey, model }: OpenAIOptions) {
    this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
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
    enableThinking?: boolean, // Note: OpenAI 'reasoning' is handled via prompting, not a specific API flag.
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
        // Even if cancelled, try to see if we have a usable partial response.
        // This might not always be valid JSON, so we wrap it in a try-catch.
        try {
            const data = JSON.parse(buffer);
            if (data.blocks && Array.isArray(data.blocks)) {
                for (const block of data.blocks) {
                    yield block;
                }
            }
        } catch (e) {
            // Partial data was not valid JSON, which is expected on cancellation.
            // We yield nothing in this case, the 'finally' block in ChatInput handles the rest.
        }
        return;
    }
    
    console.log("Raw OpenAI Response:", buffer);

    if (buffer.trim() === '') {
      console.error("Empty response from AI after processing buffer.");
      yield { type: 'paragraph', content: 'Error: The AI returned an empty response.' };
      return;
    }
    
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
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

  private async formatMessagesForApi(
    messages: MessagePayload[],
    customisation?: Customisation | null,
    forceJson: boolean = true
  ): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
    const latestMessage = messages[messages.length - 1];
    
    // For simple text generation (like titles), just use the last message.
    if (!forceJson) {
      return [{ role: "user", content: latestMessage.content }];
    }

    const history = messages.slice(0, -1);
    const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    // Add history messages, ensuring they are in string format
    history.forEach(msg => {
      // Assuming history messages are simple text
      formattedMessages.push({ role: msg.role, content: msg.content || "" });
    });
    
    // Format the latest user message
    const formattedPrompt = formatPrompt(latestMessage.content, customisation);
    
    // Handle multimodal input
    if (latestMessage.attachment) {
      // The attachment is a File object. We need to read it as a Data URL
      // to send it to the OpenAI API.
      const fileDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(latestMessage.attachment!);
      });
      
      const userMessageContent: Array<OpenAI.Chat.Completions.ChatCompletionContentPart> = [
        { type: 'text', text: formattedPrompt },
        { 
          type: 'image_url', 
          image_url: { 
            url: fileDataUrl 
          } 
        },
      ];
      formattedMessages.push({ role: 'user', content: userMessageContent });

    } else {
      // Text-only message
      formattedMessages.push({ role: 'user', content: formattedPrompt });
    }

    return formattedMessages;
  }

  async *generateTextStream(
    messages: MessagePayload[],
    customisation?: Customisation | null,
    enableThinking?: boolean, // Note: OpenAI 'reasoning' is handled via prompting, not a specific API flag.
    abortSignal?: AbortSignal,
    forceJson: boolean = true,
  ): AsyncGenerator<ChatBlock, void, unknown> {
    
    // Gracefully handle non-image attachments. The OpenAI Chat Completions API
    // used here only supports image MIME types.
    const latestMessage = messages[messages.length - 1];
    if (latestMessage.attachment && !latestMessage.attachment.type.startsWith('image/')) {
        yield { 
            type: 'paragraph', 
            content: `I'm sorry, but this model's API integration in T4-Chat currently only supports image file uploads, not files of type \`${latestMessage.attachment.type}\`. The ability to analyze documents requires a different implementation, which is on the roadmap!` 
        };
        return;
    }

    try {
      const apiMessages = await this.formatMessagesForApi(messages, customisation, forceJson);

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
    } catch (e) {
        console.error("OpenAI API Error:", e);
        // The error object from the OpenAI SDK has a specific structure.
        const error = e as (Error & { status?: number; error?: { message: string } });
        let errorMessage = "An unexpected error occurred.";

        if (error.status && error.error?.message) {
            errorMessage = `[${error.status}] ${error.error.message}`;
        } else if (error.message) {
            errorMessage = error.message;
        }

        yield {
          type: 'paragraph',
          content: `An error occurred while communicating with the OpenAI API. Please check your API key and network connection. \n\n**Details:** ${errorMessage}`
        };
        return;
    }
  }
} 
import { GoogleGenAI, Type } from "@google/genai";
import { formatPrompt } from "../promptFormat";
import type { Customisation } from "@/data/db";

export type GeminiModel =
  | "gemini-2.5-flash-preview-05-20"
  | "gemini-2.5-pro-preview-06-05"
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-preview-image-generation"
  | "gemini-2.0-flash-lite"
  | "gemini-1.5-flash"
  | "gemini-1.5-flash-8b"
  | "gemini-1.5-pro";

export interface GoogleGenAIOptions {
  apiKey: string;
  model: GeminiModel;
}

export interface MessagePayload {
  role: 'user' | 'assistant';
  content: string;
  attachment?: File;
}

// Structured block type
export interface ChatBlock {
  type: "paragraph" | "code" | "table" | "quote" | "heading" | "list" | "image" | "audio" | "video" | "document" | "thought";
  content?: string;
  language?: string;
  headers?: string[];
  rows?: string[][];
}

export class GoogleGenAIProvider {
  private ai: GoogleGenAI;
  private model: GeminiModel;

  constructor({ apiKey, model }: GoogleGenAIOptions) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  // Stricter structured output schema using oneOf
  private static getResponseSchema() {
     const blockSchema = (type: string, properties: Record<string, any>, required: string[] = []) => ({
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, enum: [type] },
        ...properties,
      },
      required: ['type', ...required],
    });

    return {
      type: Type.OBJECT,
      properties: {
        blocks: {
          type: Type.ARRAY,
          items: {
            oneOf: [
              blockSchema('paragraph', { content: { type: Type.STRING } }, ['content']),
              blockSchema('code', { content: { type: Type.STRING }, language: { type: Type.STRING } }, ['content', 'language']),
              blockSchema('table', { 
                headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
              }, ['headers', 'rows']),
              blockSchema('quote', { content: { type: Type.STRING } }, ['content']),
              blockSchema('heading', { content: { type: Type.STRING } }, ['content']),
              blockSchema('list', { content: { type: Type.STRING } }, ['content']),
            ],
          },
        },
      },
      required: ['blocks'],
    };
  }

  // DEPRECATED: use getResponseSchema instead
  private static responseSchema = {};

  private stringifyAssistantMessage(jsonContent: string): string {
    try {
        const parsed = JSON.parse(jsonContent);
        const blocks: ChatBlock[] = Array.isArray(parsed) ? parsed : parsed.blocks;
        return blocks.map(block => {
            if (block.type === 'table' && block.headers && block.rows) {
                const headers = `| ${block.headers.join(' | ')} |`;
                const separator = `| ${block.headers.map(() => '---').join(' | ')} |`;
                const rows = block.rows.map(row => `| ${row.join(' | ')} |`).join('\n');
                return `${headers}\n${separator}\n${rows}`;
            }
            return block.content ?? '';
        }).join('\n\n');
    } catch {
        return jsonContent; // Fallback to raw content
    }
  }

  // Text generation (returns blocks) - simplified for plain text for title generation
  async generateText(prompt: string): Promise<ChatBlock[]> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }] // Directly use the prompt
    });
    // Always return a single paragraph block
    return [{ type: "paragraph", content: String(response.text ?? "") }];
  }

  // Streaming text generation (yields blocks)
  async *generateTextStream(
    messages: MessagePayload[],
    customisation?: Customisation | null,
    enableThinking?: boolean,
    abortSignal?: AbortSignal
  ): AsyncGenerator<ChatBlock, void, unknown> {
    const history = messages.slice(0, -1);
    const latestMessage = messages[messages.length - 1];

    const contents = await Promise.all(history.map(async (msg) => {
      const role = msg.role === 'user' ? 'user' : 'model';
      const text = role === 'user' ? msg.content : this.stringifyAssistantMessage(msg.content);
      return { role, parts: [{ text }] };
    }));

    // Handle the latest message separately to include attachments and format the prompt
    const latestUserParts: any[] = [];
    if (latestMessage.content) {
      let formattedPrompt = formatPrompt(latestMessage.content, customisation);
      
      if (enableThinking) {
        const thinkingInstruction = "Your thought process is enabled. Your thinking should be a direct, first-person stream of consciousness focused exclusively on the user's query. Do NOT mention your internal processes, JSON structures, or how you will greet the user. Simply think through the steps you will take to construct the answer to their question. For example, if asked for code, think about the logic, the functions, and the libraries you will use.";
        formattedPrompt = `${thinkingInstruction}\n\n---\n\n${formattedPrompt}`;
      }

      latestUserParts.push({ text: formattedPrompt });
    }
    
    if (latestMessage.attachment) {
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(latestMessage.attachment!);
      });
      latestUserParts.push({ inlineData: { mimeType: latestMessage.attachment.type, data: fileData } });
    }

    contents.push({ role: 'user', parts: latestUserParts });

    const config: any = {
      responseMimeType: "application/json",
      responseSchema: GoogleGenAIProvider.getResponseSchema(),
    };

    if (enableThinking) {
      delete config.responseSchema;
      config.thinkingConfig = { includeThoughts: true };
    }

    const responseStream = await this.ai.models.generateContentStream({
      model: this.model,
      contents,
      config,
    });
    
    let buffer = "";
    if (enableThinking) {
      for await (const chunk of responseStream) {
        if (abortSignal?.aborted) {
          console.log("Stream aborted by user.");
          yield { type: 'paragraph', content: '[Cancelled by user]' };
          return;
        }
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        
        for(const part of parts) {
            if (part.thought) {
                if (part.text) {
                     yield { type: 'thought', content: part.text };
                }
            } else if (part.text) {
                buffer += part.text;
            }
        }
      }
    } else {
       for await (const chunk of responseStream) {
        if (abortSignal?.aborted) {
          console.log("Stream aborted by user.");
          yield { type: 'paragraph', content: '[Cancelled by user]' };
          return;
        }
        buffer += (typeof chunk.text === 'string' ? chunk.text : "");
      }
    }

    if (abortSignal?.aborted) return;

    console.log("Raw AI Response:", buffer);

    if (buffer.trim() === '') {
      if (enableThinking) return;
      console.error("Empty response from AI after processing buffer.");
      yield { type: 'paragraph', content: 'Error: The AI returned an empty response.' };
      return;
    }
    
    try {
      const data = JSON.parse(buffer);
      for (const block of data.blocks) {
        yield block;
      }
    } catch (e) {
      console.error("Failed to parse streamed JSON. Buffer:", buffer, "Error:", e);
      yield { type: 'paragraph', content: 'Error: The AI returned an invalid response. Please try again.' };
    }
  }

  // Image understanding
  async understandImage(imageBase64: string, prompt: string) {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: [
        { parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: imageBase64 } }] },
      ],
    });
    return response.text;
  }

  // Audio understanding
  async understandAudio(audioBase64: string, prompt: string) {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: [
        { parts: [{ text: prompt }, { inlineData: { mimeType: "audio/wav", data: audioBase64 } }] },
      ],
    });
    return response.text;
  }

  // Video understanding
  async understandVideo(videoBase64: string, prompt: string) {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: [
        { parts: [{ text: prompt }, { inlineData: { mimeType: "video/mp4", data: videoBase64 } }] },
      ],
    });
    return response.text;
  }

  // Document understanding
  async understandDocument(documentBase64: string, prompt: string) {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: [
        { parts: [{ text: prompt }, { inlineData: { mimeType: "application/pdf", data: documentBase64 } }] },
      ],
    });
    return response.text;
  }

  // "Thinking" (function calling, advanced reasoning, etc.)
  async think(prompt: string) {
    // This can be customized for advanced use cases
    return this.generateText(prompt);
  }
} 
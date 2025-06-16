import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Paperclip, ArrowUp, X, Lightbulb, Square } from "lucide-react";
import ModelSelectorPopover from "./ModelSelectorPopover";
import { useState, useEffect, useRef } from "react";
import { db, ChatMessage } from "@/data/db";
import { GoogleGenAIProvider } from "@/ai/providers/google-genai";
import { toast } from "sonner";
import { useActiveChat } from '@/contexts/ActiveChatContext';
import { nanoid } from 'nanoid';
import { useModel } from '@/contexts/ModelContext';
import type { GeminiModel, MessagePayload } from '@/ai/providers/google-genai';
import { type Model } from '@/data/models';
import { useAllModels } from '@/hooks/use-models';
import { useMediaQuery } from "usehooks-ts";
import { OpenAIProvider, OpenAIModel } from "@/ai/providers/openai";
import { OpenRouterProvider } from "@/ai/providers/openrouter";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useSync } from '@/contexts/SyncContext';

interface ChatInputProps {
  setMessageExternal?: (setter: (msg: string) => void) => void;
  textareaExternalRef?: React.RefObject<HTMLTextAreaElement | null>;
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ChatInput({ setMessageExternal, textareaExternalRef, setIsTyping }: ChatInputProps) {
  const { activeChatId, setActiveChatId } = useActiveChat();
  const { model } = useModel();
  const allModels = useAllModels();
  const { ydoc } = useSync();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [textareaRows, setTextareaRows] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [lastSentMessage, setLastSentMessage] = useState("");
  const messageIdsRef = useRef<{ user?: string; assistant?: string }>({});
  const currentModel = allModels.find((m: Model) => m.id === model);
  const [isFocused, setIsFocused] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const isMobile = useMediaQuery("(pointer: coarse)");

  useEffect(() => {
    // This check only runs on the client
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPwa(true);
    }
  }, []);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Preview for attachment
  useEffect(() => {
    if (!attachment) {
      setAttachmentPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setAttachmentPreview(e.target?.result as string);
    };
    if (attachment.type.startsWith('image/')) {
      reader.readAsDataURL(attachment);
    } else if (attachment.type.startsWith('audio/') || attachment.type.startsWith('video/')) {
      reader.readAsDataURL(attachment);
    } else if (attachment.type === 'application/pdf') {
      // No preview, just show icon
      setAttachmentPreview('pdf');
    } else {
      setAttachmentPreview(null);
    }
  }, [attachment]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Accept only image, pdf, audio, video
    if (!/^(image|audio|video)\//.test(file.type) && file.type !== 'application/pdf') {
      toast.error("Only images, PDFs, audio, and video files are supported.");
      return;
    }
    setAttachment(file);
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !attachment) {
      toast.error("Please enter a message or attach a file to send.", { style: { background: '#ef4444', color: 'white' } });
      return;
    }
    setLastSentMessage(message);
    setIsLoading(true);
    setIsTyping(true);
    abortControllerRef.current = new AbortController();

    let tempMsgId: string | undefined;
    try {
      const now = Date.now();
      let chatId = activeChatId || nanoid();
      let isNewChat = false;
      // Check if chat exists in Dexie
      let chat = await db.chats.get(chatId);
      if (!chat) {
        // New chat: create chat and conversation
        isNewChat = true;
        setActiveChatId(chatId);
        
        const newChat = { id: chatId, aiModel: model, isFork: false, createdAt: now, title: "..." };
        const newConversation = { id: nanoid(), chatId, order: now, isPinned: false };

        ydoc.getMap('chats').set(chatId, newChat);
        ydoc.getMap('conversations').set(newConversation.id, newConversation);
      }
      // --- Gather all previous messages for the *active chat* only ---
      const previousMessages = await db.messages.where('chatId').equals(chatId).sortBy('createdAt');
      const messagesForApi: MessagePayload[] = previousMessages.map((m: ChatMessage) => ({
        role: m.role,
        content: m.content ?? '',
        // Note: attachments from history are not re-sent, only the text.
      }));

      // --- Add the new user message and attachment ---
      messagesForApi.push({
        role: 'user',
        content: message,
        attachment: attachment || undefined,
      });

      // Save user message (with attachment meta if present)
      const userMessage: ChatMessage = {
        id: nanoid(),
        chatId,
        role: 'user',
        content: message,
        createdAt: now,
        model: model as GeminiModel,
        ...(attachment ? { attachment: { name: attachment.name, type: attachment.type, size: attachment.size, preview: attachmentPreview || undefined } } : {})
      };
      messageIdsRef.current.user = userMessage.id;
      
      ydoc.getMap('messages').set(userMessage.id, userMessage);

      // Get API key
      const apiKey = (await db.apikeys.get("google"))?.value || "";
      chat = await db.chats.get(chatId);
      if (!apiKey) {
        toast.error("API key not found. Please add your API key in Settings.", { style: { background: '#ef4444', color: 'white' } });
        setIsLoading(false);
        setIsTyping(false);
        return;
      }

      // --- Get customization data ---
      const customizationData = await db.customisation.get('userProfile');

      // --- DYNAMICALLY SELECT AND USE PROVIDER ---
      const modelInfo = allModels.find((m: Model) => m.id === model);
      if (!modelInfo) {
        toast.error("Selected model not found.");
        setIsLoading(false);
        setIsTyping(false);
        return;
      }

      let provider;
      const providerApiKey = (await db.apikeys.get(modelInfo.provider))?.value || "";

      if (!providerApiKey) {
        toast.error(`${modelInfo.provider.charAt(0).toUpperCase() + modelInfo.provider.slice(1)} API key not found. Please add it in Settings.`);
        setIsLoading(false);
        setIsTyping(false);
        return;
      }

      if (modelInfo.provider === 'google') {
        provider = new GoogleGenAIProvider({ apiKey: providerApiKey, model: model as GeminiModel });
      } else if (modelInfo.provider === 'openai') {
        provider = new OpenAIProvider({ apiKey: providerApiKey, model: model as OpenAIModel });
      } else if (modelInfo.provider === 'openrouter') {
        provider = new OpenRouterProvider({ apiKey: providerApiKey, model: model });
      } else {
        toast.error("Unsupported model provider.");
        setIsLoading(false);
        setIsTyping(false);
        return;
      }
      // --- END PROVIDER SELECTION ---

      // Streaming AI response
      let aiBlocks: import("@/ai/providers/google-genai").ChatBlock[] = [];
      const assistantMessage: ChatMessage = {
        id: nanoid(),
        chatId,
        role: "assistant",
        content: "[]",
        createdAt: Date.now(),
        model
      };
      messageIdsRef.current.assistant = assistantMessage.id;
      ydoc.getMap('messages').set(assistantMessage.id, assistantMessage);

      // Clear input fields now that the request is being sent.
      setMessage("");
      handleRemoveAttachment();

      const stream = provider.generateTextStream(messagesForApi, customizationData, isThinkingEnabled, abortControllerRef.current.signal);
      for await (const block of stream) {
        if (abortControllerRef.current.signal.aborted) break;
        aiBlocks.push(block);
        if (messageIdsRef.current.assistant) {
          const currentMsg = ydoc.getMap('messages').get(messageIdsRef.current.assistant);
          if (currentMsg) {
            ydoc.getMap('messages').set(messageIdsRef.current.assistant, { ...currentMsg, content: JSON.stringify(aiBlocks) });
          }
        }
      }

      // Stop typing animation as soon as the main response is done.
      setIsTyping(false);

      // If this was a new chat, and the request was not cancelled, update the title
      if (isNewChat && chatId && !abortControllerRef.current?.signal.aborted) {
        let titleProvider;
        let title = "New Chat";
        const modelInfoForTitle = allModels.find((m: Model) => m.id === model);

        // Convert the AI's response blocks to a simple string for the title prompt
        const aiResponseText = aiBlocks.map(block => block.content || '').join(' ').replace(/"/g, '').substring(0, 250);
        const lastUserMessage = lastSentMessage.replace(/"/g, '');
        const titlePrompt = `Generate a very short, concise chat title (4 words max) for this conversation. Respond with ONLY the title text, nothing else.\n\nUSER: "${lastUserMessage}"\nASSISTANT: "${aiResponseText}..."`;

        if (modelInfoForTitle?.provider === 'openai' || modelInfoForTitle?.provider === 'openrouter') {
            const apiKey = (await db.apikeys.get(modelInfoForTitle.provider))?.value || "";
            if (apiKey) {
                if (modelInfoForTitle.provider === 'openai') {
                  titleProvider = new OpenAIProvider({ apiKey, model: 'gpt-3.5-turbo' });
                } else {
                  titleProvider = new OpenRouterProvider({ apiKey, model: 'openai/gpt-3.5-turbo' });
                }
                
                const aiTitleBlocks = await (titleProvider as OpenAIProvider | OpenRouterProvider).generateTextStream(
                  [{ role: 'user', content: titlePrompt }],
                  undefined,
                  false,
                  undefined,
                  false // forceJson = false
                );
                 for await (const block of aiTitleBlocks) {
                    if (block.type === 'paragraph' && block.content) {
                        title = block.content.replace(/"/g, '').trim();
                        break; 
                    }
                }
            }
        } else {
            // Default to Google provider for title generation
            const googleApiKey = (await db.apikeys.get("google"))?.value || "";
            if (googleApiKey) {
                titleProvider = new GoogleGenAIProvider({ apiKey: googleApiKey, model: 'gemini-1.5-flash' });
                 const aiTitleBlocks = await titleProvider.generateText(titlePrompt);
                if (Array.isArray(aiTitleBlocks) && aiTitleBlocks.length > 0 && aiTitleBlocks[0].content) {
                  title = aiTitleBlocks[0].content.replace(/"/g, '').trim();
                }
            }
        }

        const chatToUpdate = ydoc.getMap('chats').get(chatId);
        if (chatToUpdate) {
            ydoc.getMap('chats').set(chatId, { ...chatToUpdate, title: title.replace(/"/g, '').trim() });
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Stream reading aborted.");
        // If we have an assistant message ID, check if it was empty and delete it.
        if (messageIdsRef.current.assistant) {
          const assistantMsg = ydoc.getMap('messages').get(messageIdsRef.current.assistant) as ChatMessage | undefined;
          if (assistantMsg) {
            try {
              const parsed = JSON.parse(assistantMsg.content);
              if (parsed.length === 0) {
                ydoc.getMap('messages').delete(assistantMsg.id);
              }
            } catch {}
          }
        }
      } else {
        console.error("Error generating response:", err);
        if (messageIdsRef.current.assistant) {
           const currentMsg = ydoc.getMap('messages').get(messageIdsRef.current.assistant);
           if (currentMsg) {
             ydoc.getMap('messages').set(messageIdsRef.current.assistant, { ...currentMsg, content: `[Error: ${err.message || "Could not get response from AI"}]` });
           }
        }
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      messageIdsRef.current = {};
    }
  };

  const handleStop = (isAbort: boolean = false) => {
    if (!isAbort && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const { user, assistant } = messageIdsRef.current;
    if (user) ydoc.getMap('messages').delete(user);
    if (assistant) ydoc.getMap('messages').delete(assistant);

    abortControllerRef.current = null;
    setIsLoading(false);
    setIsTyping(false);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any); // as any to satisfy types
    }
  };

  useEffect(() => {
    if (setMessageExternal) {
      setMessageExternal((msg: string) => setMessage(msg || ""));
    }
  }, [setMessageExternal]);

  useEffect(() => {
    if (textareaExternalRef && textareaRef.current) {
      (textareaExternalRef as any).current = textareaRef.current;
    }
  }, [textareaExternalRef, textareaRef.current]);

  return (
    <form 
      onSubmit={handleSend} 
      className={`w-full relative px-6 py-4 rounded-2xl bg-transparent flex flex-col gap-2 transition-all duration-300 ${isPwa && isMobile && !isFocused ? 'pb-10' : ''}`}
    >
      <div className="flex flex-col gap-2">
        {/* Attachment Preview */}
        {attachment && (
          <div className="relative flex items-center mb-2">
            {attachment.type.startsWith('image/') && attachmentPreview && (
              <img src={attachmentPreview} alt="preview" className="max-h-32 max-w-xs rounded-lg border mr-2" />
            )}
            {attachment.type === 'application/pdf' && (
              <div className="flex items-center bg-muted rounded-lg px-4 py-2 mr-2">
                <span className="mr-2">📄</span>
                <span className="text-sm font-mono">{attachment.name}</span>
              </div>
            )}
            {attachment.type.startsWith('audio/') && attachmentPreview && (
              <audio controls src={attachmentPreview} className="max-w-xs mr-2" />
            )}
            {attachment.type.startsWith('video/') && attachmentPreview && (
              <video controls src={attachmentPreview} className="max-h-32 max-w-xs rounded-lg border mr-2" />
            )}
            <button type="button" className="absolute -top-2 -right-2 bg-background rounded-full p-1 shadow hover:bg-muted" onClick={handleRemoveAttachment}>
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex flex-col flex-1">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Type your message here..."
              className="resize-none bg-transparent border-none outline-none text-foreground px-0 pt-2 pb-3 placeholder-muted-foreground min-h-[40px] max-h-[200px] overflow-hidden"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            <div className="flex items-end justify-between gap-2 mt-2">
              <div className="flex items-end gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* The div wrapper is necessary for the tooltip to work on a disabled button */}
                    <div tabIndex={!currentModel?.features.vision ? 0 : -1}>
                      <Button 
                        size="icon" 
                        type="button" 
                        className="text-muted-foreground border-none bg-primary/5 hover:bg-accent hover:text-accent-foreground" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!currentModel?.features.vision}
                      >
                        <Paperclip size={18} />
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!currentModel?.features.vision &&
                    <TooltipContent>
                      <p>This model does not support attachments.</p>
                    </TooltipContent>
                  }
                </Tooltip>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,video/*,audio/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={!currentModel?.features.vision}
                />
                <ModelSelectorPopover />
                {currentModel?.features.reasoning && (
                  <Button
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => setIsThinkingEnabled(prev => !prev)}
                    title={isThinkingEnabled ? "Disable Thinking" : "Enable Thinking"}
                    className={`text-muted-foreground border-none hover:text-accent-foreground ${isThinkingEnabled ? 'bg-blue-500/40 text-foreground' : 'bg-primary/5'}`}
                  >
                    <Lightbulb size={18} />
                  </Button>
                )}
              </div>
              {/* Send/Stop Button */}
              <Button
                size="icon"
                type="button"
                onClick={isLoading ? () => handleStop() : handleSend}
                className={`dark:bg-white light:bg-black light:text-white dark:text-black rounded-full shadow-lg w-12 h-12 flex items-center justify-center transition-all duration-300`}
                disabled={!isLoading && (!message.trim() && !attachment)}
                title={isLoading ? "Stop Generation" : "Send Message"}
              >
                {isLoading ? <Square size={24} fill="currentColor" /> : <ArrowUp size={66} />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
} 
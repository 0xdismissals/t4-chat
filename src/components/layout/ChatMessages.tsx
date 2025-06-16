import { Copy, RefreshCw, GitBranch, ArrowDown, BrainCircuit, ChevronDown, Volume2, Loader, Square } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/data/db";
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { useActiveChat } from '@/contexts/ActiveChatContext';
import { useRef, useEffect, useState } from 'react';
import { ChatBlock } from '@/ai/providers/google-genai';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { models } from '@/data/models';
import ChatInput from './ChatInput';
import type { ChatMessage } from '@/data/db';
import type { GeminiModel, MessagePayload } from '@/ai/providers/google-genai';
import { nanoid } from 'nanoid';
import { useMediaQuery } from 'usehooks-ts';
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
  TableHead,
} from "@/components/ui/table";
import { generateAndPlayAudio } from "@/ai/elevenlabs";
import { useSync } from "@/contexts/SyncContext";
import * as Y from 'yjs';

function CollapsibleThoughtContainer({ content, isThinking }: { content: string, isThinking: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!content) return null;

  return (
    <div className="border-b border-black/10 dark:border-white/10 px-0 py-2">
       <style>{`
        @keyframes pulse-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animated-gradient-text {
          background: linear-gradient(90deg, #9ca3af, #f9fafb, #6b7280, #f9fafb, #9ca3af);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: pulse-gradient 3s ease-in-out infinite;
        }
      `}</style>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground w-full"
      >
        <span className={isThinking ? "animated-gradient-text font-semibold" : ""}>
          {isThinking ? "Thinking..." : "Thought"}
        </span>
        <ChevronDown
          size={16}
          className={`ml-auto transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="mt-2 text-xs text-muted-foreground/90 prose dark:prose-invert max-w-none prose-p:my-1 prose-p:text-xs prose-ul:my-1 prose-li:my-0.5 prose-li:text-xs pb-2 whitespace-pre-line">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function TypingWave() {
  return (
    <div className="flex items-center gap-1 h-8 px-3">
      <span className="dot wave-dot" />
      <span className="dot wave-dot" />
      <span className="dot wave-dot" />
      <style>{`
        .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          margin: 0 2px;
          border-radius: 50%;
          background:rgb(146, 146, 146);
          opacity: 0.7;
          animation: wave 1.2s infinite;
        }
        .dot.wave-dot:nth-child(2) { animation-delay: 0.2s; }
        .dot.wave-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes wave {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.7; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function RenderBlock({ block }: { block: ChatBlock }) {
  // Structured table rendering
  if (block.type === "table" && Array.isArray(block.headers) && Array.isArray(block.rows)) {
    return (
      <Table className="my-4 border rounded-lg overflow-hidden">
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            {block.headers.map((h, i) => (
              <TableHead key={i} className="font-bold text-foreground">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {block.rows.map((row, ri) => (
            <TableRow key={ri} className="hover:bg-muted/50">
              {Array.isArray(row) ? (
                row.map((cell, ci) => (
                  <TableCell key={ci}>{cell}</TableCell>
                ))
              ) : (
                <TableCell colSpan={block.headers?.length || 1}>{String(row)}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  // Fallback for legacy markdown tables
  if (block.type === "table" && typeof block.content === "string") {
    return (
      <div className="markdown-table-wrapper">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {block.content ?? ''}
        </ReactMarkdown>
      </div>
    );
  }

  // Handle code blocks accidentally sent as paragraphs (with triple backticks)
  if (block.type === 'paragraph' && (block.content ?? '').trim().startsWith('```')) {
    // Extract language and code
    const match = (block.content ?? '').trim().match(/^```(\w*)\n?([\s\S]*)```$/);
    if (match) {
      const language = match[1] || '';
      const code = match[2] || '';
      return <CodeBlock block={{ type: 'code', content: code, language }} />;
    }
  }
  switch (block.type) {
    case 'code':
      return (
        <CodeBlock block={block} />
      );
    case 'image':
      return (
        <div className="my-4 flex flex-col items-center">
          <img src={block.content} alt="AI generated" className="rounded-lg max-w-full max-h-96 border" />
          {block.language && <span className="text-xs text-muted-foreground mt-1">{block.language}</span>}
        </div>
      );
    case 'audio':
      return (
        <div className="my-4 flex flex-col items-center">
          <audio controls src={block.content} className="w-full max-w-md" />
          <span className="text-xs text-muted-foreground mt-1">Audio</span>
        </div>
      );
    case 'video':
      return (
        <div className="my-4 flex flex-col items-center">
          <video controls src={block.content} className="w-full max-w-md rounded-lg border" />
          <span className="text-xs text-muted-foreground mt-1">Video</span>
        </div>
      );
    case 'document':
      return (
        <div className="my-4 flex flex-col items-center">
          <a href={block.content} download className="underline text-primary hover:text-primary/80">Download document</a>
          {block.language && <span className="text-xs text-muted-foreground mt-1">{block.language}</span>}
        </div>
      );
    case 'table':
      // This case is now handled by the conditions above, but we keep it
      // to avoid breaking changes if the AI provides a markdown table.
      if (typeof block.content === 'string') {
        return (
          <div className="markdown-table-wrapper">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {block.content ?? ''}
            </ReactMarkdown>
          </div>
        );
      }
      return null; // Should be rendered by the structured table block
    case 'quote':
      return <blockquote className="border-l-4 border-primary pl-4 italic my-2">{block.content ?? ''}</blockquote>;
    case 'heading':
      return <h3 className="text-xl font-bold my-2">{block.content}</h3>;
    case 'list':
      return <div className="prose dark:prose-invert"><ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content || ""}</ReactMarkdown></div>;
    case 'paragraph':
      // Robustly split on double newlines, or single newlines if no double newlines, and render each as a <p>
      const paras = (block.content ?? '').includes('\n\n')
        ? (block.content ?? '').split(/\n{2,}/)
        : (block.content ?? '').split('\n');
      return (
        <>
          {paras.map((para, idx) => (
            <p className="my-4 whitespace-pre-line" key={idx}>{para.trim()}</p>
          ))}
        </>
      );
    default:
      return <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{block.content ?? ''}</ReactMarkdown>;
  }
}

function CodeBlock({ block }: { block: ChatBlock }) {
  const [copied, setCopied] = useState(false);
  // Handle code blocks that might come in as an array of rows
  const codeContent = block.content ?? (Array.isArray(block.rows) ? block.rows.map(row => Array.isArray(row) ? row.join('') : '').join('\n') : '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeContent);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="relative my-4 group w-[345px] md:w-full lg:w-full">
      <div className="flex items-center justify-between px-3 pt-2 pb-1 bg-[#18181b] dark:bg-[#18181b] rounded-t-lg border border-zinc-200 dark:border-zinc-800">
        <span className="text-xs font-mono text-muted-foreground">{block.language || 'code'}</span>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="text-xs px-2 py-1 rounded bg-transparent text-white hover:text-primary transition-colors">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <pre className="bg-[#18181b] dark:bg-[#18181b] rounded-b-lg border border-t-0 border-zinc-200 dark:border-zinc-800 p-4 overflow-x-auto text-sm">
        <SyntaxHighlighter
          language={block.language || 'text'}
          style={atomDark}
          customStyle={{ background: 'transparent', margin: 0, padding: 0 }}
          showLineNumbers={false}
        >
          {codeContent}
        </SyntaxHighlighter>
      </pre>
    </div>
  );
}

function RenderAttachment({ attachment }: { attachment: any }) {
  if (!attachment) return null;
  if (attachment.type.startsWith('image/')) {
    return <img src={attachment.preview} alt={attachment.name} className="my-2 max-h-48 rounded-lg border" />;
  }
  if (attachment.type === 'application/pdf') {
    return (
      <div className="flex items-center gap-2 my-2 bg-muted rounded-lg px-4 py-2">
        <span>📄</span>
        <a href={attachment.preview} download={attachment.name} className="underline text-primary hover:text-primary">{attachment.name}</a>
      </div>
    );
  }
  if (attachment.type.startsWith('audio/')) {
    return <audio controls src={attachment.preview} className="my-2 w-full max-w-xs" />;
  }
  if (attachment.type.startsWith('video/')) {
    return <video controls src={attachment.preview} className="my-2 max-h-48 rounded-lg border" />;
  }
  return null;
}

async function resendUserMessageWithContext(ydoc: Y.Doc, userMsg: ChatMessage, contextMessages: ChatMessage[]) {
  // Prepare context for the AI (all previous messages up to and including userMsg)
  const chatId = userMsg.chatId;
  const chat = await db.chats.get(chatId);
  const model = (chat?.aiModel || "gemini-2.0-flash") as GeminiModel;
  const apiKey = (await db.apikeys.get("google"))?.value || "";
  if (!apiKey) {
    toast.error("API key not found. Please add your API key in Settings.", { style: { background: '#ef4444', color: 'white' } });
    return;
  }
  
  const messagesForApi: MessagePayload[] = contextMessages.map(m => ({
    role: m.role,
    content: m.content ?? '',
  }));

  // Send to Gemini
  // TODO: This should use the dynamic provider logic from ChatInput.tsx
  const { GoogleGenAIProvider } = await import('@/ai/providers/google-genai');
  const provider = new GoogleGenAIProvider({ apiKey, model });
  let aiBlocks: ChatBlock[] = [];
  let tempMsgId: string | undefined;
  const messagesMap = ydoc.getMap('messages');

  try {
    const stream = provider.generateTextStream(messagesForApi);
    for await (const block of stream) {
      aiBlocks.push(block);
      if (tempMsgId === undefined) {
        const newMsg: ChatMessage = { chatId, role: "assistant", content: JSON.stringify(aiBlocks), createdAt: Date.now(), model, id: nanoid() };
        messagesMap.set(newMsg.id, newMsg);
        tempMsgId = newMsg.id;
      } else {
        const currentMsg = messagesMap.get(tempMsgId) as ChatMessage | undefined;
        if (currentMsg) {
          messagesMap.set(tempMsgId, { ...currentMsg, content: JSON.stringify(aiBlocks) });
        }
      }
    }
  } catch (err) {
    if (tempMsgId) {
      const currentMsg = messagesMap.get(tempMsgId) as ChatMessage | undefined;
      if (currentMsg) {
        messagesMap.set(tempMsgId, { ...currentMsg, content: "[Error: Could not get response from AI]" });
      }
    }
  }
}

interface ChatMessagesProps {
  onFirstMessage?: () => void;
  viewportRef?: React.RefObject<HTMLDivElement>;
  onMessageCountChange?: (count: number) => void;
  isTyping: boolean;
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ChatMessages({ onFirstMessage, viewportRef, onMessageCountChange, isTyping, setIsTyping }: ChatMessagesProps) {
  const { activeChatId, setActiveChatId } = useActiveChat();
  const { ydoc } = useSync();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const isMobile = useMediaQuery('(pointer: coarse)');
  
  const ttsSettings = useLiveQuery(() => db.customisation.get('ttsSettings'), []);
  const isTtsEnabled = ttsSettings?.config?.enabled || false;
  const elevenLabsApiKey = useLiveQuery(() => db.apikeys.get('elevenlabs'), [])?.value;
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);
  const [audioController, setAudioController] = useState<{ stop: () => void } | null>(null);

  const messages = useLiveQuery(async () => {
    if (!activeChatId) return [];
    return db.messages.where('chatId').equals(activeChatId).sortBy('createdAt');
  }, [activeChatId], []);

  // Use viewportRef if provided, otherwise fallback to local ref
  const localRef = useRef<HTMLDivElement>(null);
  const containerRef = viewportRef || localRef;

  // Scroll-to-bottom button logic
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Scroll to bottom
  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  // Always scroll to bottom on new messages or chat change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages && messages.length, activeChatId]);

  // Show/hide scroll down button
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollDown(distanceFromBottom > 100);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [messages && messages.length, activeChatId]);

  // Find the first assistant message with a heading block to use as the title
  let aiTitle: string | null = null;
  if (messages && messages.length > 0) {
    for (const msg of messages) {
      if (msg.role === 'assistant') {
        try {
          const parsed = JSON.parse(msg.content);
          const blocks = Array.isArray(parsed) ? parsed : parsed.blocks;
          const headingBlock = blocks.find((b: ChatBlock) => b.type === 'heading');
          if (headingBlock) {
            aiTitle = headingBlock.content;
            break;
          }
        } catch {}
      }
    }
  }

  // Call onFirstMessage when the first message is rendered
  useEffect(() => {
    if (onFirstMessage && messages && messages.length > 0) {
      onFirstMessage();
    }
  }, [onFirstMessage, messages && messages.length]);

  // Deselect on click outside (mobile only)
  useEffect(() => {
    if (!isMobile) return;
    const handleClick = (e: MouseEvent) => {
      // Only deselect if clicking outside any message
      if (!(e.target as HTMLElement)?.closest('.chat-message-container')) {
        setSelectedMsgId(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isMobile]);

  useEffect(() => {
    if (onMessageCountChange) {
      onMessageCountChange(messages?.length || 0);
    }
  }, [messages && messages.length, onMessageCountChange]);

  return (
    <div ref={containerRef} className="flex flex-col gap-6 w-full max-h-full pt-14 pb-44 md:pb-46 lg:pb-48 overflow-y-auto relative" style={{height: '100%'}}>
      {messages && messages.map((msg, idx) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-xl w-fit group chat-message-container`}
            onClick={isMobile ? (e => { e.stopPropagation(); setSelectedMsgId(msg.id); }) : undefined}
            tabIndex={isMobile ? 0 : undefined}
            style={isMobile ? { cursor: 'pointer' } : {}}
          >
            <div
              className={`rounded-xl text-base ${
                msg.role === "user"
                  ? "bg-primary/10 text-primary px-4 py-3"
                  : "bg-muted text-primary"
              }`}
            >
              {(() => {
                if (msg.role === 'user') {
                  return (
                    <>
                      <RenderAttachment attachment={msg.attachment} />
                      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{msg.content}</ReactMarkdown>
                    </>
                  );
                }

                // For assistant, parse blocks once and use everywhere
                let blocks: ChatBlock[];
                try {
                  const parsed = JSON.parse(msg.content);
                  blocks = Array.isArray(parsed) ? parsed : parsed.blocks;
                } catch {
                  blocks = [{ type: 'paragraph', content: msg.content }];
                }

                const thoughtBlocks = blocks.filter(b => b.type === 'thought');
                const contentBlocks = blocks.filter(b => b.type !== 'thought');
                const fullThoughtContent = thoughtBlocks.map(b => b.content).join('\n\n');
                const isLastMessage = idx === (messages?.length ?? 0) - 1;
                const isCurrentlyTyping = isTyping && isLastMessage;

                return (
                  <>
                    <CollapsibleThoughtContainer content={fullThoughtContent} isThinking={isCurrentlyTyping} />
                    <div className="p-0">
                      {contentBlocks.map((block, i) => (
                        <RenderBlock key={i} block={block} />
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
            {/* Actions + Model Name */}
            <div
              className={
                `flex items-center gap-2 mt-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ` +
                (
                  isMobile
                    ? (selectedMsgId === msg.id ? ' opacity-100' : ' opacity-0 pointer-events-none')
                    : ' md:opacity-0 md:group-hover:opacity-100 transition-opacity'
                )
              }
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Copy message"
                    onClick={() => {
                      let textToCopy = msg.content;
                      if (msg.role === 'assistant') {
                        try {
                          const parsed = JSON.parse(msg.content);
                          const blocks = Array.isArray(parsed) ? parsed : parsed.blocks;
                          textToCopy = blocks.map((b: any) => {
                            if (b.type === 'code') {
                              const codeContent = b.content ?? (Array.isArray(b.rows) ? b.rows.map((row: string[]) => row.join('')).join('\n') : '');
                              return `\n\n\`\`\`${b.language ? b.language + '\n' : ''}${codeContent}\n\`\`\`\n\n`;
                            }
                            return b.content ?? '';
                          }).join('\n\n');
                        } catch {
                          textToCopy = msg.content;
                        }
                      }
                      navigator.clipboard.writeText(textToCopy);
                      toast.success('Copied to clipboard!');
                    }}
                  >
                    <Copy size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Copy message</TooltipContent>
              </Tooltip>

              {msg.role === 'assistant' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Retry message"
                      onClick={async () => {
                        if (msg.role !== 'assistant' || isRetrying) return;
                        setIsRetrying(true);
                        setIsTyping(true);
                        // Find the index of this assistant message
                        const idx = messages.findIndex(m => m.id === msg.id);
                        // Find the previous user message before this assistant message
                        let userIdx = -1;
                        for (let i = idx - 1; i >= 0; i--) {
                          if (messages[i].role === 'user') {
                            userIdx = i;
                            break;
                          }
                        }
                        if (userIdx === -1) {
                          setIsRetrying(false);
                          setIsTyping(false);
                          toast.error('Could not find the user message to retry.');
                          return;
                        }
                        const userMsg = messages[userIdx];
                        
                        const messagesMap = ydoc.getMap('messages');
                        const toDelete = messages.slice(userIdx + 1).map(m => m.id);
                        toDelete.forEach(id => messagesMap.delete(id));

                        // Resend the user message by calling a helper to send with context
                        await resendUserMessageWithContext(ydoc, userMsg, messages.slice(0, userIdx + 1));
                        setIsTyping(false);
                        setIsRetrying(false);
                      }}
                    >
                      <RefreshCw size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Retry message</TooltipContent>
                </Tooltip>
              )}

              {msg.role === 'assistant' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Branch off"
                      onClick={async () => {
                        if (!messages || !messages.length) return;
                        // Find the index of the message to fork from
                        const idx = messages.findIndex(m => m.id === msg.id);
                        if (idx === -1) return;
                        // Copy all messages up to and including this one
                        const forkedMessages = messages.slice(0, idx + 1);
                        // Create new chat and conversation
                        const newChatId = nanoid();
                        const now = Date.now();
                        // Get the original chat title
                        let originalTitle = 'Forked Chat';
                        try {
                          if (typeof activeChatId === 'string') {
                            const origChat = await db.chats.get(activeChatId);
                            if (origChat && origChat.title) originalTitle = `Forked: ${origChat.title}`;
                          }
                        } catch {}
                        // Use the model of the forked message's chat, or fallback
                        const model = msg.model || 'gemini-2.0-flash';
                        
                        const chatsMap = ydoc.getMap('chats');
                        const messagesMap_fork = ydoc.getMap('messages');
                        const conversationsMap = ydoc.getMap('conversations');
                        
                        const newConversationId = nanoid();
                        chatsMap.set(newChatId, { id: newChatId, aiModel: model, isFork: true, createdAt: now, title: originalTitle });
                        conversationsMap.set(newConversationId, { id: newConversationId, chatId: newChatId, order: now, isPinned: false });
                        
                        // Copy messages
                        for (const m of forkedMessages) {
                          const newId = nanoid();
                          messagesMap_fork.set(newId, { ...m, id: newId, chatId: newChatId });
                        }
                        
                        setActiveChatId(newChatId);
                        toast.success('Forked chat created!');
                      }}
                    >
                      <GitBranch size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Branch off</TooltipContent>
                </Tooltip>
              )}
              {msg.role === 'assistant' && isTtsEnabled && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Play Audio"
                      onClick={async () => {
                        if (loadingMessageId === msg.id) return;

                        if (playingMessageId === msg.id) {
                          audioController?.stop();
                          return;
                        }

                        if (audioController) {
                          audioController.stop();
                        }
                        
                        if (!elevenLabsApiKey) {
                          toast.error("ElevenLabs API key not found. Please add it in Settings.");
                          return;
                        }
                        
                        let blocks: ChatBlock[];
                        try {
                          const parsed = JSON.parse(msg.content);
                          blocks = Array.isArray(parsed) ? parsed : parsed.blocks;
                        } catch {
                          blocks = [{ type: 'paragraph', content: msg.content }];
                        }
                        const textToSpeak = blocks.filter(b => b.type !== 'thought').map(b => b.content).join(' ');

                        if (!textToSpeak.trim()) return;

                        setLoadingMessageId(msg.id);
                        setPlayingMessageId(null);

                        try {
                          const controller = await generateAndPlayAudio(
                            elevenLabsApiKey,
                            textToSpeak,
                            ttsSettings?.config?.voiceId || "21m00Tcm4TlvDq8ikWAM",
                            () => {
                              setPlayingMessageId(null);
                              setAudioController(null);
                            }
                          );
                          setLoadingMessageId(null);
                          if (controller) {
                            setPlayingMessageId(msg.id);
                            setAudioController(controller);
                          }
                        } catch (e) {
                          toast.error("Failed to play audio. Check the console for details.");
                          setLoadingMessageId(null);
                        }
                      }}
                    >
                      {loadingMessageId === msg.id ? (
                        <Loader size={16} className="animate-spin" />
                      ) : playingMessageId === msg.id ? (
                        <Square size={16} className="fill-current" />
                      ) : (
                        <Volume2 size={16} />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {playingMessageId === msg.id ? "Stop Audio" : "Play Audio"}
                  </TooltipContent>
                </Tooltip>
              )}
              {/* Model Name */}
              {msg.role === 'assistant' && msg.model && (
                <span className="ml-2 text-primary text-xs select-none" style={{letterSpacing: 0.1}}>
                  {models.find(m => m.id === msg.model)?.name || msg.model}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
      {/* TypingWave as a message bubble, left-aligned */}
      {(() => {
        if (!isTyping) return null;

        const lastMessage = messages?.[messages?.length - 1];
        if (lastMessage?.role === 'assistant') {
          try {
            const blocks = JSON.parse(lastMessage.content);
            const hasThoughts = blocks.some((b: any) => b.type === 'thought');
            if (hasThoughts) return null; // Don't show typing wave if there are thoughts
          } catch {
            // content is not yet valid JSON, show typing wave
          }
        }
        
        return (
          <div className="flex justify-start">
            <div className="max-w-xl w-fit bg-muted rounded-xl px-1">
              <TypingWave />
            </div>
          </div>
        );
      })()}
      {showScrollDown && (
        <button
          className="fixed bottom-28 right-8 z-50 bg-background border shadow-lg rounded-full p-2 flex items-center justify-center hover:bg-accent transition-colors"
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={28} className="text-primary" />
        </button>
      )}
      {/* At the bottom, if retryMessage is set, render ChatInput with the message prefilled and auto-send */}
      {retryMessage && (
        <ChatInput
          setIsTyping={() => {}}
          setMessageExternal={fn => {
            fn(retryMessage);
            setTimeout(() => {
              // Simulate pressing send
              const textarea = document.querySelector('textarea');
              if (textarea) {
                const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
                textarea.dispatchEvent(event);
              }
              setRetryMessage(null);
            }, 100);
          }}
        />
      )}
    </div>
  );
} 
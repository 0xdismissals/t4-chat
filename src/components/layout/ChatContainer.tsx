import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import { ScrollArea } from "../ui/scroll-area";
import { useActiveChat } from '@/contexts/ActiveChatContext';
import { useRef, useState, useEffect } from 'react';
import { useFullScreen } from "@/contexts/FullScreenContext";
import { Expand, Minimize } from "lucide-react";
import { useMediaQuery } from "usehooks-ts";
import { motion } from "framer-motion";

export default function ChatContainer() {
  // Just to trigger re-render on chat change
  const { activeChatId } = useActiveChat();
  const setMessageFnRef = useRef<(msg: string) => void>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [quickTopicsVisible, setQuickTopicsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<'Create' | 'Explore' | 'Code' | 'Learn'>('Create');
  const viewportRef = useRef<HTMLDivElement>(null);
  const [messageCount, setMessageCount] = useState(0);
  const { isFullScreen, toggleFullScreen } = useFullScreen();
  const [isTyping, setIsTyping] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  // Multi-topic quick messages
  const quickTopics: Record<string, string[]> = {
    Create: [
      "Write a poem about the ocean",
      "Generate a story about a robot and a cat",
      "Suggest a new app idea",
      "Invent a new holiday"
    ],
    Explore: [
      "Are black holes real?",
      "What is the most mysterious place on Earth?",
      "How does AI work?",
      "What is the meaning of life?"
    ],
    Code: [
      "Show me a Python function for Fibonacci",
      "How do I center a div in CSS?",
      "Write a SQL query to get all users",
      "Create a game of tic tac toe in HTML"
    ],
    Learn: [
      "What is quantum computing?",
      "Explain relativity in simple terms",
      "How do vaccines work?",
      "What is the Turing test?"
    ]
  };
  const tabList = Object.keys(quickTopics) as Array<'Create' | 'Explore' | 'Code' | 'Learn'>;
  // Hide quick topics when a message is sent/typed
  const handleQuickTopic = (topic: string) => {
    setMessageFnRef.current?.(topic || "");
    setQuickTopicsVisible(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };
  // Scroll to bottom on new message
  useEffect(() => {
    const el = viewportRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messageCount]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleScroll = () => {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 1;
      setIsScrolled(!isAtBottom);
    };

    el.addEventListener('scroll', handleScroll);
    // Run on mount to check initial state
    handleScroll(); 

    return () => el.removeEventListener('scroll', handleScroll);
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  return (
    <section key={activeChatId} className={`relative flex flex-col h-full min-h-0 w-full bg-muted rounded-2xl ${isFullScreen ? 'm-0 md:rounded-none lg:rounded-none' : 'mb-6'}`}>
      <button
        onClick={toggleFullScreen}
        className="absolute top-4 right-4 z-50 p-1.5 rounded-full bg-background/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
      >
        {isFullScreen ? <Minimize size={14} /> : <Expand size={14} />}
      </button>
      <ScrollArea className="flex-1 h-0 px-4 md:px-6 lg:px-6 pt-0 md:pt-0 lg:pt-0" viewportRef={viewportRef}>
        {quickTopicsVisible && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col gap-2 p-2 pb-0 pt-10 md:pt-10 lg:pt-10"
          >
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {tabList.map(tab => (
                <button
                  key={tab}
                  className={`px-4 py-2 text-sm rounded-lg text-background border transition-colors ${activeTab === tab ? 'bg-primary text-background border-primary' : 'bg-background text-muted-foreground border-transparent hover:bg-primary dark:hover:bg-primary/10'}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Quick messages for active tab */}
            <div className="flex flex-col divide-y divide-primary/10 dark:divide-primary/10">
              {quickTopics[activeTab].map((topic, i) => (
                <button
                  key={i}
                  className="text-left text-sm py-4 px-2 hover:bg-primary dark:hover:bg-primary/10 transition-colors"
                  onClick={() => handleQuickTopic(topic)}
                >
                  {topic}
                </button>
              ))}
            </div>
          </motion.div>
        )}
        <ChatMessages 
          onFirstMessage={() => setQuickTopicsVisible(false)} 
          onMessageCountChange={setMessageCount} 
          isTyping={isTyping} 
          setIsTyping={setIsTyping}
        />
      </ScrollArea>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className={`absolute bottom-0 left-0 right-0 md:p-6`}
      >
        <div className={`transition-colors duration-100 rounded-t-4xl md:rounded-2xl border border-background/10 ${!isMobile && isScrolled ? 'bg-background/90 backdrop-blur-xl' : 'bg-background/70 backdrop-blur-sm'}`}>
            <ChatInput 
                setMessageExternal={fn => { setMessageFnRef.current = fn; }} 
                textareaExternalRef={textareaRef}
                setIsTyping={setIsTyping}
            />
        </div>
      </motion.div>
    </section>
  );
} 
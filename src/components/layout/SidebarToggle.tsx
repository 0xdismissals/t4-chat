'use client';
import { Button } from "../ui/button";
import { PanelLeft, PlusSquare } from "lucide-react";
import { useSidebar } from "../ui/sidebar";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { db } from "@/data/db";
import { useActiveChat } from "@/contexts/ActiveChatContext";

export default function SidebarToggle() {
  const { toggleSidebar } = useSidebar();
  const router = useRouter();
  const { setActiveChatId } = useActiveChat();

  const handleNewChat = () => {
    // Only reset the local chat state, do not save to DB
    const chatId = nanoid();
    setActiveChatId(chatId);
  };

  return (
    <div className="fixed z-50 top-4 left-4 flex gap-2">
      <Button
        size="icon"
        variant="ghost"
        className="p-0 text-muted-foreground hover:text-foreground hover:bg-transparent focus-visible:bg-transparent"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <PanelLeft size={36} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="p-0 text-primary hover:text-primary hover:bg-transparent focus-visible:bg-transparent"
        aria-label="New conversation"
        onClick={handleNewChat}
      >
        <PlusSquare size={36} />
      </Button>
    </div>
  );
} 
'use client';
import { useEffect } from "react";
import { SidebarProvider } from "../components/ui/sidebar";
import TopBar from "../components/layout/TopBar";
import Sidebar from "../components/layout/Sidebar";
import ChatContainer from "../components/layout/ChatContainer";
import SidebarToggle from "../components/layout/SidebarToggle";
import SettingsThemeToggle from "../components/layout/SettingsThemeToggle";
import { useActiveChat } from '@/contexts/ActiveChatContext';
import { nanoid } from 'nanoid';
import { FullScreenProvider, useFullScreen } from "@/contexts/FullScreenContext";

function AppLayout() {
  const { isFullScreen } = useFullScreen();
  const { activeChatId, setActiveChatId } = useActiveChat();

  // On first load, set a new chatId if none exists
  useEffect(() => {
    if (!activeChatId) {
      setActiveChatId(nanoid());
    }
  }, [activeChatId, setActiveChatId]);

  return (
    <>
      {!isFullScreen && <SidebarToggle />}
      {!isFullScreen && <SettingsThemeToggle />}
      <div className="flex flex-col h-[100dvh] w-full bg-background">
        {!isFullScreen && <TopBar />}
        <div className="flex flex-1 min-h-0">
          {!isFullScreen && <Sidebar />}
          <div className={`flex-1 h-full bg-background transition-all duration-300 ${!isFullScreen ? 'md:px-4 md:py-4 lg:px-4 lg:py-4 sm:px-0 sm:py-0' : 'p-0'}`}>
            <ChatContainer />
          </div>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <FullScreenProvider>
      <SidebarProvider>
        <AppLayout />
      </SidebarProvider>
    </FullScreenProvider>
  );
}

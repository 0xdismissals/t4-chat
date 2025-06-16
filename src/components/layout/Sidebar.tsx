'use client';
import React, { useRef, useState } from "react";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  useSidebar,
} from "../ui/sidebar";
import { Search, Pin, X, Trash2, Plus } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../ui/dialog";
import { db, type ChatMessage } from "@/data/db";
import { useLiveQuery } from "dexie-react-hooks";
import { nanoid } from "nanoid";
import { useActiveChat } from '@/contexts/ActiveChatContext';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, subMonths, isSameMonth, isSameYear } from 'date-fns';
import { Pin as PinIcon } from "lucide-react";
import { GitBranch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSync } from "@/contexts/SyncContext";

// Wiggle keyframes (add to a style tag below)
const wiggleKeyframes = `
@keyframes wiggle {
  0% { transform: scale(1.08) rotate(-2deg); }
  20% { transform: scale(1.08) rotate(2deg); }
  40% { transform: scale(1.08) rotate(-2deg); }
  60% { transform: scale(1.08) rotate(2deg); }
  80% { transform: scale(1.08) rotate(-2deg); }
  100% { transform: scale(1.08) rotate(0deg); }
}
`;

const MotionSidebar = motion(ShadcnSidebar);

export default function Sidebar() {
  const { toggleSidebar, state } = useSidebar();
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const { activeChatId, setActiveChatId } = useActiveChat();
  const [searchQuery, setSearchQuery] = useState('');
  const { ydoc } = useSync();

  // Only enable on mobile
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

  // Fetch conversations from Dexie, ordered by pinned and order
  const conversations = useLiveQuery(async () => {
    return db.conversations.orderBy('order').toArray();
  }, [], []);

  // Fetch chat titles for display
  const chats = useLiveQuery(async () => {
    if (!conversations) return {};
    const chatIds = conversations.map(c => c.chatId);
    const chatList = await db.chats.bulkGet(chatIds);
    const map: Record<string, string> = {};
    chatList.forEach((chat, i) => {
      if (chat) map[chat.id] = chat.title || 'Untitled Chat';
    });
    return map;
  }, [conversations], {} as Record<string, string>);

  // Filter conversations to only those with a valid chat
  const validConversations = conversations && chats
    ? conversations.filter(c => chats[c.chatId])
    : [];

  // Separate pinned and unpinned conversations
  const pinnedConversations = validConversations.filter(c => c.isPinned);
  const unpinnedConversations = validConversations.filter(c => !c.isPinned);

  // Fetch chat metadata for grouping (use all conversations, not just unpinned)
  const allConversations = [...(pinnedConversations || []), ...(unpinnedConversations || [])];
  const chatMetas = useLiveQuery(async () => {
    if (!allConversations) return {};
    const chatIds = allConversations.map(c => c.chatId);
    const chatList = await db.chats.bulkGet(chatIds);
    const map: Record<string, any> = {};
    chatList.forEach((chat, i) => {
      if (chat) map[chat.id] = chat;
    });
    return map;
  }, [allConversations], {} as Record<string, any>);

  // Group unpinned conversations by date
  function groupConversations() {
    if (!unpinnedConversations || !chatMetas) return {};
    // Sort by createdAt descending
    const sorted = [...unpinnedConversations].sort((a, b) => {
      const aDate = chatMetas[a.chatId]?.createdAt || 0;
      const bDate = chatMetas[b.chatId]?.createdAt || 0;
      return bDate - aDate;
    });
    const groups: Record<string, typeof sorted> = {};
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    sorted.forEach(conv => {
      const meta = chatMetas[conv.chatId];
      if (!meta) return;
      const created = new Date(meta.createdAt);
      let label = '';
      if (isToday(created)) label = 'Today';
      else if (isYesterday(created)) label = 'Yesterday';
      else if (isThisWeek(created, { weekStartsOn: 1 })) label = 'This Week';
      else if (isThisMonth(created)) label = 'This Month';
      else if (isSameMonth(created, lastMonth) && isSameYear(created, lastMonth)) label = 'Last Month';
      else label = format(created, 'MMM d, yyyy');
      if (!groups[label]) groups[label] = [];
      groups[label].push(conv);
    });
    // Order groups
    const order = ['Today', 'Yesterday', 'This Week', 'This Month', 'Last Month'];
    const orderedGroups: [string, typeof sorted][] = [];
    order.forEach(label => { if (groups[label]) orderedGroups.push([label, groups[label]]); });
    Object.keys(groups).forEach(label => {
      if (!order.includes(label)) orderedGroups.push([label, groups[label]]);
    });
    return orderedGroups;
  }
  const groupedConvs: [string, typeof unpinnedConversations][] = groupConversations() as [string, typeof unpinnedConversations][];

  // Pin/unpin handler
  const handleTogglePin = (convId: string, isPinned: boolean) => {
    const conversationsMap = ydoc.getMap('conversations');
    const conversation = conversationsMap.get(convId);
    if (conversation) {
      conversationsMap.set(convId, { ...conversation, isPinned: !isPinned });
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeleteDialogId(id);
  };
  const closeDeleteDialog = () => setDeleteDialogId(null);

  // New Chat handler
  const handleNewChat = () => {
    const chatId = nanoid();
    setActiveChatId(chatId);
  };

  // Add the delete handler:
  const handleDeleteConversation = (conv: { id: string; chatId: string }) => {
    const messagesMap = ydoc.getMap('messages');
    const chatsMap = ydoc.getMap('chats');
    const conversationsMap = ydoc.getMap('conversations');

    // Delete messages for the chat
    Array.from(messagesMap.values()).forEach((msg: any) => {
      if (msg.chatId === conv.chatId) {
        messagesMap.delete(msg.id);
      }
    });
    
    // Delete chat and conversation
    chatsMap.delete(conv.chatId);
    conversationsMap.delete(conv.id);

    setDeleteDialogId(null);
  };

  const filteredConversations = validConversations.filter(conv => 
    (chats[conv.chatId] || 'Untitled Chat').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayConversations = searchQuery ? filteredConversations : validConversations;

  const content = (
    <div className="mt-0 md:mt-14 lg:mt-14 mb-2 p-4 pb-0">
      <div className="relative">
        <Input
          placeholder="Search"
          className="pl-8 bg-muted text-foreground border-none focus:ring-0 focus:border-none focus:ring-0"
          autoFocus={false}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search className="absolute left-2 top-2.5 text-muted-foreground" size={16} />
      </div>
      {/* Mobile only: New Chat button */}
      {isMobile && (
        <button
          className="w-full flex flex-row items-center justify-center gap-2 mt-4 mb-2 py-2 rounded-lg bg-primary text-background font-semibold text-base active:bg-primary transition-colors"
          onClick={handleNewChat}
        >
          <Plus size={22} />
          <span className="text-xs font-medium">New Chat</span>
        </button>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      {state === "expanded" && (
        <>
          <style>{wiggleKeyframes}</style>
          {isMobile && deleteDialogId !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20"
              onClick={closeDeleteDialog}
              onTouchStart={closeDeleteDialog}
            />
          )}
          <MotionSidebar
            key="sidebar"
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '-100%' }}
            transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
            className="bg-background border-none"
          >
            <SidebarContent className="bg-background border-none">
              {content}
              {/* Conversations */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                className="flex-1 overflow-y-auto p-4 pt-2"
              >
                {/* Pinned group */}
                {pinnedConversations.length > 0 && !searchQuery && (
                  <div className="mb-4">
                    <div className="text-xs text-muted-foreground mb-2 pl-2">Pinned</div>
                    <div className="flex flex-col gap-1">
                      {pinnedConversations.map((conv) => {
                        const isActive = activeChatId === conv.chatId;
                        return (
                          <div
                            key={conv.id}
                            className={`flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer group/item select-none ${isActive ? 'bg-muted' : 'hover:bg-muted'}`}
                            aria-selected={isActive}
                            data-active={isActive}
                            onClick={() => setActiveChatId(conv.chatId)}
                          >
                            <span className="flex items-center gap-1 max-w-[160px] truncate text-foreground text-sm">
                              {(() => { try { return (chatMetas[conv.chatId]?.isFork) ? <GitBranch size={14} className="text-primary shrink-0" /> : null; } catch { return null; } })()}
                              <span className="truncate">{chats[conv.chatId] || 'Untitled Chat'}</span>
                            </span>
                            <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-1'} transition-opacity ${(isActive) ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}>
                              <button
                                className={conv.isPinned ? "text-primary hover:text-primary" : "text-muted-foreground hover:text-primary"}
                                title={conv.isPinned ? "Unpin" : "Pin"}
                                onClick={e => { e.stopPropagation(); handleTogglePin(conv.id, conv.isPinned); }}
                              >
                                <PinIcon size={16} fill={conv.isPinned ? "currentColor" : "none"} />
                              </button>
                              <Dialog open={deleteDialogId === conv.id} onOpenChange={(open) => !open && closeDeleteDialog()}>
                                <DialogTrigger asChild>
                                  <button
                                    className={isMobile ? "text-destructive hover:text-red-700" : "text-muted-foreground hover:text-destructive"}
                                    title="Delete"
                                    onClick={e => { e.stopPropagation(); openDeleteDialog(conv.id); }}
                                  >
                                    <X size={16} />
                                  </button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete Conversation</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to delete this conversation? This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button variant="destructive" onClick={() => handleDeleteConversation(conv)}>
                                      Delete
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Unpinned groups */}
                {groupedConvs && !searchQuery && groupedConvs.map(([label, group]: [string, typeof unpinnedConversations]) => (
                  <div key={label} className="mb-4">
                    <div className="text-xs text-muted-foreground mb-2 pl-2">{label}</div>
                    <div className="flex flex-col gap-1">
                      {group.map((conv: typeof unpinnedConversations[number]) => {
                        const isActive = activeChatId === conv.chatId;
                        return (
                          <div
                            key={conv.id}
                            className={`flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer group/item select-none ${isActive ? 'bg-muted' : 'hover:bg-muted'}`}
                            aria-selected={isActive}
                            data-active={isActive}
                            onClick={() => setActiveChatId(conv.chatId)}
                          >
                            <span className="flex items-center gap-1 max-w-[160px] truncate text-foreground text-sm">
                              {(() => { try { return (chatMetas[conv.chatId]?.isFork) ? <GitBranch size={14} className="text-primary shrink-0" /> : null; } catch { return null; } })()}
                              <span className="truncate">{chats[conv.chatId] || 'Untitled Chat'}</span>
                            </span>
                            <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-1'} transition-opacity ${(isActive) ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}>
                              <button
                                className={conv.isPinned ? "text-primary hover:text-primary" : "text-muted-foreground hover:text-primary"}
                                title={conv.isPinned ? "Unpin" : "Pin"}
                                onClick={e => { e.stopPropagation(); handleTogglePin(conv.id, conv.isPinned); }}
                              >
                                <PinIcon size={16} fill={conv.isPinned ? "currentColor" : "none"} />
                              </button>
                              <Dialog open={deleteDialogId === conv.id} onOpenChange={(open) => !open && closeDeleteDialog()}>
                                <DialogTrigger asChild>
                                  <button
                                    className={isMobile ? "text-destructive hover:text-red-700" : "text-muted-foreground hover:text-destructive"}
                                    title="Delete"
                                    onClick={e => { e.stopPropagation(); openDeleteDialog(conv.id); }}
                                  >
                                    <X size={16} />
                                  </button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete Conversation</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to delete this conversation? This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button variant="destructive" onClick={() => handleDeleteConversation(conv)}>
                                      Delete
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {/* Search results */}
                {searchQuery && (
                  <div className="mb-4">
                    <div className="text-xs text-muted-foreground mb-2 pl-2">Search Results</div>
                    <div className="flex flex-col gap-1">
                      {filteredConversations.map((conv) => {
                        const isActive = activeChatId === conv.chatId;
                        return (
                          <div
                            key={conv.id}
                            className={`flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer group/item select-none ${isActive ? 'bg-muted' : 'hover:bg-muted'}`}
                            aria-selected={isActive}
                            data-active={isActive}
                            onClick={() => setActiveChatId(conv.chatId)}
                          >
                            <span className="flex items-center gap-1 max-w-[160px] truncate text-foreground text-sm">
                              {(() => { try { return (chatMetas[conv.chatId]?.isFork) ? <GitBranch size={14} className="text-primary shrink-0" /> : null; } catch { return null; } })()}
                              <span className="truncate">{chats[conv.chatId] || 'Untitled Chat'}</span>
                            </span>
                            <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-1'} transition-opacity ${(isActive) ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}>
                              <button
                                className={conv.isPinned ? "text-primary hover:text-primary" : "text-muted-foreground hover:text-primary"}
                                title={conv.isPinned ? "Unpin" : "Pin"}
                                onClick={e => { e.stopPropagation(); handleTogglePin(conv.id, conv.isPinned); }}
                              >
                                <PinIcon size={16} fill={conv.isPinned ? "currentColor" : "none"} />
                              </button>
                              <Dialog open={deleteDialogId === conv.id} onOpenChange={(open) => !open && closeDeleteDialog()}>
                                <DialogTrigger asChild>
                                  <button
                                    className={isMobile ? "text-destructive hover:text-red-700" : "text-muted-foreground hover:text-destructive"}
                                    title="Delete"
                                    onClick={e => { e.stopPropagation(); openDeleteDialog(conv.id); }}
                                  >
                                    <X size={16} />
                                  </button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete Conversation</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to delete this conversation? This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button variant="destructive" onClick={() => handleDeleteConversation(conv)}>
                                      Delete
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            </SidebarContent>
          </MotionSidebar>
        </>
      )}
    </AnimatePresence>
  );
} 
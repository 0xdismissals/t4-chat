'use client';

import React, { createContext, useContext, useState } from 'react';

interface ActiveChatContextType {
  activeChatId: string | null;
  setActiveChatId: (id: string) => void;
}

const ActiveChatContext = createContext<ActiveChatContextType | undefined>(undefined);

export const ActiveChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  return (
    <ActiveChatContext.Provider value={{ activeChatId, setActiveChatId }}>
      {children}
    </ActiveChatContext.Provider>
  );
};

export const useActiveChat = () => {
  const context = useContext(ActiveChatContext);
  if (context === undefined) {
    throw new Error('useActiveChat must be used within an ActiveChatProvider');
  }
  return context;
}; 
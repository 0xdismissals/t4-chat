"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FullScreenContextType {
  isFullScreen: boolean;
  toggleFullScreen: () => void;
}

const FullScreenContext = createContext<FullScreenContextType | undefined>(undefined);

export function FullScreenProvider({ children }: { children: ReactNode }) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    setIsFullScreen(prev => !prev);
  };

  return (
    <FullScreenContext.Provider value={{ isFullScreen, toggleFullScreen }}>
      {children}
    </FullScreenContext.Provider>
  );
}

export function useFullScreen() {
  const context = useContext(FullScreenContext);
  if (context === undefined) {
    throw new Error('useFullScreen must be used within a FullScreenProvider');
  }
  return context;
} 
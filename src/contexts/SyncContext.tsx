"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';
import { nanoid } from 'nanoid';
import { db, Chat, ChatMessage, ApiKey, Customisation, Conversation } from '@/data/db';
import { Model } from '@/data/models';
import { toast } from 'sonner';

const SYNC_LOCAL_STORAGE_KEY = 't4-chat-pairing-code';
const ydoc = new Y.Doc();

// Define the structure of our application's state document
export interface AppDoc {
  chats: Y.Map<Chat>;
  messages: Y.Map<ChatMessage>;
  models: Y.Map<Model>;
  customisation: Y.Map<Customisation>;
  conversations: Y.Map<Conversation>;
}

type SyncContextType = {
  ydoc: Y.Doc;
  provider: WebrtcProvider | null;
  isConnected: boolean;
  pairingCode: string | null;
  peers: Map<number, { name: string; isSelf: boolean }>;
  isRestoring: boolean;
  startPairing: () => void;
  startNewSession: () => void;
  connectToPairingCode: (code: string) => void;
  disconnect: () => void;
};

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<WebrtcProvider | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [peers, setPeers] = useState<Map<number, { name: string; isSelf: boolean }>>(new Map());
  const wasConnected = useRef(false);

  // Persistence and initial data hydration
  useEffect(() => {
    const persistence = new IndexeddbPersistence('t4-chat-doc', ydoc);
    persistence.on('synced', async () => {
      console.log('content from the database is loaded');
      if (ydoc.getMap('chats').size === 0) {
        // This is likely the first time, let's hydrate from Dexie
        console.log("Hydrating Yjs doc from existing Dexie tables");
        const [chats, messages, customModels, customisation, conversations] = await Promise.all([
            db.chats.toArray(),
            db.messages.toArray(),
            db.customModels.toArray(),
            db.customisation.toArray(),
            db.conversations.toArray(),
        ]);
        
        ydoc.transact(() => {
            const yChats = ydoc.getMap('chats');
            chats.forEach(c => yChats.set(c.id, c));
            const yMessages = ydoc.getMap('messages');
            messages.forEach(m => yMessages.set(m.id, m));
            const yModels = ydoc.getMap('models');
            customModels.forEach(m => yModels.set(m.id, m));
            const yCustomisation = ydoc.getMap('customisation');
            customisation.forEach(c => yCustomisation.set(c.id, c));
            const yConversations = ydoc.getMap('conversations');
            conversations.forEach(c => yConversations.set(c.id, c));
        });
        toast.info("Created a syncable document from local data.");
      }
    });

    return () => {
      persistence.destroy();
    };
  }, []);

  // Project Yjs updates back to Dexie for useLiveQuery
  useEffect(() => {
    const observer = () => {
      db.transaction('rw', [db.chats, db.messages, db.customModels, db.customisation, db.conversations], async () => {
          await db.chats.clear();
          await db.chats.bulkAdd(Array.from(ydoc.getMap('chats').values()) as Chat[]);
          await db.messages.clear();
          await db.messages.bulkAdd(Array.from(ydoc.getMap('messages').values()) as ChatMessage[]);
          await db.customModels.clear();
          await db.customModels.bulkAdd(Array.from(ydoc.getMap('models').values()) as Model[]);
          await db.customisation.clear();
          await db.customisation.bulkAdd(Array.from(ydoc.getMap('customisation').values()) as Customisation[]);
          await db.conversations.clear();
          await db.conversations.bulkAdd(Array.from(ydoc.getMap('conversations').values()) as Conversation[]);
      });
    };
    ydoc.on('update', observer);
    return () => ydoc.off('update', observer);
  }, []);

  // Master provider lifecycle effect
  useEffect(() => {
    if (!pairingCode) {
      if (provider) provider.destroy();
      setProvider(null);
      return;
    };

    const signalingServer = process.env.NEXT_PUBLIC_SIGNALING_URL || `ws://${window.location.hostname}:4444`;
    console.log(`SyncContext: Creating new WebRTC provider for room ${pairingCode}`);
    const newProvider = new WebrtcProvider(pairingCode, ydoc, { signaling: [signalingServer] });
    
    newProvider.awareness.setLocalStateField('user', { name: `Device-${nanoid(4)}` });

    const onAwarenessChange = () => {
      const currentPeers = new Map();
      newProvider.awareness.getStates().forEach((state, clientID) => {
        if (state.user) {
          currentPeers.set(clientID, {
            name: state.user.name,
            isSelf: clientID === newProvider.awareness.clientID
          });
        }
      });
      setPeers(currentPeers);

      const currentlyConnected = newProvider.awareness.getStates().size > 1;
      if (currentlyConnected) {
        if (!wasConnected.current) {
          toast.success("Device connected!");
        }
        setIsRestoring(false);
      } else if (!currentlyConnected && wasConnected.current) {
        toast.error("Device disconnected.");
      }
      setIsConnected(currentlyConnected);
      wasConnected.current = currentlyConnected;
    };

    const onStatusChange = ({ connected }: { connected: boolean }) => {
      if (!connected && wasConnected.current) {
        toast.error("Device disconnected.");
        setIsConnected(false);
        wasConnected.current = false;
      }
    };

    newProvider.awareness.on('change', onAwarenessChange);
    newProvider.on('status', onStatusChange);
    setProvider(newProvider);

    onAwarenessChange(); // Initial check

    return () => {
      console.log(`SyncContext: Effect cleanup. Destroying provider for room ${newProvider.roomName}`);
      newProvider.awareness.off('change', onAwarenessChange);
      newProvider.off('status', onStatusChange);
      newProvider.destroy();
    };
  }, [pairingCode]);

  // Auto-reconnect on load
  useEffect(() => {
    const savedCode = localStorage.getItem(SYNC_LOCAL_STORAGE_KEY);
    if (savedCode) {
      console.log("SyncProvider: Found saved pairing code, setting it to restore session.");
      setPairingCode(savedCode);
      const timer = setTimeout(() => {
          console.log("SyncProvider: Restore timeout reached.");
          setIsRestoring(false);
      }, 5000); // 5-second timeout
      return () => clearTimeout(timer);
    } else {
      setIsRestoring(false);
    }
  }, []);


  const startPairing = useCallback(() => {
    const newPairingCode = nanoid(8);
    localStorage.setItem(SYNC_LOCAL_STORAGE_KEY, newPairingCode);
    setPairingCode(newPairingCode);
  }, []);

  const connectToPairingCode = useCallback((code: string) => {
    localStorage.setItem(SYNC_LOCAL_STORAGE_KEY, code);
    setPairingCode(code);
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(SYNC_LOCAL_STORAGE_KEY);
    setPairingCode(null);
    setIsConnected(false);
    setIsRestoring(false);
    setPeers(new Map());
    wasConnected.current = false;
    toast.info("You have been disconnected from the sync session.");
  }, []);

  const startNewSession = useCallback(() => {
    disconnect();
    setTimeout(startPairing, 100);
  }, [disconnect, startPairing]);

  const value = {
    ydoc,
    provider,
    isConnected,
    pairingCode,
    peers,
    isRestoring,
    startPairing,
    startNewSession,
    connectToPairingCode,
    disconnect,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
} 
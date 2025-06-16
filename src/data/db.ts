import Dexie, { Table } from 'dexie';
import { Model } from './models';

export interface Chat {
  id: string;
  aiModel: string;
  isFork: boolean;
  createdAt: number;
  title?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  attachment?: {
    name: string;
    type: string;
    size: number;
    preview?: string;
  };
  model?: string;
}

export interface Conversation {
  id: string;
  chatId: string;
  order: number;
  isPinned: boolean;
}

export interface ThemeSetting {
  id: string; // always 'theme'
  value: 'light' | 'dark' | 'system';
}

export interface Customisation {
  id: string; // e.g. 'userProfile', 'ttsSettings'
  name?: string;
  occupation?: string;
  traits?: string[];
  about?: string;
  config?: {
    enabled?: boolean;
    voiceId?: string;
  }
}

export interface ApiKey {
  id: string; // e.g. 'google', 'openai', etc.
  value: string;
}

export class AppDB extends Dexie {
  chats!: Table<Chat, string>;
  messages!: Table<ChatMessage, string>;
  conversations!: Table<Conversation, string>;
  theme!: Table<ThemeSetting, string>;
  customisation!: Table<Customisation, string>;
  apikeys!: Table<ApiKey, string>;
  customModels!: Table<Model, string>;
  crdt_docs!: Table<{ id: string; doc: Uint8Array }>;

  constructor() {
    super('t4chatdb');
    this.version(4).stores({
      chats: 'id, createdAt',
      messages: 'id, chatId, createdAt',
      conversations: 'id, order, isPinned',
      theme: 'id',
      customisation: 'id',
      apikeys: '&id',
      customModels: '&id, name, provider',
      crdt_docs: 'id',
    });
  }
}

export const db = new AppDB(); 
import { db, type Chat, type ChatMessage, type ApiKey, type Customisation } from './db';
export type { Chat, ChatMessage, ApiKey, Customisation };

export type ModelFeatures = {
  vision: boolean; // includes video, audio and image upload
  image_gen: boolean;
  audio_gen: boolean;
  video_gen: boolean;
  web_search: boolean;
  pdf: boolean;
  fast: boolean;
  reasoning: boolean;
};

export type Model = {
  id: string;
  name: string;
  provider: string;
  providerLogo: string; // filename, e.g. 'openai.svg'
  features: ModelFeatures;
};

export const models: Model[] = [
  {
    id: 'gemini-2.5-flash-preview-05-20',
    name: 'Gemini 2.5 Flash Preview 05-20',
    provider: 'google',
    providerLogo: 'gemini.png',
    features: {
      vision: true,
      image_gen: false,
      audio_gen: false,
      video_gen: false,
      web_search: true,
      pdf: true,
      fast: true,
      reasoning: false,
    },
  },
  {
    id: 'gemini-2.5-pro-preview-06-05',
    name: 'Gemini 2.5 Pro Preview',
    provider: 'google',
    providerLogo: 'gemini.png',
    features: {
      vision: true,
      image_gen: false,
      audio_gen: false,
      video_gen: false,
      web_search: true,
      pdf: true,
      fast: false,
      reasoning: true,
    },
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    providerLogo: 'gemini.png',
    features: {
      vision: true,
      image_gen: false,
      audio_gen: false,
      video_gen: false,
      web_search: true,
      pdf: true,
      fast: true,
      reasoning: true,
    },
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash-Lite',
    provider: 'google',
    providerLogo: 'gemini.png',
    features: {
      vision: true,
      image_gen: false,
      audio_gen: false,
      video_gen: false,
      web_search: true,
      pdf: true,
      fast: true,
      reasoning: false,
    },
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    providerLogo: 'gemini.png',
    features: {
      vision: true,
      image_gen: false,
      audio_gen: false,
      video_gen: false,
      web_search: true,
      pdf: true,
      fast: true,
      reasoning: false,
    },
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash-8B',
    provider: 'google',
    providerLogo: 'gemini.png',
    features: {
      vision: true,
      image_gen: false,
      audio_gen: false,
      video_gen: false,
      web_search: true,
      pdf: true,
      fast: true,
      reasoning: false,
    },
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    providerLogo: 'gemini.png',
    features: {
      vision: true,
      image_gen: false,
      audio_gen: false,
      video_gen: false,
      web_search: true,
      pdf: true,
      fast: false,
      reasoning: true,
    },
  },
  // OpenAI Models
  {
    id: 'gpt-4o-2024-08-06',
    name: 'GPT-4o',
    provider: 'openai',
    providerLogo: 'openai.svg',
    features: { vision: true, image_gen: false, audio_gen: false, video_gen: false, web_search: true, pdf: true, fast: true, reasoning: true },
  },
  {
    id: 'gpt-4.1-2025-04-14',
    name: 'GPT-4.1',
    provider: 'openai',
    providerLogo: 'openai.svg',
    features: { vision: true, image_gen: false, audio_gen: false, video_gen: false, web_search: true, pdf: true, fast: false, reasoning: true },
  },
  {
    id: 'o4-mini-2025-04-16',
    name: 'o4-Mini',
    provider: 'openai',
    providerLogo: 'openai.svg',
    features: { vision: true, image_gen: false, audio_gen: false, video_gen: false, web_search: true, pdf: true, fast: true, reasoning: false },
  },
  {
    id: 'o3-pro-2025-06-10',
    name: 'o3-Pro',
    provider: 'openai',
    providerLogo: 'openai.svg',
    features: { vision: false, image_gen: false, audio_gen: false, video_gen: false, web_search: true, pdf: true, fast: false, reasoning: true },
  },
  {
    id: 'o3-2025-04-16',
    name: 'o3',
    provider: 'openai',
    providerLogo: 'openai.svg',
    features: { vision: false, image_gen: false, audio_gen: false, video_gen: false, web_search: false, pdf: false, fast: true, reasoning: false },
  },
  {
    id: 'o3-mini-2025-01-31',
    name: 'o3-Mini',
    provider: 'openai',
    providerLogo: 'openai.svg',
    features: { vision: false, image_gen: false, audio_gen: false, video_gen: false, web_search: false, pdf: false, fast: true, reasoning: false },
  },
  {
    id: 'o1-pro-2025-03-19',
    name: 'o1-Pro',
    provider: 'openai',
    providerLogo: 'openai.svg',
    features: { vision: false, image_gen: false, audio_gen: false, video_gen: false, web_search: true, pdf: true, fast: false, reasoning: true },
  },
  {
    id: 'o1-2024-12-17',
    name: 'o1',
    provider: 'openai',
    providerLogo: 'openai.svg',
    features: { vision: false, image_gen: false, audio_gen: false, video_gen: false, web_search: false, pdf: true, fast: true, reasoning: false },
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    providerLogo: 'openai.svg',
    features: { vision: true, image_gen: false, audio_gen: false, video_gen: false, web_search: true, pdf: true, fast: false, reasoning: false },
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    providerLogo: 'openai.svg',
    features: { vision: false, image_gen: false, audio_gen: false, video_gen: false, web_search: false, pdf: false, fast: true, reasoning: false },
  },
  // OpenRouter Models
  {
    id: 'deepseek/deepseek-r1-distill-qwen-7b',
    name: 'Deepseek R1 Distill Qwen 7B',
    provider: 'openrouter',
    providerLogo: 'openrouterai.png',
    features: { vision: false, image_gen: false, audio_gen: false, video_gen: false, web_search: false, pdf: false, fast: true, reasoning: false },
  },
  {
    id: 'deepseek/deepseek-r1-0528-qwen3-8b',
    name: 'Deepseek R1 0528 Qwen3 8B',
    provider: 'openrouter',
    providerLogo: 'openrouterai.png',
    features: { vision: false, image_gen: false, audio_gen: false, video_gen: false, web_search: false, pdf: false, fast: true, reasoning: true },
  },
  {
    id: 'deepseek/deepseek-r1-0528',
    name: 'Deepseek R1 0528',
    provider: 'openrouter',
    providerLogo: 'openrouterai.png',
    features: { vision: false, image_gen: false, audio_gen: false, video_gen: false, web_search: false, pdf: false, fast: false, reasoning: true },
  },
  {
    id: 'meta-llama/llama-4-maverick',
    name: 'Llama 4 Maverick',
    provider: 'openrouter',
    providerLogo: 'openrouterai.png',
    features: { vision: true, image_gen: false, audio_gen: false, video_gen: false, web_search: false, pdf: true, fast: false, reasoning: true },
  },
  {
    id: 'meta-llama/llama-4-scout',
    name: 'Llama 4 Scout',
    provider: 'openrouter',
    providerLogo: 'openrouterai.png',
    features: { vision: true, image_gen: false, audio_gen: false, video_gen: false, web_search: false, pdf: true, fast: true, reasoning: true },
  },
]; 
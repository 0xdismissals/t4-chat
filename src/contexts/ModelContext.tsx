"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAllModels } from '@/hooks/use-models';

interface ModelContextType {
  model: string;
  setModel: (id: string) => void;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function useModel() {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
}

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const allModels = useAllModels();
  const [model, setModel] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem('selectedModel') || '';
    }
    return '';
  });

  useEffect(() => {
    if (allModels.length > 0) {
      const savedModelId = localStorage.getItem('selectedModel');
      const modelExists = allModels.some(m => m.id === savedModelId);

      if (savedModelId && modelExists) {
        if (model !== savedModelId) {
          setModel(savedModelId);
        }
      } else {
        // If saved model doesn't exist or there's no saved model, default to the first one
        const defaultModelId = allModels[0].id;
        setModel(defaultModelId);
        localStorage.setItem('selectedModel', defaultModelId);
      }
    }
  }, [allModels]);

  useEffect(() => {
    if (model) {
      localStorage.setItem('selectedModel', model);
    }
  }, [model]);

  const value = { model, setModel };

  // Render provider only when a valid model is set to avoid initial state issues
  return (
    <ModelContext.Provider value={value}>
      {model ? children : null}
    </ModelContext.Provider>
  );
} 
'use client';
import React from "react";
import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Drawer, DrawerTrigger, DrawerContent } from "../ui/drawer";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { ChevronDown } from "lucide-react";
import { Model } from "@/data/models";
import { useAllModels } from "@/hooks/use-models";
import { useModel } from '@/contexts/ModelContext';
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Command, CommandItem, CommandGroup, CommandList } from "@/components/ui/command";

const providerDisplayNames: { [key: string]: string } = {
  google: "Google",
  openai: "OpenAI",
  openrouter: "OpenRouter",
};

export default function ModelSelectorPopover() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  const { model: selectedModelId, setModel: setSelectedModelId } = useModel();
  const allModels = useAllModels();

  const handleSelect = (model: Model) => {
    setSelectedModelId(model.id);
    setOpen(false);
  };

  const selectedModelInfo = allModels.find((m) => m.id === selectedModelId);

  const groupedModels = allModels
    .reduce((acc, model) => {
      const providerKey = model.provider || "Other";
      const providerName = providerDisplayNames[providerKey] || providerKey.charAt(0).toUpperCase() + providerKey.slice(1);
      if (!acc[providerName]) {
        acc[providerName] = [];
      }
      acc[providerName].push(model);
      return acc;
    }, {} as Record<string, Model[]>);
    
  const groupedAndFilteredModels = Object.entries(groupedModels)
      .map(([providerName, modelsList]) => ({
        providerName,
        modelsList: modelsList.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())),
      }))
      .filter(group => group.modelsList.length > 0);

  const content = (
    <Command className="max-w-[100vw] p-2">
      <Input
        placeholder="Search models..."
        className="mb-3 bg-background border-input text-foreground"
        autoFocus={false}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <ScrollArea className="h-[300px]">
        <CommandList>
          {groupedAndFilteredModels.map(({ providerName, modelsList }) => (
            <CommandGroup key={providerName} heading={providerName}>
              {modelsList.map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.name}
                  onSelect={() => handleSelect(model)}
                  className={cn("flex justify-between items-center", { "bg-accent": selectedModelId === model.id, "hover:bg-accent": selectedModelId !== model.id })}
                >
                  <div className="flex items-center">
                    <img src={`/icons/${model.providerLogo}`} alt={model.provider} className="w-5 h-5 rounded mr-1" />
                    <span className="text-foreground text-sm font-medium">{model.name}</span>
                  </div>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedModelId === model.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </ScrollArea>
    </Command>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="ghost" className="h-8 px-3 text-xs text-foreground hover:bg-accent">
            {selectedModelInfo?.name || selectedModelId} <ChevronDown size={10} className="ml-1" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="bg-background border-input">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant='ghost' className="text-xs text-muted-foreground">
          {selectedModelInfo?.name || selectedModelId} <ChevronDown size={16} className="ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="bg-background p-0">
        {content}
      </PopoverContent>
    </Popover>
  );
} 
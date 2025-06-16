import { Settings } from "lucide-react";

export default function ChatHeader({ title = "Existence of blackhole" }: { title?: string }) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
      <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
      {/* Placeholder for future actions */}
      <button className="text-muted-foreground hover:text-foreground p-2 rounded-md transition-colors">
        <Settings size={20} />
      </button>
    </header>
  );
} 
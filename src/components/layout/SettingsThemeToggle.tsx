'use client';
import { Button } from "../ui/button";
import { Settings, Sun, Moon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function SettingsThemeToggle() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // After the component mounts, we can safely show the client-side UI
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="fixed z-50 top-4 right-4 flex gap-2">
      <Button
        size="icon"
        variant="ghost"
        className="p-0 text-muted-foreground hover:text-foreground hover:bg-transparent focus-visible:bg-transparent"
        onClick={() => router.push('/settings')}
        aria-label="Toggle settings"
      >
        <Settings size={36} />
      </Button>
      
      {/* 
        This is the key part of the fix.
        We render a placeholder button on the server and on the initial client render.
        After mounting, `mounted` becomes true, and we render the actual themed button.
        This guarantees the server and initial client HTML are identical.
      */}
      {!mounted && (
         <Button
            size="icon"
            variant="ghost"
            disabled
            className="p-0 text-muted-foreground hover:text-foreground hover:bg-transparent focus-visible:bg-transparent"
          >
            <Sun size={36} />
        </Button>
      )}

      {mounted && (
        <Button
          size="icon"
          variant="ghost"
          className="p-0 text-muted-foreground hover:text-foreground hover:bg-transparent focus-visible:bg-transparent"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={36} /> : <Moon size={36} />}
        </Button>
      )}
    </div>
  );
} 
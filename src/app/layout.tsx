import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ActiveChatProvider } from '@/contexts/ActiveChatContext';
import { ModelProvider } from '@/contexts/ModelContext';
import { ThemeColorUpdater } from "@/components/ThemeColorUpdater";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SyncProvider } from "@/contexts/SyncContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "T4-Chat",
  description: "Your own hosted AI Chatbot",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#09090b" media="(prefers-color-scheme: dark)" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <ActiveChatProvider>
              <ModelProvider>
                <SyncProvider>
                  <ThemeColorUpdater />
                  {children}
                </SyncProvider>
              </ModelProvider>
            </ActiveChatProvider>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

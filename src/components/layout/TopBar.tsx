'use client';
import { Button } from "../ui/button";

export default function TopBar() {
  return (
    <div className="w-full h-14 bg-background flex items-center px-4 py-2 justify-between">
      {/* Left: Empty for alignment */}
      <div className="flex items-center" />
      {/* Right: Empty for alignment */}
      <div className="flex items-center gap-2" />
    </div>
  );
} 
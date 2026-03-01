"use client";

import { useRef } from "react";
import { FolderOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImageContext } from "@/contexts/ImageContext";
import { useEditContext } from "@/contexts/EditContext";

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fileName, loadImage } = useImageContext();
  const { resetAll } = useEditContext();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImage(file);
    }
    e.target.value = "";
  };

  return (
    <header className="h-12 flex items-center justify-between px-4 bg-card border-b border-border shrink-0">
      <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
        {fileName || "NionColor"}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <FolderOpen className="size-4" />
          <span className="text-xs">Open</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={resetAll}>
          <RotateCcw className="size-4" />
          <span className="text-xs">Reset</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </header>
  );
}

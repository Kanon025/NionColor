"use client";

import { useRef } from "react";
import { FolderOpen, RotateCcw, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImageContext } from "@/contexts/ImageContext";
import { useEditContext } from "@/contexts/EditContext";
import { useChatContext } from "@/contexts/ChatContext";
import { ChatToggle } from "@/components/editor/ChatPanel";
import { HistogramToggle, type HistogramMode } from "@/components/editor/Histogram";

// File input accept string: standard images + common RAW extensions
const FILE_ACCEPT =
  "image/jpeg,image/png,.arw,.srf,.sr2,.cr2,.cr3,.crw,.nef,.nrw,.raf,.dng,.orf,.pef,.rw2,.rwl,.srw,.3fr,.fff,.iiq,.x3f,.erf,.mef,.mos,.dcr,.kdc,.mrw,.gpr";

interface ToolbarProps {
  onToggleChat: () => void;
  isChatOpen: boolean;
  histogramMode: HistogramMode;
  onCycleHistogram: () => void;
}

export function Toolbar({ onToggleChat, isChatOpen, histogramMode, onCycleHistogram }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fileName, loadImage, loading, isRaw, imageBitmap } = useImageContext();
  const { resetAll } = useEditContext();
  const { sendMessage, isLoading: chatLoading } = useChatContext();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImage(file);
    }
    e.target.value = "";
  };

  return (
    <header className="h-12 flex items-center justify-between px-4 bg-card border-b border-border shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
          {fileName || "NionColor"}
        </span>
        {loading && <Loader2 className="size-3.5 text-muted-foreground animate-spin" />}
        {isRaw && !loading && (
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            RAW
          </span>
        )}
      </div>
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
        <HistogramToggle mode={histogramMode} onClick={onCycleHistogram} />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => sendMessage("Mejorar automáticamente esta foto")}
          disabled={!imageBitmap || chatLoading}
          title="Auto-mejora con IA"
        >
          {chatLoading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
          <span className="text-xs">Auto</span>
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <ChatToggle onClick={onToggleChat} isOpen={isChatOpen} />
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_ACCEPT}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";
import { EditProvider } from "@/contexts/EditContext";
import { ImageProvider } from "@/contexts/ImageContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { Toolbar } from "@/components/editor/Toolbar";
import { SliderPanel } from "@/components/editor/SliderPanel";
import { Viewport } from "@/components/editor/Viewport";
import { ChatPanel } from "@/components/editor/ChatPanel";

export default function EditorPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <EditProvider>
      <ImageProvider>
        <ChatProvider>
          <div className="flex flex-col h-dvh w-dvw">
            <Toolbar
              onToggleChat={() => setIsChatOpen((v) => !v)}
              isChatOpen={isChatOpen}
            />
            <div className="flex flex-1 overflow-hidden">
              <Viewport />
              <SliderPanel />
            </div>
            <ChatPanel
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        </ChatProvider>
      </ImageProvider>
    </EditProvider>
  );
}

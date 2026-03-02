"use client";

import { useState, useCallback } from "react";
import { EditProvider } from "@/contexts/EditContext";
import { ImageProvider } from "@/contexts/ImageContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { Toolbar } from "@/components/editor/Toolbar";
import { SliderPanel } from "@/components/editor/SliderPanel";
import { Viewport } from "@/components/editor/Viewport";
import { ChatPanel } from "@/components/editor/ChatPanel";
import type { HistogramMode } from "@/components/editor/Histogram";

const HISTOGRAM_CYCLE: HistogramMode[] = ["off", "luma", "rgb"];

export default function EditorPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [histogramMode, setHistogramMode] = useState<HistogramMode>("off");

  const cycleHistogram = useCallback(() => {
    setHistogramMode((prev) => {
      const idx = HISTOGRAM_CYCLE.indexOf(prev);
      return HISTOGRAM_CYCLE[(idx + 1) % HISTOGRAM_CYCLE.length];
    });
  }, []);

  return (
    <EditProvider>
      <ImageProvider>
        <ChatProvider>
          <div className="flex flex-col h-dvh w-dvw">
            <Toolbar
              onToggleChat={() => setIsChatOpen((v) => !v)}
              isChatOpen={isChatOpen}
              histogramMode={histogramMode}
              onCycleHistogram={cycleHistogram}
            />
            <div className="flex flex-1 overflow-hidden relative">
              <Viewport
                histogramMode={histogramMode}
                onCycleHistogram={cycleHistogram}
              />
              <SliderPanel />
              <ChatPanel
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
          </div>
        </ChatProvider>
      </ImageProvider>
    </EditProvider>
  );
}

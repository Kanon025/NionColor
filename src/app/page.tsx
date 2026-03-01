"use client";

import { EditProvider } from "@/contexts/EditContext";
import { ImageProvider } from "@/contexts/ImageContext";
import { Toolbar } from "@/components/editor/Toolbar";
import { SliderPanel } from "@/components/editor/SliderPanel";
import { Viewport } from "@/components/editor/Viewport";

export default function EditorPage() {
  return (
    <EditProvider>
      <ImageProvider>
        <div className="flex flex-col h-dvh w-dvw">
          <Toolbar />
          <div className="flex flex-1 overflow-hidden">
            <Viewport />
            <SliderPanel />
          </div>
        </div>
      </ImageProvider>
    </EditProvider>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SliderControl } from "@/components/editor/SliderControl";
import { useEditContext } from "@/contexts/EditContext";

interface SectionConfig {
  key: string;
  label: string;
  params: {
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
  }[];
}

const sections: SectionConfig[] = [
  {
    key: "whiteBalance",
    label: "White Balance",
    params: [
      { key: "temperature", label: "Temperature", min: -100, max: 100, step: 1, defaultValue: 0 },
      { key: "tint", label: "Tint", min: -100, max: 100, step: 1, defaultValue: 0 },
    ],
  },
  {
    key: "tone",
    label: "Tone",
    params: [
      { key: "exposure", label: "Exposure", min: -5, max: 5, step: 0.01, defaultValue: 0 },
      { key: "contrast", label: "Contrast", min: -100, max: 100, step: 1, defaultValue: 0 },
    ],
  },
  {
    key: "presence",
    label: "Presence",
    params: [
      { key: "vibrance", label: "Vibrance", min: -100, max: 100, step: 1, defaultValue: 0 },
      { key: "saturation", label: "Saturation", min: -100, max: 100, step: 1, defaultValue: 0 },
    ],
  },
];

function CollapsibleSection({
  config,
  sectionValues,
  onUpdate,
}: {
  config: SectionConfig;
  sectionValues: Record<string, number>;
  onUpdate: (section: string, key: string, value: number) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-border">
      <button
        className="flex items-center gap-1 w-full px-3 py-2 text-xs font-medium text-foreground hover:bg-accent/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
        {config.label}
      </button>
      {open && (
        <div className="pb-2">
          {config.params.map((p) => (
            <SliderControl
              key={p.key}
              label={p.label}
              value={sectionValues[p.key] ?? p.defaultValue}
              min={p.min}
              max={p.max}
              step={p.step}
              defaultValue={p.defaultValue}
              onChange={(v) => onUpdate(config.key, p.key, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SliderPanel() {
  const { params, updateParameter, resetAll } = useEditContext();

  return (
    <aside className="w-72 h-full flex flex-col bg-card border-l border-border overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {sections.map((section) => (
          <CollapsibleSection
            key={section.key}
            config={section}
            sectionValues={
              params[section.key as keyof typeof params] as unknown as Record<
                string,
                number
              >
            }
            onUpdate={updateParameter}
          />
        ))}
      </div>
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={resetAll}
        >
          Reset All
        </Button>
      </div>
    </aside>
  );
}

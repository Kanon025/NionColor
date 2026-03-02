"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SliderControl } from "@/components/editor/SliderControl";
import { useEditContext } from "@/contexts/EditContext";

interface ParamConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

interface SectionConfig {
  key: string;
  label: string;
  params: ParamConfig[];
}

interface NestedSectionConfig {
  key: string;
  label: string;
  subsections: {
    key: string;
    label: string;
    params: ParamConfig[];
  }[];
}

// ─── Flat sections (simple key → value) ───

const flatSections: SectionConfig[] = [
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
      { key: "highlights", label: "Highlights", min: -100, max: 100, step: 1, defaultValue: 0 },
      { key: "shadows", label: "Shadows", min: -100, max: 100, step: 1, defaultValue: 0 },
      { key: "whites", label: "Whites", min: -100, max: 100, step: 1, defaultValue: 0 },
      { key: "blacks", label: "Blacks", min: -100, max: 100, step: 1, defaultValue: 0 },
    ],
  },
  {
    key: "presence",
    label: "Presence",
    params: [
      { key: "clarity", label: "Clarity", min: -100, max: 100, step: 1, defaultValue: 0 },
      { key: "vibrance", label: "Vibrance", min: -100, max: 100, step: 1, defaultValue: 0 },
      { key: "saturation", label: "Saturation", min: -100, max: 100, step: 1, defaultValue: 0 },
    ],
  },
  {
    key: "detail",
    label: "Detail",
    params: [
      { key: "sharpening", label: "Sharpening", min: 0, max: 150, step: 1, defaultValue: 0 },
      { key: "grain", label: "Grain", min: 0, max: 100, step: 1, defaultValue: 0 },
      { key: "grainSize", label: "Grain Size", min: 0, max: 100, step: 1, defaultValue: 50 },
    ],
  },
  {
    key: "effects",
    label: "Effects",
    params: [
      { key: "vignette", label: "Vignette", min: -100, max: 100, step: 1, defaultValue: 0 },
      { key: "vignetteFeather", label: "Vignette Feather", min: 0, max: 100, step: 1, defaultValue: 50 },
    ],
  },
];

// ─── HSL section (nested: color → h/s/l) ───

const HSL_COLORS = [
  { key: "red", label: "Red" },
  { key: "orange", label: "Orange" },
  { key: "yellow", label: "Yellow" },
  { key: "green", label: "Green" },
  { key: "aqua", label: "Aqua" },
  { key: "blue", label: "Blue" },
  { key: "purple", label: "Purple" },
  { key: "magenta", label: "Magenta" },
] as const;

const HSL_PARAMS: ParamConfig[] = [
  { key: "hue", label: "Hue", min: -180, max: 180, step: 1, defaultValue: 0 },
  { key: "saturation", label: "Saturation", min: -100, max: 100, step: 1, defaultValue: 0 },
  { key: "luminance", label: "Luminance", min: -100, max: 100, step: 1, defaultValue: 0 },
];

// ─── Color Grading section (nested: zone → h/s/l) ───

const CG_ZONES = [
  { key: "shadows", label: "Shadows" },
  { key: "midtones", label: "Midtones" },
  { key: "highlights", label: "Highlights" },
] as const;

const CG_PARAMS: ParamConfig[] = [
  { key: "hue", label: "Hue", min: 0, max: 360, step: 1, defaultValue: 0 },
  { key: "saturation", label: "Saturation", min: 0, max: 100, step: 1, defaultValue: 0 },
  { key: "luminance", label: "Luminance", min: -100, max: 100, step: 1, defaultValue: 0 },
];

// ─── Collapsible section component ───

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
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
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

// ─── Nested section with subsections (HSL, Color Grading) ───

function NestedSection({
  sectionKey,
  label,
  subsections,
  sectionValues,
  onUpdate,
}: {
  sectionKey: string;
  label: string;
  subsections: { key: string; label: string; params: ParamConfig[] }[];
  sectionValues: Record<string, Record<string, number>>;
  onUpdate: (section: string, key: string, value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeSubIdx, setActiveSubIdx] = useState(0);

  const activeSub = subsections[activeSubIdx];

  return (
    <div className="border-b border-border">
      <button
        className="flex items-center gap-1 w-full px-3 py-2 text-xs font-medium text-foreground hover:bg-accent/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {label}
      </button>
      {open && (
        <div className="pb-2">
          {/* Subsection tabs */}
          <div className="flex flex-wrap gap-0.5 px-2 pb-1.5">
            {subsections.map((sub, idx) => (
              <button
                key={sub.key}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  idx === activeSubIdx
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
                onClick={() => setActiveSubIdx(idx)}
              >
                {sub.label}
              </button>
            ))}
          </div>
          {/* Active subsection sliders */}
          {activeSub.params.map((p) => (
            <SliderControl
              key={`${activeSub.key}-${p.key}`}
              label={p.label}
              value={sectionValues[activeSub.key]?.[p.key] ?? p.defaultValue}
              min={p.min}
              max={p.max}
              step={p.step}
              defaultValue={p.defaultValue}
              onChange={(v) => onUpdate(sectionKey, `${activeSub.key}.${p.key}`, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───

export function SliderPanel() {
  const { params, updateParameter, resetAll } = useEditContext();

  return (
    <aside className="w-72 h-full flex flex-col bg-card border-l border-border overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {/* Flat sections: White Balance, Tone, Presence */}
        {flatSections.slice(0, 3).map((section) => (
          <CollapsibleSection
            key={section.key}
            config={section}
            sectionValues={
              params[section.key as keyof typeof params] as unknown as Record<string, number>
            }
            onUpdate={updateParameter}
          />
        ))}

        {/* HSL Section */}
        <NestedSection
          sectionKey="hsl"
          label="HSL / Color"
          subsections={HSL_COLORS.map((c) => ({
            key: c.key,
            label: c.label,
            params: HSL_PARAMS,
          }))}
          sectionValues={params.hsl as unknown as Record<string, Record<string, number>>}
          onUpdate={updateParameter}
        />

        {/* Color Grading Section */}
        <NestedSection
          sectionKey="colorGrading"
          label="Color Grading"
          subsections={CG_ZONES.map((z) => ({
            key: z.key,
            label: z.label,
            params: CG_PARAMS,
          }))}
          sectionValues={params.colorGrading as unknown as Record<string, Record<string, number>>}
          onUpdate={updateParameter}
        />

        {/* Detail & Effects sections */}
        {flatSections.slice(3).map((section) => (
          <CollapsibleSection
            key={section.key}
            config={section}
            sectionValues={
              params[section.key as keyof typeof params] as unknown as Record<string, number>
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

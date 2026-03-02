"use client";

import { useRef, useEffect, useCallback } from "react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HistogramData } from "@/lib/webgl/histogram";

// ---------- Types ----------

export type HistogramMode = "off" | "luma" | "rgb";

// ---------- Histogram Display Component ----------

interface HistogramProps {
  data: HistogramData | null;
  mode: HistogramMode;
  onCycleMode: () => void;
}

const HIST_WIDTH = 220;
const HIST_HEIGHT = 80;

/**
 * Renders the histogram overlay on a small 2D canvas.
 * Positioned absolutely in the top-left of the viewport.
 * Click to cycle: luma -> rgb -> luma -> ...
 */
export function Histogram({ data, mode, onCycleMode }: HistogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = HIST_WIDTH;
    const h = HIST_HEIGHT;

    // Clear
    ctx.clearRect(0, 0, w, h);

    if (mode === "luma") {
      drawChannel(ctx, data.luminance, w, h, "rgba(220,220,220,0.85)");
    } else if (mode === "rgb") {
      // Use additive blending for overlapping channels
      ctx.globalCompositeOperation = "lighter";
      drawChannel(ctx, data.red, w, h, "rgba(220,60,60,0.50)");
      drawChannel(ctx, data.green, w, h, "rgba(60,200,60,0.50)");
      drawChannel(ctx, data.blue, w, h, "rgba(70,100,240,0.50)");
      ctx.globalCompositeOperation = "source-over";
    }
  }, [data, mode]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (mode === "off") return null;

  return (
    <div
      className="absolute top-3 left-3 z-20 cursor-pointer select-none"
      onClick={onCycleMode}
      title={`Histogram: ${mode === "luma" ? "Luminance" : "RGB"} (click to switch)`}
    >
      <div
        style={{
          width: HIST_WIDTH,
          height: HIST_HEIGHT,
          borderRadius: 6,
          overflow: "hidden",
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={HIST_WIDTH}
          height={HIST_HEIGHT}
          style={{ display: "block", width: HIST_WIDTH, height: HIST_HEIGHT }}
        />
      </div>
      <span
        style={{
          position: "absolute",
          bottom: 3,
          right: 6,
          fontSize: 9,
          color: "rgba(255,255,255,0.5)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {mode === "luma" ? "LUMA" : "RGB"}
      </span>
    </div>
  );
}

// ---------- Draw helper ----------

function drawChannel(
  ctx: CanvasRenderingContext2D,
  bins: Uint32Array,
  w: number,
  h: number,
  color: string
) {
  // Find max bin value for normalization (skip bin 0 and 255 to avoid clipping spikes)
  let maxVal = 0;
  for (let i = 1; i < 255; i++) {
    if (bins[i] > maxVal) maxVal = bins[i];
  }
  if (maxVal === 0) return;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);

  // Map 256 bins to w pixels
  const step = w / 256;
  for (let i = 0; i < 256; i++) {
    const normalized = Math.min(1, bins[i] / maxVal);
    const barH = normalized * (h - 2); // 2px top padding
    const x = i * step;
    ctx.lineTo(x, h - barH);
  }

  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

// ---------- Toolbar Toggle ----------

interface HistogramToggleProps {
  mode: HistogramMode;
  onClick: () => void;
}

/**
 * Toolbar button to cycle histogram mode: off -> luma -> rgb -> off
 */
export function HistogramToggle({ mode, onClick }: HistogramToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={mode !== "off" ? "bg-accent" : ""}
      title="Toggle histogram"
    >
      <BarChart3 className="size-4" />
      <span className="text-xs">Histogram</span>
    </Button>
  );
}

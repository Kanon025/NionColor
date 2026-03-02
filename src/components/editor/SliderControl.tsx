"use client";

import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  onChange: (value: number) => void;
}

export function SliderControl({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  onChange,
}: SliderControlProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(value));
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleReset = () => {
    onChange(defaultValue);
  };

  const commitInput = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-1.5 px-3 py-1">
      <div className="flex items-center justify-between">
        <span
          className="text-xs text-muted-foreground select-none cursor-default"
          onDoubleClick={handleReset}
        >
          {label}
        </span>
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            className="w-14 h-5 text-xs text-right bg-muted rounded px-1 outline-none border border-ring"
            value={inputValue}
            min={min}
            max={max}
            step={step}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={commitInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitInput();
              if (e.key === "Escape") setIsEditing(false);
            }}
          />
        ) : (
          <span
            className="text-xs text-foreground tabular-nums cursor-default min-w-[3rem] text-right"
            onClick={() => setIsEditing(true)}
            onDoubleClick={handleReset}
          >
            {Number.isInteger(step) ? value : value.toFixed(2)}
          </span>
        )}
      </div>
      <div onDoubleClick={handleReset}>
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
        />
      </div>
    </div>
  );
}

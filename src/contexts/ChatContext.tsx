"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useEditContext } from "@/contexts/EditContext";
import type { EditParameters } from "@/types/edit-parameters";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatContextValue {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Deeply apply partial parameter updates to the EditContext.
 * Handles nested objects (hsl.red.hue, colorGrading.shadows.hue, etc.)
 * and array values (toneCurve channels).
 */
function applyParameters(
  partial: Partial<EditParameters>,
  currentParams: EditParameters,
  updateParameter: (section: string, key: string, value: number) => void,
  updateSection: (section: keyof EditParameters, value: Record<string, unknown>) => void
) {
  for (const [section, sectionValue] of Object.entries(partial)) {
    if (sectionValue === null || sectionValue === undefined) continue;

    // toneCurve: merge arrays with current values, then replace entire section
    if (section === "toneCurve") {
      const curveUpdate = sectionValue as unknown as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...currentParams.toneCurve };
      for (const [channel, points] of Object.entries(curveUpdate)) {
        if (Array.isArray(points)) {
          merged[channel] = points;
        }
      }
      updateSection("toneCurve", merged);
      continue;
    }

    // HSL and colorGrading have nested objects
    if (section === "hsl" || section === "colorGrading") {
      const nested = sectionValue as unknown as Record<
        string,
        Record<string, number> | undefined
      >;
      for (const [channel, channelValue] of Object.entries(nested)) {
        if (!channelValue || typeof channelValue !== "object") continue;
        for (const [prop, val] of Object.entries(channelValue)) {
          if (typeof val === "number") {
            // Use dot-notation key: e.g. "red.hue", "shadows.luminance"
            updateParameter(section, `${channel}.${prop}`, val);
          }
        }
      }
      continue;
    }

    // Flat sections: whiteBalance, tone, presence, detail, effects
    const flat = sectionValue as unknown as Record<string, number>;
    for (const [key, value] of Object.entries(flat)) {
      if (typeof value === "number") {
        updateParameter(section, key, value);
      }
    }
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { params, updateParameter, updateSection } = useEditContext();

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        // Build history from last 10 messages (for API context)
        const history = messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch("/api/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            currentParameters: params,
            history,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.error || `Error del servidor (${response.status})`
          );
        }

        const data = await response.json();

        // Apply returned parameters to EditContext
        if (data.parameters && Object.keys(data.parameters).length > 0) {
          applyParameters(data.parameters, params, updateParameter, updateSection);
        }

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content:
            data.explanation || "Ajustes aplicados.",
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error de conexión";
        setError(message);

        // Add error as assistant message so user sees it
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: `Error: ${message}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, params, updateParameter, updateSection]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <ChatContext value={{ messages, isLoading, error, sendMessage, clearChat }}>
      {children}
    </ChatContext>
  );
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return ctx;
}

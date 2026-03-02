"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/contexts/ChatContext";

// ---------- Typing dots animation ----------
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
      <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
      <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

// ---------- Chat Toggle Button (for Toolbar) ----------
export function ChatToggle({
  onClick,
  isOpen,
}: {
  onClick: () => void;
  isOpen: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={isOpen ? "bg-accent" : ""}
    >
      <MessageSquare className="size-4" />
      <span className="text-xs">Chat</span>
    </Button>
  );
}

// ---------- Main Chat Panel ----------
export function ChatPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { messages, isLoading, sendMessage, clearChat } = useChatContext();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 96)}px`; // max ~4 lines
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage(trimmed);
    setInput("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col border-t border-border bg-zinc-900 shrink-0" style={{ height: "280px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800">
        <span className="text-xs font-medium text-zinc-300">
          Asistente de edicion
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-200"
            onClick={clearChat}
            title="Limpiar chat"
          >
            <Trash2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-200"
            onClick={onClose}
            title="Cerrar"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
            Describe como quieres editar la foto...
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-1.5 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-200"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-lg">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 px-3 py-2 border-t border-zinc-800">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            resizeTextarea();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Describe como quieres editar la foto..."
          rows={1}
          className="flex-1 resize-none bg-zinc-800 text-zinc-100 text-xs rounded-md px-3 py-2 border border-zinc-700 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-500"
          disabled={isLoading}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 shrink-0"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}

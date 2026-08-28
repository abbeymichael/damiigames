"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Flame, Sparkles, Handshake, Check } from "lucide-react";
import type { ChatMessage, Player } from "@/lib/types";

interface LiveMatchChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void> | void;
  sending?: boolean;
  userRole?: "white" | "black" | "spectator";
  isMatchFinished?: boolean;
}

const QUICK_REACTIONS = ["👏 GG", "🔥 Nice Move!", "🤔 Thinking...", "🤝 Draw?", "⚡ Check this!"];

export function LiveMatchChat({
  messages,
  onSendMessage,
  sending = false,
  userRole = "white",
  isMatchFinished = false,
}: LiveMatchChatProps) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    const msg = text.trim();
    setText("");
    await onSendMessage(msg);
  }

  return (
    <div className="w-full bg-[#06261f] border border-[#184d3c] rounded-2xl p-3.5 shadow-xl flex flex-col h-[280px] xl:h-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#184d3c] shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-black text-[#d6a735] uppercase tracking-wider">
          <MessageSquare size={14} />
          <span>Live Match Chat</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="px-1.5 py-0.2 bg-[#0c3b2e] border border-[#184d3c] text-slate-300 rounded text-[10px] font-mono">
            {messages.length} msgs
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 pr-1 text-xs"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 space-y-1">
            <MessageSquare size={24} className="opacity-30 text-[#d6a735]" />
            <p className="text-[11px] font-medium">No messages yet.</p>
            <span className="text-[10px]">Send a message or quick reaction below.</span>
          </div>
        ) : (
          messages.map((m) => {
            const isSystem = m.senderRole === "system";
            const isWhite = m.senderRole === "white";
            const isBlack = m.senderRole === "black";

            if (isSystem) {
              return (
                <div
                  key={m.id}
                  className="px-2 py-1 bg-[#041913]/90 border border-[#184d3c]/60 rounded-lg text-[10px] text-amber-300/90 font-mono text-center flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={11} className="text-[#d6a735]" />
                  <span>{m.text}</span>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className={`p-1.5 rounded-lg border text-[11px] transition-colors ${
                  isWhite
                    ? "bg-[#0c3b2e]/60 border-[#d6a735]/30 text-slate-200"
                    : isBlack
                    ? "bg-[#08201a]/80 border-emerald-600/30 text-slate-200"
                    : "bg-[#041913] border-[#184d3c] text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isWhite ? "bg-amber-300" : isBlack ? "bg-emerald-400" : "bg-slate-400"
                      }`}
                    />
                    <strong className="text-[10px] text-[#d6a735] font-bold truncate max-w-[110px]">
                      {m.sender}
                    </strong>
                    <span className="text-[9px] text-slate-400 font-mono">
                      ({isWhite ? "White" : isBlack ? "Black" : "Spectator"})
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono shrink-0">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="break-words text-slate-100 pl-2.5">{m.text}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Reaction Chips */}
      <div className="py-1 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 border-t border-[#184d3c]/70">
        {QUICK_REACTIONS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onSendMessage(chip)}
            className="px-2 py-0.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors shrink-0"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Composer */}
      <form onSubmit={handleSubmit} className="pt-1.5 flex items-center gap-1.5 shrink-0">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type match message..."
          maxLength={140}
          className="flex-1 bg-[#041913] border border-[#184d3c] focus:border-[#d6a735] focus:ring-1 focus:ring-[#d6a735] rounded-xl px-2.5 py-1.5 text-xs text-[#f5efdf] placeholder-slate-500 outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="px-3 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-40 text-[#06261f] font-black rounded-xl text-xs flex items-center justify-center gap-1 transition-all shadow-md shrink-0"
          title="Send message"
        >
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}

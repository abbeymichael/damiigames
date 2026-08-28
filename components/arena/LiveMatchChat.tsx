"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Sparkles } from "lucide-react";
import type { ChatMessage } from "@/lib/types";

interface LiveMatchChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void> | void;
  sending?: boolean;
  userRole?: "white" | "black" | "spectator";
  currentUsername?: string;
  isMatchFinished?: boolean;
}

const QUICK_REACTIONS = ["👏 GG", "🔥 Nice Move!", "🤔 Thinking...", "🤝 Draw?"];

export function LiveMatchChat({
  messages,
  onSendMessage,
  sending = false,
  userRole = "white",
  currentUsername = "",
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
    <div className="w-full bg-[#06261f] border border-[#184d3c] rounded-xl p-2.5 sm:p-3 shadow-lg flex flex-col h-[200px] xl:h-[220px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#184d3c] shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-[#d6a735] uppercase tracking-wider">
          <MessageSquare size={13} />
          <span>Live Match Chat</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="px-1 py-0.2 bg-[#0c3b2e] border border-[#184d3c] text-slate-300 rounded text-[9px] font-mono">
            {messages.length} msgs
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 pr-1 text-[11px]"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-2 text-slate-500 space-y-0.5">
            <MessageSquare size={16} className="opacity-30 text-[#d6a735]" />
            <p className="text-[10px] font-medium">No messages yet.</p>
            <span className="text-[9px]">Send a message or quick reaction below.</span>
          </div>
        ) : (
          messages.map((m) => {
            const isSystem = m.senderRole === "system";
            const cleanUser = (currentUsername || "").trim().toLowerCase();
            const senderClean = (m.sender || "").trim().toLowerCase();
            const isSelf = !isSystem && (
              (cleanUser && senderClean === cleanUser) ||
              (userRole && m.senderRole === userRole && m.senderRole !== "spectator")
            );
            const isWhite = m.senderRole === "white";
            const isBlack = m.senderRole === "black";

            if (isSystem) {
              return (
                <div key={m.id} className="w-full flex justify-center my-0.5">
                  <div className="px-2 py-0.5 bg-[#041913]/95 border border-[#184d3c]/80 rounded-full text-[9px] text-amber-300/90 font-mono text-center flex items-center justify-center gap-1 shadow-sm">
                    <Sparkles size={10} className="text-[#d6a735]" />
                    <span>{m.text}</span>
                  </div>
                </div>
              );
            }

            if (isSelf) {
              return (
                <div key={m.id} className="w-full flex justify-end">
                  <div className="max-w-[88%] rounded-xl rounded-tr-none px-2.5 py-1 bg-gradient-to-br from-amber-500/20 via-[#0c3b2e] to-[#06261f] border border-[#d6a735]/60 shadow-sm">
                    <div className="flex items-center justify-end gap-1 mb-0.5">
                      <span className="text-[8px] text-slate-400 font-mono">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="px-1 py-0.2 bg-[#d6a735]/30 text-[#d6a735] border border-[#d6a735]/50 rounded text-[8px] font-black uppercase">
                        You
                      </span>
                    </div>
                    <p className="break-words text-amber-50 text-[11px] text-right font-medium leading-snug">{m.text}</p>
                  </div>
                </div>
              );
            }

            return (
              <div key={m.id} className="w-full flex justify-start">
                <div className="max-w-[88%] rounded-xl rounded-tl-none px-2.5 py-1 bg-[#08201a] border border-emerald-500/50 shadow-sm">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isWhite ? "bg-amber-300" : isBlack ? "bg-emerald-400" : "bg-slate-400"
                      }`}
                    />
                    <strong className="text-[9px] text-emerald-300 font-bold truncate max-w-[100px]">
                      {m.sender}
                    </strong>
                    <span className="text-[8px] text-slate-400 font-mono">
                      ({isWhite ? "Red" : isBlack ? "Black" : "Spectator"})
                    </span>
                    <span className="text-[8px] text-slate-500 font-mono ml-auto pl-1">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="break-words text-slate-100 text-[11px] text-left leading-snug">{m.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Reaction Chips */}
      <div className="py-0.5 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 border-t border-[#184d3c]/70">
        {QUICK_REACTIONS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onSendMessage(chip)}
            className="px-1.5 py-0.2 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] rounded-full text-[9px] font-semibold whitespace-nowrap transition-colors shrink-0"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Composer */}
      <form onSubmit={handleSubmit} className="pt-1 flex items-center gap-1 shrink-0">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type match message..."
          maxLength={140}
          className="flex-1 bg-[#041913] border border-[#184d3c] focus:border-[#d6a735] focus:ring-1 focus:ring-[#d6a735] rounded-lg px-2 py-1 text-[11px] text-[#f5efdf] placeholder-slate-500 outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="px-2.5 py-1 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-40 text-[#06261f] font-black rounded-lg text-xs flex items-center justify-center gap-1 transition-all shadow shrink-0"
          title="Send message"
        >
          <Send size={11} />
        </button>
      </form>
    </div>
  );
}


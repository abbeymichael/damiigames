"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Copy,
  Check,
  Share2,
  Swords,
  ShieldCheck,
  Zap,
  Users,
  Bot,
  AlertTriangle,
  ArrowLeft,
  Crown,
  Sparkles,
  RefreshCw,
  QrCode,
  ExternalLink,
} from "lucide-react";
import type { Room } from "@/lib/types";

interface WaitingRoomProps {
  room: Room;
  currentUsername?: string;
  isHost: boolean;
  onCancelRoom: () => void;
  onPracticeAi?: () => void;
  busy?: boolean;
}

export function WaitingRoom({
  room,
  currentUsername,
  isHost,
  onCancelRoom,
  onPracticeAi,
  busy = false,
}: WaitingRoomProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(600);
  const [showQr, setShowQr] = useState(false);

  // Calculate 10-minute expiry countdown
  useEffect(() => {
    const calculateTimeLeft = () => {
      const createdTime = room.createdAt ? new Date(room.createdAt).getTime() : Date.now();
      const expiryTime = createdTime + 10 * 60 * 1000;
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeLeftSeconds(diffSecs);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [room.createdAt]);

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareableUrl = `${origin}/arena?room=${room.code}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {}
  };

  const handleNativeShare = async () => {
    const text = `Challenge me to a 10x10 DAMII Draughts match in room ${room.code}! Join here: ${shareableUrl}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "DAMII Draughts Match Invitation",
          text,
          url: shareableUrl,
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const isWager = room.mode === "wager" && room.wagerAmount > 0;
  const potTotal = isWager ? (room.wagerAmount * 2).toFixed(2) : "0.00";

  return (
    <div className="w-full max-w-[1100px] mx-auto p-4 sm:p-6 space-y-6" id="damii-waiting-room">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-[#06261f] via-[#0c3b2e] to-[#041c17] border-2 border-[#184d3c] rounded-2xl p-5 sm:p-7 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#184d3c]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-[#d6a735]/20 border border-[#d6a735]/40 text-[#d6a735] text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Match Waiting Lounge
              </span>
              <span className="text-xs text-slate-300 font-medium">Room Ticket:</span>
              <span className="px-2 py-0.5 bg-slate-900/90 text-[#d6a735] font-mono font-black text-sm tracking-wider border border-[#d6a735]/40 rounded-lg">
                {room.code}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#f5efdf] font-serif">
              {room.isPrivate ? "Private Match Challenge" : isWager ? `Wager Match (GH₵ ${potTotal} Pot)` : "Casual 10x10 Draughts Match"}
            </h1>
          </div>

          {/* 10-Minute Expiry Clock */}
          <div className="flex items-center gap-3 bg-[#06261f] border border-[#184d3c] px-4 py-2.5 rounded-xl self-start sm:self-auto">
            <Clock className={`w-5 h-5 ${timeLeftSeconds < 120 ? "text-red-400 animate-pulse" : "text-[#d6a735]"}`} />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Room Auto-Expiry</div>
              <div className={`text-lg font-black font-mono leading-none ${timeLeftSeconds < 120 ? "text-red-400" : "text-[#f5efdf]"}`}>
                {formattedTime}
              </div>
            </div>
          </div>
        </div>

        {/* Matchup Stage: Host vs Guest */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center py-2">
          {/* Host Card (Player 1 - White) */}
          <div className="md:col-span-3 bg-[#06261f]/90 border-2 border-emerald-600/60 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-900/80 text-emerald-300 border border-emerald-700 text-[10px] font-black rounded uppercase">
              Host • White ♔
            </div>
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#d6a735] to-amber-200 border-2 border-white flex items-center justify-center font-black text-[#06261f] text-lg shadow-md shrink-0">
                {room.hostName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white truncate flex items-center gap-1.5">
                  <span>{room.hostName}</span>
                  <Crown className="w-4 h-4 text-[#d6a735]" />
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-semibold">Ready in Room</span>
                </div>
              </div>
            </div>
            {isWager && (
              <div className="mt-3 pt-3 border-t border-[#184d3c] flex items-center justify-between text-xs">
                <span className="text-slate-400">Wager Stake:</span>
                <strong className="text-amber-300 font-mono">GH₵ {room.wagerAmount.toFixed(2)} in Escrow</strong>
              </div>
            )}
          </div>

          {/* Center VS & Radar Indicator */}
          <div className="md:col-span-1 flex flex-col items-center justify-center py-2 text-center">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[#0c3b2e] border-2 border-[#d6a735] flex items-center justify-center text-[#d6a735] font-black text-sm shadow-xl z-10">
                VS
              </div>
              <div className="absolute inset-0 w-12 h-12 rounded-full bg-[#d6a735]/20 animate-ping" />
            </div>
            <span className="text-[11px] font-bold text-[#d6a735] mt-2 uppercase tracking-wider">10x10 Board</span>
          </div>

          {/* Opponent Card (Player 2 - Black / Searching) */}
          <div className="md:col-span-3 bg-[#06261f]/90 border-2 border-dashed border-[#184d3c] rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded uppercase">
              Challenger • Black ♚
            </div>
            {room.guestName ? (
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-900 border-2 border-slate-600 flex items-center justify-center font-black text-white text-lg shadow-md shrink-0">
                  {room.guestName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate">{room.guestName}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold">Joined • Launching match...</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3.5 py-1">
                <div className="w-12 h-12 rounded-2xl bg-[#041c17] border border-[#184d3c] flex items-center justify-center text-slate-500 shrink-0">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#d6a735]/70" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Waiting for Challenger...</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {room.mode === "casual" ? "Matching with online players or authentic bot..." : "Share room link to invite a player."}
                  </p>
                </div>
              </div>
            )}
            {isWager && !room.guestName && (
              <div className="mt-3 pt-3 border-t border-[#184d3c] flex items-center justify-between text-xs">
                <span className="text-slate-400">Required Stake:</span>
                <strong className="text-amber-300 font-mono">GH₵ {room.wagerAmount.toFixed(2)}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share & Direct Invite Card */}
      <div className="bg-[#06261f] border border-[#184d3c] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-[#d6a735]">
          <Share2 className="w-5 h-5" />
          <h2 className="text-base font-bold text-[#f5efdf]">Direct Shareable Room Link</h2>
        </div>
        <p className="text-xs text-slate-300">
          Anyone with this link can land directly into this match room or spectate if filled:
        </p>

        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="flex-1 bg-[#041c17] border border-[#184d3c] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono truncate select-all flex items-center">
            {shareableUrl}
          </div>

          <button
            onClick={handleCopyLink}
            className="px-4 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all shrink-0"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-800" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? "Copied Link!" : "Copy Link"}</span>
          </button>

          <button
            onClick={handleCopyCode}
            className="px-4 py-2.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shrink-0"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCode ? "Code Copied!" : "Copy Code"}</span>
          </button>

          <button
            onClick={handleNativeShare}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all shrink-0"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>

        {/* Social Quick Share Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
          <span className="text-slate-400 font-medium mr-1">Quick Invite:</span>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Challenge me to a 10x10 DAMII Draughts match in room ${room.code}! Join: ${shareableUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-emerald-300 border border-[#25D366]/40 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>WhatsApp</span>
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(shareableUrl)}&text=${encodeURIComponent(`Challenge me to a 10x10 DAMII Draughts match in room ${room.code}!`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-[#0088cc]/20 hover:bg-[#0088cc]/30 text-cyan-300 border border-[#0088cc]/40 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>Telegram</span>
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Playing DAMII Draughts (10x10 Flying Kings) in room ${room.code}! Join here:`)}&url=${encodeURIComponent(shareableUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 text-sky-300 border border-[#1DA1F2]/40 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>X / Twitter</span>
          </a>
        </div>
      </div>

      {/* Rules & Fair Play Assurance Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-[#06261f] border border-[#184d3c] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Match Rules & Conditions</span>
          </div>
          <ul className="space-y-1.5 text-slate-300">
            <li className="flex items-center gap-1.5">
              <span className="text-[#d6a735] font-bold">•</span>
              <span>10x10 International Draughts Board with Flying Kings (Long-range)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[#d6a735] font-bold">•</span>
              <span>60s Turn Clock + 90s Disconnection Grace Protection</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[#d6a735] font-bold">•</span>
              <span>Mandatory Captures enforced automatically by the engine</span>
            </li>
          </ul>
        </div>

        <div className="bg-[#06261f] border border-[#184d3c] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <Zap className="w-4 h-4 text-[#d6a735]" />
            <span>While You Wait</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Practice opening moves vs training bot or wait for a live challenger. If unjoined after 10 minutes, the room automatically cancels and 100% of any wager stake is instantly refunded.
          </p>
          {onPracticeAi && (
            <button
              onClick={onPracticeAi}
              className="mt-1 px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] border border-[#184d3c] font-bold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Practice vs Training Bot</span>
            </button>
          )}
        </div>
      </div>

      {/* Actions Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          onClick={onCancelRoom}
          disabled={busy}
          className="px-4 py-2.5 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel & Leave Room (No Penalty)</span>
        </button>

        <div className="text-[11px] text-slate-400">
          Auto-polling every 1.5s for joining challengers...
        </div>
      </div>
    </div>
  );
}

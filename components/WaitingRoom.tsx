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
  Gamepad2,
  ArrowLeft,
  Crown,
  RefreshCw,
  X,
  Trophy,
  UserCheck,
  Sparkles,
} from "lucide-react";
import type { Room } from "@/lib/types";

interface WaitingRoomProps {
  room: Room;
  currentUsername?: string;
  isHost: boolean;
  onCancelRoom: () => void;
  onAcceptChallenge?: () => void;
  onDeclineChallenge?: () => void;
  onWithdrawChallenge?: () => void;
  onPracticeAi?: () => void;
  busy?: boolean;
}

export function WaitingRoom({
  room,
  currentUsername,
  isHost,
  onCancelRoom,
  onAcceptChallenge,
  onDeclineChallenge,
  onWithdrawChallenge,
  onPracticeAi,
  busy = false,
}: WaitingRoomProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(600);

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
  const isPendingAcceptance = room.status === "pending_acceptance";

  const effectiveIsHost = Boolean(
    isHost ||
    room.role === "white" ||
    (currentUsername && room.hostName && currentUsername.trim().toLowerCase() === room.hostName.trim().toLowerCase()) ||
    (room.hostToken && typeof window !== "undefined" && localStorage.getItem("damii-player-token") === room.hostToken)
  );

  return (
    <div className="w-full max-w-[1100px] mx-auto p-4 sm:p-6 space-y-6" id="damii-waiting-room">
      {/* ========================================================================= */}
      {/* HOST VIEW: CHALLENGER ACCEPTANCE MODAL / HERO POPUP */}
      {/* ========================================================================= */}
      {isPendingAcceptance && effectiveIsHost && (
        <div className="w-full bg-gradient-to-r from-amber-950 via-[#0c3b2e] to-emerald-950 border-2 border-[#d6a735] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#d6a735]/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#d6a735] to-amber-500 text-slate-950 flex items-center justify-center shadow-lg shrink-0">
                <Swords className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/50 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 w-fit">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Incoming Match Challenge
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#f5efdf] font-serif mt-0.5">
                  Challenger Ready in Room {room.code}!
                </h2>
              </div>
            </div>

            <div className="px-3 py-1.5 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-slate-300 self-start sm:self-auto">
              <span className="text-slate-400">Match Format:</span>{" "}
              <strong className="text-[#d6a735]">10x10 Ghanaian Damii</strong>
            </div>
          </div>

          {/* Challenger Identity Card */}
          <div className="bg-[#06261f]/95 border border-[#d6a735]/60 rounded-2xl p-5 sm:p-6 shadow-inner space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-700 via-slate-800 to-emerald-950 border-2 border-[#d6a735] flex items-center justify-center text-white text-xl font-black shadow-xl shrink-0">
                  {room.guestRankBadge || "♚"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      {room.guestFullName || room.guestName || "Challenger"}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      @{room.guestName || "player"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40 rounded-lg text-xs font-bold flex items-center gap-1">
                      <span>{room.guestRankBadge || "🪵"}</span>
                      <span>{room.guestRankTitle || "Draft Learner"}</span>
                    </span>
                    <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded-lg text-xs font-mono font-bold">
                      {room.guestRating || 1200} ELO Rating
                    </span>
                  </div>
                </div>
              </div>

              {isWager && (
                <div className="bg-[#0c3b2e] border border-[#d6a735]/50 rounded-xl p-3 text-right shrink-0">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Wager Pot</span>
                  <strong className="text-amber-300 font-mono text-base font-black">
                    GH₵ {potTotal}
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    GH₵ {room.wagerAmount.toFixed(2)} / player
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-[#184d3c]">
              Would you like to accept this match challenge? Accepting launches the game board simultaneously for both players. Declining resets your room to waiting so you can wait for another challenger (with zero penalty or forfeiture).
            </p>
          </div>

          {/* Accept / Decline Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onDeclineChallenge}
              disabled={busy}
              className="px-5 py-3 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700/70 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
            >
              <X className="w-4 h-4 text-red-400" />
              <span>Decline Challenge (Wait for Another)</span>
            </button>

            <button
              type="button"
              onClick={onAcceptChallenge}
              disabled={busy}
              className="px-6 py-3 bg-gradient-to-r from-[#d6a735] via-amber-300 to-[#d6a735] hover:brightness-110 text-[#06261f] font-black rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-2xl transition-all transform hover:scale-[1.02] cursor-pointer"
            >
              <Swords className="w-5 h-5" />
              <span>Accept & Start Game ⚔️</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GUEST VIEW: AWAITING HOST ACCEPTANCE */}
      {/* ========================================================================= */}
      {isPendingAcceptance && !effectiveIsHost && (
        <div className="w-full bg-gradient-to-r from-[#06261f] via-[#0c3b2e] to-[#041c17] border-2 border-emerald-500/70 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#184d3c]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-300 flex items-center justify-center shadow-lg shrink-0">
                <Clock className="w-6 h-6 animate-spin text-emerald-400" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 w-fit">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Challenge Submitted
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#f5efdf] font-serif mt-0.5">
                  Waiting for Host Acceptance...
                </h2>
              </div>
            </div>

            <div className="px-3 py-1.5 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-slate-300 self-start sm:self-auto">
              <span>Room:</span> <strong className="text-[#d6a735] font-mono">{room.code}</strong>
            </div>
          </div>

          {/* Host Profile Info Card */}
          <div className="bg-[#06261f]/90 border border-[#184d3c] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#d6a735] to-amber-200 text-[#06261f] border-2 border-white flex items-center justify-center text-xl font-black shadow-md shrink-0">
                {room.hostRankBadge || "♔"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {room.hostFullName || room.hostName}
                  </h3>
                  <Crown className="w-4 h-4 text-[#d6a735]" />
                  <span className="text-xs text-slate-400 font-mono">@{room.hostName}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40 rounded-lg text-xs font-bold flex items-center gap-1">
                    <span>{room.hostRankBadge || "🪵"}</span>
                    <span>{room.hostRankTitle || "Draft Learner"}</span>
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded-lg text-xs font-mono font-bold">
                    {room.hostRating || 1200} ELO Rating
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your challenge notification has been delivered. When the host accepts, you will hear the acceptance cue and automatically enter the match.
            </p>
          </div>

          {/* Withdraw Challenge Action */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onWithdrawChallenge}
              disabled={busy}
              className="px-4 py-2.5 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Withdraw Challenge & Leave (100% Refund)</span>
            </button>

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Listening for host response...</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STANDARD WAITING ROOM (WHEN STILL AWAITING A CHALLENGER) */}
      {/* ========================================================================= */}
      {!isPendingAcceptance && (
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

          {/* Matchup Stage: Host vs Challenger (Empty) */}
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
                    <span>{room.hostFullName || room.hostName}</span>
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

            {/* Opponent Card (Searching) */}
            <div className="md:col-span-3 bg-[#06261f]/90 border-2 border-dashed border-[#184d3c] rounded-2xl p-4 sm:p-5 relative overflow-hidden">
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded uppercase">
                Challenger • Black ♚
              </div>
              <div className="flex items-center gap-3.5 py-1">
                <div className="w-12 h-12 rounded-2xl bg-[#041c17] border border-[#184d3c] flex items-center justify-center text-slate-500 shrink-0">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#d6a735]/70" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Waiting for Challenger...</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {room.mode === "casual" ? "Matching with players across Ghana & Africa..." : "Share room link or invite a friend to play."}
                  </p>
                </div>
              </div>
              {isWager && (
                <div className="mt-3 pt-3 border-t border-[#184d3c] flex items-center justify-between text-xs">
                  <span className="text-slate-400">Required Stake:</span>
                  <strong className="text-amber-300 font-mono">GH₵ {room.wagerAmount.toFixed(2)}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share & Direct Invite Card */}
      {!isPendingAcceptance && (
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
              className="px-4 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all shrink-0 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-800" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? "Copied Link!" : "Copy Link"}</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="px-4 py-2.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? "Code Copied!" : "Copy Code"}</span>
            </button>

            <button
              onClick={handleNativeShare}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all shrink-0 cursor-pointer"
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
      )}

      {/* Rules & Conditions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-[#06261f] border border-[#184d3c] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Match Rules & Conditions</span>
          </div>
          <ul className="space-y-1.5 text-slate-300">
            <li className="flex items-center gap-1.5">
              <span className="text-[#d6a735] font-bold">•</span>
              <span>10x10 Ghanaian Damii Board with Flying Kings (Long-range)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[#d6a735] font-bold">•</span>
              <span>60s Turn Clock + 90s Disconnection Grace Protection</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[#d6a735] font-bold">•</span>
              <span>Automatic Board Orientation (flipped for Black) so you never have to turn your phone</span>
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
            Practice opening moves or wait for a live challenger. If unjoined after 10 minutes, the room automatically cancels and 100% of any wager stake is instantly refunded.
          </p>
          {onPracticeAi && (
            <button
              onClick={onPracticeAi}
              className="mt-1 px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] border border-[#184d3c] font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Practice Match (Warm-up)</span>
            </button>
          )}
        </div>
      </div>

      {/* Actions Footer */}
      {!isPendingAcceptance && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={onCancelRoom}
            disabled={busy}
            className="px-4 py-2.5 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel & Leave Room (No Penalty)</span>
          </button>

          <div className="text-[11px] text-slate-400">
            Auto-polling every 1.5s for joining challengers...
          </div>
        </div>
      )}
    </div>
  );
}

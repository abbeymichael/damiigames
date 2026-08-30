"use client";

import React, { useEffect, useState } from "react";
import {
  Swords,
  ShieldCheck,
  Zap,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Crown,
  Trophy,
  Loader2,
  ArrowRight,
  UserCheck,
  Flame,
} from "lucide-react";
import type { Room, Profile } from "@/lib/types";
import { soundService } from "@/lib/sound-service";

interface PostJoinAcceptanceModalProps {
  room: Room | null;
  currentUsername: string;
  isHost: boolean;
  onAccept: () => Promise<void> | void;
  onDecline: () => Promise<void> | void;
  onWithdraw: () => Promise<void> | void;
  busy?: boolean;
}

export function PostJoinAcceptanceModal({
  room,
  currentUsername,
  isHost,
  onAccept,
  onDecline,
  onWithdraw,
  busy = false,
}: PostJoinAcceptanceModalProps) {
  const [secondsWaiting, setSecondsWaiting] = useState(0);

  // Play audio alert on mount if host
  useEffect(() => {
    if (room?.status === "pending_acceptance") {
      if (isHost) {
        soundService.playOpponentJoined();
      }
    }
  }, [room?.status, isHost]);

  // Tick seconds waiting for live feedback
  useEffect(() => {
    if (!room || room.status !== "pending_acceptance") {
      setSecondsWaiting(0);
      return;
    }
    const interval = setInterval(() => {
      setSecondsWaiting((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.status]);

  if (!room || room.status !== "pending_acceptance") {
    return null;
  }

  const isWager = room.mode === "wager" && room.wagerAmount > 0;
  const potTotal = isWager ? (room.wagerAmount * 2).toFixed(2) : "0.00";
  const stakeAmount = isWager ? room.wagerAmount.toFixed(2) : "0.00";

  return (
    <div
      id="post-join-pregame-modal"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="acceptance-modal-title"
    >
      <div className="w-full max-w-lg bg-[#06261f] border-2 border-[#d6a735] rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(214,167,53,0.25)] overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
        
        {/* ========================================================================= */}
        {/* MODAL HEADER */}
        {/* ========================================================================= */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 bg-gradient-to-r from-[#0c3b2e] via-[#144435] to-[#081c15] border-b border-[#184d3c] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#d6a735] to-amber-500 text-slate-950 flex items-center justify-center shadow-lg shrink-0">
              {isHost ? (
                <Swords className="w-6 h-6 animate-pulse" />
              ) : (
                <Clock className="w-6 h-6 animate-spin text-slate-950" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {isHost ? "Incoming Challenge" : "Challenge Submitted"}
                </span>
                <span className="text-[10px] sm:text-xs font-mono text-slate-300 font-bold">
                  Room #{room.code}
                </span>
              </div>
              <h2
                id="acceptance-modal-title"
                className="text-base sm:text-lg md:text-xl font-black text-[#f5efdf] font-serif tracking-tight mt-0.5"
              >
                {isHost ? "Challenger Joined • Accept Match?" : "Waiting for Host to Accept..."}
              </h2>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Elapsed</span>
            <span className="text-xs font-mono font-bold text-[#d6a735]">
              {String(Math.floor(secondsWaiting / 60)).padStart(2, "0")}:
              {String(secondsWaiting % 60).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL BODY */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-7 space-y-5">
          
          {/* HOST PERSPECTIVE: SHOW CHALLENGER PROFILE & INTEL */}
          {isHost ? (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 bg-gradient-to-br from-[#0c3b2e] to-[#06261f] border border-[#d6a735]/50 rounded-2xl shadow-inner space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-slate-800 via-[#144435] to-emerald-950 border-2 border-[#d6a735] flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0">
                      {room.guestRankBadge || "♚"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-[#f5efdf] truncate">
                          {room.guestFullName || room.guestName || "Challenger"}
                        </h3>
                        <span className="text-xs text-[#d6a735] font-mono bg-[#d6a735]/15 px-2 py-0.5 rounded-md font-bold">
                          @{room.guestName || "player"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40 rounded-lg text-xs font-bold flex items-center gap-1">
                          <span>{room.guestRankBadge || "🪵"}</span>
                          <span>{room.guestRankTitle || "Draft Learner"}</span>
                        </span>
                        <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded-lg text-xs font-mono font-bold">
                          {room.guestRating || 1200} ELO
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                    <UserCheck className="w-3.5 h-3.5" /> Ready
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#184d3c]/80 text-xs">
                  <div className="p-2.5 bg-[#06261f] border border-[#184d3c] rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Your Role</span>
                    <strong className="text-[#f5efdf] flex items-center gap-1.5 mt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f5efdf] border border-slate-400 inline-block" />
                      White (First Move)
                    </strong>
                  </div>
                  <div className="p-2.5 bg-[#06261f] border border-[#184d3c] rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Opponent Role</span>
                    <strong className="text-slate-300 flex items-center gap-1.5 mt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#114232] border border-emerald-400 inline-block" />
                      Black (Guest)
                    </strong>
                  </div>
                </div>
              </div>

              {/* Match Wager & Stakes Banner */}
              {isWager ? (
                <div className="p-4 bg-gradient-to-r from-amber-950/80 via-[#0c3b2e] to-emerald-950/80 border border-[#d6a735] rounded-2xl flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40 rounded-xl">
                      <Zap className="w-5 h-5 fill-[#d6a735]" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                        Sanctioned Wager Match
                      </span>
                      <strong className="text-xs sm:text-sm text-[#f5efdf]">
                        GH₵ {stakeAmount} Entry Stake
                      </strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Winner Takes Pot</span>
                    <strong className="text-sm sm:text-base font-black text-amber-300 font-mono">
                      GH₵ {potTotal}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-[#06261f] border border-[#184d3c] rounded-xl flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Casual Match (Free Friendly Game)</span>
                  </span>
                  <span className="text-slate-400 font-mono">10x10 Flying Kings</span>
                </div>
              )}

              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed bg-[#081c15] p-3 rounded-xl border border-[#184d3c]/60">
                ⚡ <strong>Accepting</strong> starts the game clock and immediately opens the 10x10 Draughts board. <strong>Declining</strong> cleanly rejects this challenge and keeps your room open for other players with zero forfeiture penalty.
              </p>
            </div>
          ) : (
            /* GUEST PERSPECTIVE: SHOW HOST PROFILE & PULSING STATUS */
            <div className="space-y-4">
              <div className="p-4 sm:p-5 bg-gradient-to-br from-[#0c3b2e] to-[#06261f] border border-emerald-500/50 rounded-2xl shadow-inner space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#d6a735] via-amber-400 to-amber-200 border-2 border-white flex items-center justify-center text-[#06261f] text-2xl font-black shadow-lg shrink-0">
                      {room.hostRankBadge || "♔"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-[#f5efdf] truncate">
                          {room.hostFullName || room.hostName}
                        </h3>
                        <Crown className="w-4 h-4 text-[#d6a735] shrink-0" />
                        <span className="text-xs text-slate-400 font-mono">
                          @{room.hostName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40 rounded-lg text-xs font-bold flex items-center gap-1">
                          <span>{room.hostRankBadge || "🪵"}</span>
                          <span>{room.hostRankTitle || "Draft Learner"}</span>
                        </span>
                        <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded-lg text-xs font-mono font-bold">
                          {room.hostRating || 1200} ELO
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-amber-950/90 text-amber-300 border border-amber-500/50 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                    <Crown className="w-3.5 h-3.5 text-[#d6a735]" /> Host
                  </span>
                </div>

                <div className="p-3 bg-[#06261f] border border-[#184d3c] rounded-xl flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute" />
                  </div>
                  <p className="text-xs text-slate-200">
                    Your challenge request is ringing on <strong>{room.hostName}</strong>&apos;s screen. When the host accepts, the match board will launch automatically!
                  </p>
                </div>
              </div>

              {isWager && (
                <div className="p-3.5 bg-[#06261f] border border-[#184d3c] rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-400">Escrowed Entry Stake:</span>
                  <strong className="text-amber-300 font-mono font-bold">
                    GH₵ {stakeAmount} (Refundable upon withdrawal)
                  </strong>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER & ACTION CONTROLS */}
        {/* ========================================================================= */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 bg-[#081c15] border-t border-[#184d3c] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {isHost ? (
            <>
              <button
                type="button"
                onClick={onDecline}
                disabled={busy}
                className="px-4 py-2.5 sm:py-3 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700/70 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              >
                <X className="w-4 h-4 text-red-400" />
                <span>Decline Challenge</span>
              </button>

              <button
                type="button"
                onClick={onAccept}
                disabled={busy}
                className="px-6 py-3 sm:py-3.5 bg-gradient-to-r from-[#d6a735] via-amber-300 to-[#d6a735] hover:brightness-110 text-[#06261f] font-black rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Launching Match...</span>
                  </>
                ) : (
                  <>
                    <Swords className="w-5 h-5" />
                    <span>Accept & Start Game ⚔️</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onWithdraw}
                disabled={busy}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              >
                <X className="w-4 h-4 text-slate-400" />
                <span>Withdraw Challenge (100% Refund)</span>
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-bold py-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Awaiting Host Confirmation</span>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}

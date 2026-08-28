"use client";

import React from "react";
import {
  Sparkles,
  Maximize2,
  Eye,
  Handshake,
  AlertTriangle,
  Scale,
  Zap,
  ShieldCheck,
  Flame,
  Sliders,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Palette,
  HelpCircle,
  RotateCcw,
  Lightbulb,
  Clock,
  Trophy,
  Gamepad2,
} from "lucide-react";
import {
  rowOf,
  colOf,
  type Board,
  type Move,
  type Player,
} from "@/lib/damii-rules";
import type { MoveLogEntry, Room, NotationStyle, ChatMessage } from "@/lib/types";
import { LiveMatchChat } from "./LiveMatchChat";
import { MatchSettingsCard } from "./MatchSettingsCard";

interface ArenaBoardViewProps {
  mode: "local" | "online";
  subMode: "pass_play" | "vs_cpu";
  room: Room | null;
  board: Board;
  orderedSquares: number[];
  activeBoardConfig: {
    boardBg: string;
    playableBg: string;
    playableAltBg: string;
    restBg: string;
    wrapBg: string;
    wrapBorder: string;
  };
  activeMarbleConfig: {
    whiteStyle: React.CSSProperties;
    blackStyle: React.CSSProperties;
  };
  boardZoom: number;
  handleZoomChange: (z: number) => void;
  promotedKingEffect: { square: number; player: Player } | null;
  lastCaptureSquare: number | null;
  animatePieces: boolean;
  animatedMove: { from: number; to: number; id: number } | null;
  selected: number | null;
  destinations: Set<number>;
  selectable: Set<number>;
  moves: Move[];
  lastMove: {
    from: number;
    to: number;
    player: Player;
    playerName?: string;
    isCapture?: boolean;
    notation?: string;
    sqNotation?: string;
  } | null;
  handleSquare: (square: number) => void;
  winner: Player | "draw" | null;
  turn: Player;
  secondsLeft: number;
  turnTimerLimit: number;
  whiteDisplayName: string;
  blackDisplayName: string;
  spectatorCount?: number;
  message: string;
  mustCapture: boolean;
  showGameActions: boolean;
  setShowGameActions: React.Dispatch<React.SetStateAction<boolean>>;
  onlineBusy: boolean;
  offerDrawOnline: () => Promise<void>;
  acceptDrawOnline: () => Promise<void>;
  declineDrawOnline: () => Promise<void>;
  forfeitOnline: () => Promise<void>;
  claimTimeoutOnline: () => Promise<void>;
  cancelRoomOnline: () => Promise<void>;
  requestRematch: () => Promise<void>;
  resetLocalMatch: () => void;
  setRotated: React.Dispatch<React.SetStateAction<boolean>>;
  rotated: boolean;
  boardTheme: any;
  marbleTheme: any;
  saveCustomTheme: (b: any, m: any) => void;
  soundEnabled: boolean;
  toggleAudioSound: () => void;
  setSettingsTab: (tab: any) => void;
  setShowSettings: (v: boolean) => void;
  setShowDisputeModal: (v: boolean) => void;
  // Mobile Tab Support
  mobileArenaTab: "chat" | "history" | "settings";
  setMobileArenaTab: (tab: "chat" | "history" | "settings") => void;
  displayChatMessages: ChatMessage[];
  handleSendChat: (text: string) => Promise<void>;
  sendingChat: boolean;
  currentUsername?: string;
  userRole?: "white" | "black" | "spectator";
  activeMoves: MoveLogEntry[];
  pairedMoves: Array<{
    turnNum: number;
    white?: { notation: string; algNotation?: string; sqNotation?: string; isCapture?: boolean };
    black?: { notation: string; algNotation?: string; sqNotation?: string; isCapture?: boolean };
  }>;
  notationStyle: NotationStyle;
  setNotationStyle: (st: NotationStyle) => void;
  copyMoveLog: () => void;
  copiedHistory: boolean;
  showTrainingIntel?: boolean;
  onToggleTrainingIntel?: () => void;
  suggestedHint?: {
    from: number;
    to: number;
    notation: string;
    algNotation?: string;
    sqNotation?: string;
    isCapture?: boolean;
  } | null;
  onReturnToLobby?: () => void;
  onOpenSummary?: () => void;
}

export function ArenaBoardView({
  mode,
  subMode,
  room,
  board,
  orderedSquares,
  activeBoardConfig,
  activeMarbleConfig,
  boardZoom,
  handleZoomChange,
  promotedKingEffect,
  lastCaptureSquare,
  animatePieces,
  animatedMove,
  selected,
  destinations,
  selectable,
  moves,
  lastMove,
  handleSquare,
  winner,
  turn,
  secondsLeft,
  turnTimerLimit,
  whiteDisplayName,
  blackDisplayName,
  spectatorCount = 0,
  message,
  mustCapture,
  showGameActions,
  setShowGameActions,
  onlineBusy,
  offerDrawOnline,
  acceptDrawOnline,
  declineDrawOnline,
  forfeitOnline,
  claimTimeoutOnline,
  cancelRoomOnline,
  requestRematch,
  resetLocalMatch,
  setRotated,
  rotated,
  boardTheme,
  marbleTheme,
  saveCustomTheme,
  soundEnabled,
  toggleAudioSound,
  setSettingsTab,
  setShowSettings,
  setShowDisputeModal,
  mobileArenaTab,
  setMobileArenaTab,
  displayChatMessages,
  handleSendChat,
  sendingChat,
  currentUsername,
  userRole,
  activeMoves,
  pairedMoves,
  notationStyle,
  setNotationStyle,
  copyMoveLog,
  copiedHistory,
  showTrainingIntel = false,
  onToggleTrainingIntel,
  suggestedHint,
  onReturnToLobby,
  onOpenSummary,
}: ArenaBoardViewProps) {
  return (
    <div className="w-full max-w-full lg:max-w-[480px] xl:max-w-[520px] mx-auto flex flex-col items-center space-y-2">
      {/* Unjoined Waiting Room Cancellation Banner */}
      {mode === "online" && room?.status === "waiting" && room?.role === "white" && !room.guestToken && (
        <div className="w-full p-3 bg-[#0c3b2e] border border-[#d6a735]/40 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2 text-[#f5efdf]">
            <Clock size={16} className="text-[#d6a735] animate-pulse shrink-0" />
            <div>
              <strong className="text-[#d6a735]">Waiting for Opponent in Room {room.code}</strong>
              <p className="text-[11px] text-slate-300">Room automatically expires after 10 minutes if unjoined.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={cancelRoomOnline}
            disabled={onlineBusy}
            className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 rounded-lg text-xs font-bold transition-all"
          >
            Cancel Room (No Penalty)
          </button>
        </div>
      )}

      {/* Incoming / Active Draw Offer Banner */}
      {mode === "online" && room?.status === "playing" && room?.drawOfferedBy && (
        room.drawOfferedBy !== room.role ? (
          <div className="w-full p-3 bg-[#0c3b2e] border-2 border-[#d6a735] rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-[#f5efdf]">
              <Handshake size={20} className="text-[#d6a735] animate-bounce shrink-0" />
              <div>
                <strong className="text-[#d6a735] text-sm">Draw Offered by Opponent!</strong>
                <p className="text-[11px] text-slate-300">
                  Accepting records a draw, awarding equal participation marbles and fair rating.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={acceptDrawOnline}
                disabled={onlineBusy}
                className="px-3 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-lg text-xs shadow-md"
              >
                Accept Draw 🤝
              </button>
              <button
                type="button"
                onClick={declineDrawOnline}
                disabled={onlineBusy}
                className="px-3 py-1.5 bg-[#041c17] hover:bg-[#081c15] text-slate-300 border border-[#184d3c] font-bold rounded-lg text-xs"
              >
                Decline
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full p-2.5 bg-[#0c3b2e]/60 border border-[#d6a735]/40 rounded-xl text-xs flex items-center justify-between gap-2 text-[#f5efdf]">
            <div className="flex items-center gap-2">
              <Handshake size={16} className="text-[#d6a735]" />
              <span>You offered a draw. Waiting for opponent to respond...</span>
            </div>
          </div>
        )
      )}

      {/* Disconnection & 90s Grace Period Alert */}
      {mode === "online" && room?.status === "playing" && room?.timerState && (room.timerState.remainingDisconnectSeconds !== undefined && room.timerState.remainingDisconnectSeconds !== null) && (
        <div className="w-full p-3 bg-amber-950/80 border border-amber-600 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-200">
            <AlertTriangle size={18} className="text-amber-400 animate-pulse shrink-0" />
            <div>
              <strong className="text-amber-300">Opponent Disconnected!</strong>
              <p className="text-[11px] text-amber-100/80">
                {room.timerState.remainingDisconnectSeconds > 0
                  ? `90-second reconnection grace period active (${room.timerState.remainingDisconnectSeconds}s remaining). Turn timer paused.`
                  : "Reconnection grace period expired (90s exceeded). Opponent forfeit eligible."}
              </p>
            </div>
          </div>
          {(room.timerState.remainingDisconnectSeconds <= 0 || room.timerState.timedOut) && (
            <button
              type="button"
              onClick={claimTimeoutOnline}
              disabled={onlineBusy}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs shadow-md animate-pulse"
            >
              Claim Timeout Win 🏆
            </button>
          )}
        </div>
      )}

      {/* Under Administrative Review Banner */}
      {mode === "online" && (room?.status === "under_review" || room?.disputeStatus === "under_review") && (
        <div className="w-full p-3 bg-indigo-950/90 border border-indigo-500/60 rounded-xl text-xs flex items-center gap-2.5 text-indigo-200 shadow-xl">
          <Scale size={20} className="text-indigo-400 shrink-0" />
          <div>
            <strong className="text-indigo-300 text-sm">Match Under Administrative Review</strong>
            <p className="text-[11px] text-indigo-200/80 mt-0.5">
              An administrator is reviewing the move logs, timestamps, and connection records for this match.
            </p>
          </div>
        </div>
      )}

      {/* Sudden Death Blitz Tiebreaker Live Match Banner */}
      {mode === "online" && room && (room.code.startsWith("TB") || room.mode === "league" && room.code.startsWith("TB")) && (
        <div id="sudden-death-tiebreaker-live-banner" className="w-full p-3 bg-gradient-to-r from-amber-950 via-[#0c3b2e] to-amber-950 border-2 border-[#d6a735] rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2 text-[#f5efdf]">
            <Zap size={18} className="text-[#d6a735] animate-bounce shrink-0" />
            <div>
              <strong className="text-[#d6a735] text-xs sm:text-sm font-black uppercase tracking-wider">
                ⚡ Sudden Death Blitz Tiebreaker Match Active
              </strong>
              <p className="text-[11px] text-slate-200 mt-0.5">
                Knockout playoff rule in effect: 30s turn clock with swapped colors to determine bracket winner.
              </p>
            </div>
          </div>
          {room.leagueId && (
            <a
              href={`/leagues/${room.leagueId}`}
              className="px-2.5 py-1 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-[11px] rounded-lg flex items-center gap-1 shadow shrink-0"
            >
              <Trophy size={12} /> Tournament Bracket
            </a>
          )}
        </div>
      )}

      {/* Detached Players Status for Mobile Only */}
      <div className="w-full lg:hidden bg-[#06261f] border border-[#184d3c] rounded-2xl p-2.5 sm:p-3 shadow-xl">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 min-h-[48px]">
          {/* Player 1 Mobile Card */}
          <div
            className={`flex items-center gap-1.5 p-1.5 rounded-xl border transition-all ${
              turn === "white" && !winner
                ? "bg-[#0c3b2e] border-[#d6a735] shadow-md shadow-[#d6a735]/15"
                : "bg-[#0c3b2e]/60 border-[#184d3c] opacity-80"
            }`}
          >
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-100 via-amber-200 to-amber-400 border border-amber-200 shadow-sm flex items-center justify-center text-slate-950 font-black text-xs shrink-0">
              ♔
            </span>
            <div className="min-w-0 flex-1">
              <small className="block text-[8px] font-bold text-[#d6a735] uppercase truncate">Player 1</small>
              <strong className="block text-[11px] font-bold text-[#f5efdf] truncate">{whiteDisplayName}</strong>
            </div>
          </div>

          {/* Turn Timer Mobile Badge */}
          <div className="flex flex-col items-center justify-center px-2">
            <span className="text-[8px] font-bold text-slate-400 uppercase">Turn</span>
            <span className={`font-mono text-xs font-black ${secondsLeft < 10 && turnTimerLimit > 0 ? "text-red-400 animate-pulse" : "text-[#d6a735]"}`}>
              {turnTimerLimit > 0 ? `${secondsLeft}s` : "∞"}
            </span>
          </div>

          {/* Player 2 Mobile Card */}
          <div
            className={`flex items-center gap-1.5 p-1.5 rounded-xl border transition-all ${
              turn === "black" && !winner
                ? "bg-[#0c3b2e] border-emerald-500 shadow-md shadow-emerald-500/15"
                : "bg-[#0c3b2e]/60 border-[#184d3c] opacity-80"
            }`}
          >
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-800 to-emerald-950 border border-emerald-500/60 shadow-sm flex items-center justify-center text-emerald-300 font-black text-xs shrink-0">
              ♚
            </span>
            <div className="min-w-0 flex-1">
              <small className="block text-[8px] font-bold text-emerald-400 uppercase truncate">Player 2</small>
              <strong className="block text-[11px] font-bold text-[#f5efdf] truncate">{blackDisplayName}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Active 10x10 Board Container with Touch Containment & Adaptive Zoom */}
      <div
        className={`w-full p-1.5 sm:p-3 ${activeBoardConfig.wrapBg} border-2 ${activeBoardConfig.wrapBorder} rounded-2xl shadow-2xl relative transition-colors duration-300 board-touch-contain select-none`}
        style={{ touchAction: "none", overscrollBehavior: "none" }}
      >
        {/* King Promotion Event Banner Toast */}
        {promotedKingEffect && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-[11px] sm:text-sm rounded-full shadow-2xl flex items-center gap-1.5 border-2 border-amber-200 animate-in fade-in slide-in-from-top-4 duration-300 max-w-[92%]">
            <Sparkles size={14} className="animate-spin text-slate-950 shrink-0" />
            <span className="truncate">👑 FLYING KING PROMOTED for {promotedKingEffect.player === "white" ? whiteDisplayName : blackDisplayName}!</span>
          </div>
        )}

        {/* Board Top Toolbar: Spectators Pill + Adaptive Zoom Controls */}
        <div className="flex items-center justify-between mb-2 px-1 text-xs select-none">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#041913]/90 border border-[#184d3c] rounded-full text-[10px] sm:text-xs text-slate-300 font-bold shadow-sm">
            <Eye size={12} className="text-emerald-400 animate-pulse" />
            <span className="text-slate-300">
              {mode === "online" ? "ACTIVE SPECTATORS:" : "MODE:"}
            </span>
            <span className="font-mono text-[#d6a735]">
              {mode === "online" ? spectatorCount : (subMode === "vs_cpu" ? "VS CPU" : "LOCAL 2P")}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#06261f] p-1 rounded-lg border border-[#184d3c]">
            {[1, 1.25, 1.5].map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => handleZoomChange(z)}
                className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold rounded-md transition-all ${
                  boardZoom === z
                    ? "bg-[#d6a735] text-[#06261f] shadow-sm"
                    : "text-[#cbd5e1] hover:text-white hover:bg-[#144435]"
                }`}
              >
                {Math.round(z * 100)}%
              </button>
            ))}
          </div>
        </div>

        {/* Viewport for Adaptive Zoomed Board */}
        <div
          className={`w-full rounded pb-1 scrollbar-thin ${
            boardZoom > 1 ? "overflow-x-auto overflow-y-hidden" : "overflow-hidden"
          }`}
          style={{ touchAction: boardZoom > 1 ? "pan-x" : "none", overscrollBehavior: "none" }}
        >
          <div
            className="aspect-square grid grid-cols-10 grid-rows-10 border-2 border-amber-500/50 rounded overflow-hidden shadow-2xl transition-colors duration-200 origin-top-left touch-none select-none"
            style={{
              width: `${boardZoom * 100}%`,
              minWidth: `${boardZoom * 100}%`,
              maxWidth: boardZoom === 1 ? "100%" : undefined,
              display: "grid",
              gridTemplateColumns: "repeat(10, 10%)",
              gridTemplateRows: "repeat(10, 10%)",
              backgroundColor: activeBoardConfig.boardBg,
              touchAction: boardZoom > 1 ? "pan-x" : "none",
              overscrollBehavior: "none",
            }}
            role="grid"
            aria-label="DAMII 10x10 board"
          >
            {orderedSquares.map((square) => {
              const row = rowOf(square);
              const col = colOf(square);
              const playable = (row + col) % 2 === 1;
              const piece = board[square];
              const isDestination = destinations.has(square);
              const isSelectable = selectable.has(square);
              const pieceHasCapture = isSelectable && moves.some((m) => m.from === square && m.captured !== undefined);
              const isLastSource = lastMove?.from === square;
              const isLastTarget = lastMove?.to === square;

              return (
                <button
                  key={square}
                  className={`square relative flex items-center justify-center p-0 border-0 transition-colors select-none touch-none ${
                    selected === square ? "selected" : ""
                  } ${isDestination ? "destination" : ""} ${
                    isLastSource ? "last-move-source" : ""
                  } ${isLastTarget ? "last-move-target" : ""}`}
                  style={{
                    touchAction: "none",
                    backgroundColor: playable
                      ? (row + col) % 4 === 1 || (row + col) % 4 === 3
                        ? activeBoardConfig.playableBg
                        : activeBoardConfig.playableAltBg
                      : activeBoardConfig.restBg,
                  }}
                  onClick={() => handleSquare(square)}
                  disabled={!playable || !!winner}
                  role="gridcell"
                  aria-label={`Square ${square} ${piece ? `${piece.player} ${piece.king ? "king" : "piece"}` : "empty"}`}
                >
                  {/* Capture Burst Animation Effect */}
                  {lastCaptureSquare === square && <span className="capture-burst-ring" />}

                  {/* King Promotion Shimmer Ring */}
                  {promotedKingEffect?.square === square && <span className="king-promotion-effect" />}

                  {piece && (() => {
                    const isMovingPiece = animatePieces && animatedMove && animatedMove.to === square;
                    let slideStyle: React.CSSProperties = {};
                    if (isMovingPiece) {
                      const fromRow = rowOf(animatedMove.from);
                      const fromCol = colOf(animatedMove.from);
                      const toRow = rowOf(square);
                      const toCol = colOf(square);
                      slideStyle = {
                        "--slide-x": fromCol - toCol,
                        "--slide-y": fromRow - toRow,
                      } as React.CSSProperties;
                    }

                    return (
                      <span
                        key={isMovingPiece ? animatedMove.id : square}
                        className={`piece ${piece.player} ${piece.king ? "king" : ""} ${
                          pieceHasCapture ? "can-capture" : isSelectable ? "can-move" : ""
                        } ${isMovingPiece ? "piece-move-sliding" : animatePieces ? "smooth-motion" : ""}`}
                        style={{
                          ...slideStyle,
                          ...(piece.player === "white"
                            ? activeMarbleConfig.whiteStyle
                            : activeMarbleConfig.blackStyle),
                        }}
                      >
                        {piece.king && <span>♛</span>}
                      </span>
                    );
                  })()}
                  {isDestination && <span className="move-dot" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Suggested Move (Training Mode) Pill - EXACTLY matching reference design */}
      <div className="w-full flex flex-col items-center justify-center space-y-1 my-1">
        <button
          type="button"
          onClick={onToggleTrainingIntel}
          className={`px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 transition-all shadow border ${
            showTrainingIntel
              ? "bg-[#d6a735] text-[#06261f] border-[#d6a735] shadow-[#d6a735]/20 ring-2 ring-[#d6a735]/30"
              : "bg-[#06261f] hover:bg-[#0c3b2e] text-[#d6a735] border-[#184d3c]"
          }`}
        >
          <Lightbulb size={12} className={showTrainingIntel ? "text-[#06261f]" : "text-[#d6a735]"} />
          <span>SUGGESTED MOVE (Training Mode)</span>
        </button>

        {showTrainingIntel && (
          <div className="text-[10px] text-slate-300 font-mono flex items-center gap-1 animate-in fade-in">
            <span className="text-slate-400">Hint:</span>
            {suggestedHint ? (
              <span className="text-amber-300 font-bold bg-[#06261f] px-2 py-0.5 rounded border border-[#184d3c]">
                {suggestedHint.algNotation || `sq ${suggestedHint.from} ➔ sq ${suggestedHint.to}`}
                {suggestedHint.isCapture ? " (Capture)" : ""}
              </span>
            ) : (
              <span className="text-slate-500 italic">Analyzing position...</span>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Turn Status & Message Banner */}
      <div className={`w-full flex flex-wrap items-center justify-between p-2 rounded-lg text-xs gap-1.5 transition-all border ${
        secondsLeft < 10 && turnTimerLimit > 0 && !winner && (mode === "local" || room?.status === "playing")
          ? "bg-red-950/60 border-red-500/80 shadow-sm"
          : "bg-[#0c3b2e]/90 border-[#184d3c]"
      }`}>
        <div className="flex items-center gap-1.5 text-[#f5efdf] font-medium min-w-0 flex-1">
          <span className={`turn-dot ${turn} shrink-0`} />
          <span className="truncate font-semibold text-[11px]">{message}</span>
        </div>

        <div className="flex items-center gap-1 px-1.5 py-0.2 bg-[#06261f] border border-[#184d3c] rounded text-[10px] text-[#f5efdf] shrink-0">
          <span className="font-bold text-[#d6a735]">Last:</span>
          <span className="font-mono text-[#f5efdf]">
            {lastMove
              ? `${lastMove.playerName || (lastMove.player === "white" ? "Red" : "Black")}: ${lastMove.from}➔${lastMove.to}`
              : "Start"}
          </span>
        </div>

        {mustCapture && !winner && (
          <span className="px-1.5 py-0.2 bg-red-950 text-red-300 border border-red-800 text-[9px] font-extrabold rounded uppercase tracking-wider shrink-0 animate-pulse">
            Compulsory Capture!
          </span>
        )}
      </div>

      {/* Match Actions Toolbar */}
      <div className="w-full space-y-1">
        <div className="flex items-center justify-between gap-1.5 w-full">
          {/* Secondary Controls Disclosure Toggle */}
          <button
            type="button"
            onClick={() => setShowGameActions((prev) => !prev)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all border ${
              showGameActions
                ? "bg-[#0c3b2e] text-[#d6a735] border-[#d6a735]/60"
                : "bg-[#0c3b2e]/60 hover:bg-[#0c3b2e] text-[#cbd5e1] hover:text-[#f5efdf] border-[#184d3c]"
            }`}
            title="Toggle board tools: Theme, Flip, Rules & Restart"
            aria-expanded={showGameActions}
          >
            <Sliders size={11} className={showGameActions ? "text-[#d6a735]" : "text-slate-400"} />
            <span>Controls</span>
            {showGameActions ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {/* Essential Direct Actions */}
          <div className="flex items-center gap-1 justify-end">
            {mode === "online" && room?.status === "playing" && !winner && (
              <>
                <button
                  type="button"
                  disabled={onlineBusy || Boolean(room?.drawOfferedBy)}
                  onClick={() => void offerDrawOnline()}
                  className="px-2 py-0.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] rounded text-[10px] font-bold flex items-center justify-center gap-0.5 border border-[#184d3c] transition-colors disabled:opacity-50"
                  title="Offer a mutual draw"
                >
                  <Handshake size={11} /> Draw
                </button>

                <button
                  type="button"
                  onClick={() => void forfeitOnline()}
                  className="px-2 py-0.5 bg-red-950/80 hover:bg-red-900 text-red-200 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 border border-red-800 transition-colors"
                >
                  <AlertTriangle size={11} /> Forfeit
                </button>
              </>
            )}

            {winner && (
              <div className="flex items-center gap-1">
                {onOpenSummary && (
                  <button
                    type="button"
                    onClick={onOpenSummary}
                    className="px-2 py-0.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] rounded text-[10px] font-bold flex items-center justify-center gap-0.5 border border-[#184d3c] transition-colors"
                    title="View match conclusion summary"
                  >
                    <Trophy size={11} /> Summary
                  </button>
                )}

                <button
                  type="button"
                  disabled={onlineBusy}
                  onClick={() => void requestRematch()}
                  className="px-2.5 py-1 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] rounded text-[10px] font-extrabold flex items-center justify-center gap-1 transition-all shadow"
                >
                  <RefreshCw size={11} /> Play Again
                </button>

                {onReturnToLobby && (
                  <button
                    type="button"
                    onClick={onReturnToLobby}
                    className="px-2 py-0.5 bg-[#081c15] hover:bg-[#0c3b2e] text-slate-300 hover:text-white rounded text-[10px] font-bold flex items-center justify-center gap-0.5 border border-[#184d3c] transition-colors"
                    title="Return to Arena lobby"
                  >
                    <Gamepad2 size={11} /> Arena
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Secondary Control Drawer */}
        {showGameActions && (
          <div className="w-full bg-[#06261f]/95 border border-[#184d3c] rounded-lg p-1.5 shadow-md flex flex-wrap items-center justify-between gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex flex-wrap items-center gap-1 w-full xs:w-auto">
              <button
                type="button"
                onClick={() => setRotated((v) => !v)}
                className="flex-1 xs:flex-initial px-2 py-0.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] rounded text-[10px] font-semibold flex items-center justify-center gap-0.5 border border-[#184d3c] transition-colors"
                title="Flip board orientation 180°"
              >
                ⇅ Flip
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsTab("themes");
                  setShowSettings(true);
                }}
                className="flex-1 xs:flex-initial px-2 py-0.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] rounded text-[10px] font-semibold flex items-center justify-center gap-0.5 border border-[#184d3c] transition-colors"
                title="Change board and piece themes"
              >
                <Palette size={11} /> Theme
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsTab("rules");
                  setShowSettings(true);
                }}
                className="flex-1 xs:flex-initial px-2 py-0.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] rounded text-[10px] font-semibold flex items-center justify-center gap-0.5 border border-[#184d3c] transition-colors"
                title="View Ghanaian Damii game rules"
              >
                <HelpCircle size={11} /> Rules
              </button>
            </div>

            <div className="flex items-center gap-1 w-full xs:w-auto justify-end">
              {mode === "local" && (
                <button
                  type="button"
                  onClick={resetLocalMatch}
                  className="w-full xs:w-auto px-2 py-0.5 bg-[#d6a735]/15 hover:bg-[#d6a735]/25 text-[#d6a735] rounded text-[10px] font-bold flex items-center justify-center gap-0.5 border border-[#d6a735]/40 transition-colors"
                  title="Restart current match"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              )}

              {mode === "online" && room?.status === "playing" && (
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(true)}
                  className="w-full xs:w-auto px-1.5 py-0.5 bg-[#0c3b2e] hover:bg-[#144435] text-indigo-300 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 border border-[#184d3c] transition-colors"
                  title="Report issue for administrative review"
                >
                  <Scale size={11} /> Dispute
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Tab Switcher (Chat, Move History, Settings) for compact viewports */}
      <div className="w-full lg:hidden pt-3 space-y-2.5">
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#06261f] border border-[#184d3c] rounded-xl">
          <button
            type="button"
            onClick={() => setMobileArenaTab("chat")}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mobileArenaTab === "chat"
                ? "bg-[#d6a735] text-[#06261f] shadow-sm font-black"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <span>💬 Chat</span>
            <span className="text-[10px] opacity-80">({displayChatMessages.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileArenaTab("history")}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mobileArenaTab === "history"
                ? "bg-[#d6a735] text-[#06261f] shadow-sm font-black"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <span>📜 Moves</span>
            <span className="text-[10px] opacity-80">({activeMoves.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileArenaTab("settings")}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mobileArenaTab === "settings"
                ? "bg-[#d6a735] text-[#06261f] shadow-sm font-black"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <span>⚙️ Settings</span>
          </button>
        </div>

        {/* Mobile Tab Content */}
        {mobileArenaTab === "chat" && (
          <LiveMatchChat
            messages={displayChatMessages}
            onSendMessage={handleSendChat}
            sending={sendingChat}
            userRole={mode === "online" && room ? room.role : userRole || "white"}
            currentUsername={currentUsername}
            isMatchFinished={!!winner}
          />
        )}

        {mobileArenaTab === "history" && (
          <div className="w-full bg-[#06261f] border border-[#184d3c] rounded-2xl p-3.5 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#184d3c]">
              <span className="text-xs font-bold text-[#f5efdf]">Match Move History</span>
              <button
                type="button"
                onClick={copyMoveLog}
                disabled={activeMoves.length === 0}
                className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded text-[10px] font-semibold"
              >
                {copiedHistory ? "Copied!" : "Export"}
              </button>
            </div>
            <div className="h-[220px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800 pr-1 text-xs font-mono">
              {pairedMoves.map((pair) => (
                <div key={pair.turnNum} className="grid grid-cols-[28px_1fr_1fr] text-[11px] py-1 border-b border-slate-800/40">
                  <span className="text-slate-500 font-bold">{pair.turnNum}.</span>
                  <span className={pair.white?.isCapture ? "text-amber-300 font-bold" : "text-slate-200"}>
                    {pair.white ? pair.white.notation : "-"}
                  </span>
                  <span className={pair.black?.isCapture ? "text-emerald-400 font-bold" : "text-slate-200"}>
                    {pair.black ? pair.black.notation : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mobileArenaTab === "settings" && (
          <MatchSettingsCard
            boardTheme={boardTheme}
            soundEnabled={soundEnabled}
            rotated={rotated}
            onThemeChange={(t) => saveCustomTheme(t, marbleTheme)}
            onToggleSound={toggleAudioSound}
            onToggleFlip={() => setRotated((v) => !v)}
            onOpenRules={() => {
              setSettingsTab("rules");
              setShowSettings(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

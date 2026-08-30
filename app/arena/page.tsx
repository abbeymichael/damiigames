"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { SharedHeader } from "@/components/SharedHeader";
import { NavLink } from "@/components/NavLink";
import { MatchSummaryModal } from "@/components/MatchSummaryModal";
import { WaitingRoom } from "@/components/WaitingRoom";
import { LiveMatchChat } from "@/components/arena/LiveMatchChat";
import { MatchNavigationCard } from "@/components/arena/MatchNavigationCard";
import { MatchSettingsCard } from "@/components/arena/MatchSettingsCard";
import { GameIntelligenceHub } from "@/components/arena/GameIntelligenceHub";
import { ArenaBoardView } from "@/components/arena/ArenaBoardView";
import {
  applyMove,
  createBoard,
  getBestCpuMove,
  legalMoves,
  playerName,
  rowOf,
  colOf,
  formatMoveNotation,
  squareToAlgebraic,
  squareToDraughtsNum,
  type Board,
  type Move,
  type Player,
} from "@/lib/damii-rules";
import type { MoveLogEntry, Room, League, Profile, Role, ChatMessage } from "@/lib/types";
import { soundService, type SoundSettings } from "@/lib/sound-service";
import { getProfileRank, type RankInfo } from "@/lib/rank-service";
import {
  RotateCcw,
  HelpCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Settings,
  X,
  Copy,
  Check,
  Zap,
  Award,
  Globe,
  Monitor,
  Plus,
  ArrowRight,
  Shield,
  ShieldCheck,
  ListOrdered,
  FileText,
  Target,
  Swords,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  User,
  Bot,
  Play,
  Share2,
  Lock,
  Sparkles,
  UserCheck,
  Trophy,
  Eye,
  Palette,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Handshake,
  Scale,
  ShieldAlert,
  Flame,
  Search,
  Radio,
  Gamepad2,
  Users,
  TrendingUp,
  Sliders,
  MessageSquare,
  Send,
  Lightbulb,
  Activity,
  LayoutGrid,
} from "lucide-react";

type Mode = "local" | "online";
type SubMode = "pass_play" | "vs_cpu";
type RoomMode = "casual" | "wager" | "league";
type BoardThemeKey = "emerald" | "mahogany" | "ebony" | "terracotta" | "sapphire";
type MarbleThemeKey = "classic" | "gemstone" | "metallic" | "neon";

const BOARD_THEME_STYLES: Record<
  BoardThemeKey,
  {
    name: string;
    description: string;
    wrapBg: string;
    wrapBorder: string;
    boardBg: string;
    playableBg: string;
    playableAltBg: string;
    restBg: string;
    previewColors: [string, string];
  }
> = {
  emerald: {
    name: "Emerald Forest",
    description: "Classic velvet green with golden bamboo trim",
    wrapBg: "bg-emerald-950/90",
    wrapBorder: "border-amber-600/50",
    boardBg: "#e9dbb4",
    playableBg: "#184d3c",
    playableAltBg: "#144435",
    restBg: "#eadfbf",
    previewColors: ["#184d3c", "#eadfbf"],
  },
  mahogany: {
    name: "Royal Mahogany",
    description: "Deep mahogany wood grain with warm honey oak rest squares",
    wrapBg: "bg-[#281108]",
    wrapBorder: "border-amber-700/80",
    boardBg: "#d4a373",
    playableBg: "#3b1a0e",
    playableAltBg: "#2d130a",
    restBg: "#e9c46a",
    previewColors: ["#3b1a0e", "#e9c46a"],
  },
  ebony: {
    name: "Obsidian & Ivory",
    description: "High contrast dark slate theme with crisp alabaster squares",
    wrapBg: "bg-slate-950",
    wrapBorder: "border-slate-700",
    boardBg: "#f1f5f9",
    playableBg: "#0f172a",
    playableAltBg: "#020617",
    restBg: "#e2e8f0",
    previewColors: ["#0f172a", "#e2e8f0"],
  },
  terracotta: {
    name: "Terracotta Earth",
    description: "Rich earth-toned clay with warm sunburst yellow",
    wrapBg: "bg-[#421408]",
    wrapBorder: "border-orange-600/80",
    boardBg: "#fef3c7",
    playableBg: "#7c2d12",
    playableAltBg: "#5c200d",
    restBg: "#fde68a",
    previewColors: ["#7c2d12", "#fde68a"],
  },
  sapphire: {
    name: "Royal Sapphire",
    description: "Luxe deep ocean blue grid with silver platinum borders",
    wrapBg: "bg-slate-950",
    wrapBorder: "border-blue-600/80",
    boardBg: "#e0f2fe",
    playableBg: "#1e3a8a",
    playableAltBg: "#1e1b4b",
    restBg: "#bae6fd",
    previewColors: ["#1e3a8a", "#bae6fd"],
  },
};

const MARBLE_THEME_STYLES: Record<
  MarbleThemeKey,
  {
    name: string;
    description: string;
    whiteStyle: React.CSSProperties;
    blackStyle: React.CSSProperties;
  }
> = {
  classic: {
    name: "Classic Ivory & Ebony",
    description: "Traditional carved ivory and polished dark timber marbles",
    whiteStyle: {
      background: "radial-gradient(circle at 34% 25%, #fffef8 0 18%, #e9ddbe 57%, #bba878 100%)",
      borderColor: "#cfbc8a",
      boxShadow: "inset 0 -5px 8px rgba(97,76,32,.26), 0 3px 5px rgba(0,0,0,.28)",
    },
    blackStyle: {
      background: "radial-gradient(circle at 34% 25%, #55766a 0 12%, #153d31 53%, #051c17 100%)",
      borderColor: "#061c17",
      boxShadow: "inset 0 -5px 8px rgba(0,0,0,.5), 0 3px 5px rgba(0,0,0,.3)",
    },
  },
  gemstone: {
    name: "Ruby & Sapphire Gems",
    description: "Radiant glowing red ruby and deep ocean sapphire gemstones",
    whiteStyle: {
      background: "radial-gradient(circle at 34% 25%, #fecdd3 0%, #e11d48 60%, #881337 100%)",
      borderColor: "#fda4af",
      boxShadow: "0 0 12px rgba(225,29,72,0.6), inset 0 -4px 6px rgba(0,0,0,0.4)",
    },
    blackStyle: {
      background: "radial-gradient(circle at 34% 25%, #bae6fd 0%, #0284c7 60%, #0c4a6e 100%)",
      borderColor: "#7dd3fc",
      boxShadow: "0 0 12px rgba(2,132,199,0.6), inset 0 -4px 6px rgba(0,0,0,0.4)",
    },
  },
  metallic: {
    name: "Gold & Chrome Medals",
    description: "Handcrafted metallic gold coin pieces and mirror chrome marbles",
    whiteStyle: {
      background: "radial-gradient(circle at 34% 25%, #fffbeb 0%, #f59e0b 60%, #78350f 100%)",
      borderColor: "#fbbf24",
      boxShadow: "0 0 10px rgba(245,158,11,0.5), inset 0 -4px 6px rgba(120,53,15,0.6)",
    },
    blackStyle: {
      background: "radial-gradient(circle at 34% 25%, #f8fafc 0%, #64748b 60%, #0f172a 100%)",
      borderColor: "#94a3b8",
      boxShadow: "0 0 10px rgba(100,116,139,0.5), inset 0 -4px 6px rgba(15,23,42,0.8)",
    },
  },
  neon: {
    name: "Cyber Cyan & Magenta",
    description: "Futuristic neon arcade marbles with vivid luminescent halos",
    whiteStyle: {
      background: "radial-gradient(circle at 34% 25%, #ecfeff 0%, #06b6d4 60%, #164e63 100%)",
      borderColor: "#22d3ee",
      boxShadow: "0 0 14px rgba(34,211,238,0.8), inset 0 -4px 6px rgba(0,0,0,0.5)",
    },
    blackStyle: {
      background: "radial-gradient(circle at 34% 25%, #fdf2f8 0%, #d946ef 60%, #701a75 100%)",
      borderColor: "#f0abfc",
      boxShadow: "0 0 14px rgba(240,171,252,0.8), inset 0 -4px 6px rgba(0,0,0,0.5)",
    },
  },
};

type LobbyPlayer = Partial<Profile> & {
  username: string;
  rating: number;
  marbles?: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  role?: Role;
  status?: "active" | "suspended" | "banned";
  rank?: RankInfo;
  isOnline?: boolean;
  presenceStatus?: "online" | "in_match" | "offline";
  lastSeenAt?: string;
};

export default function ArenaPage() {
  const [mode, setMode] = useState<Mode>("local");
  const [subMode, setSubMode] = useState<SubMode>("pass_play");
  const [roomMode, setRoomMode] = useState<RoomMode>("casual");
  const [wagerInput, setWagerInput] = useState<number>(20);
  const [challengeTargetUser, setChallengeTargetUser] = useState<string>("");
  const [isPrivateRoom, setIsPrivateRoom] = useState<boolean>(false);
  const [challengeToAccept, setChallengeToAccept] = useState<Room | null>(null);

  // Dynamic Player Names
  const [localWhiteName, setLocalWhiteName] = useState<string>("Kwame (Player 1)");
  const [localBlackName, setLocalBlackName] = useState<string>("Ama (Player 2)");
  const [cpuDifficulty, setCpuDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [turnTimerLimit, setTurnTimerLimit] = useState<number>(60);
  const [isCpuThinking, setIsCpuThinking] = useState(false);

  const [board, setBoard] = useState<Board>(() => createBoard());
  const [turn, setTurn] = useState<Player>("white");
  const [selected, setSelected] = useState<number | null>(null);
  const [forcedFrom, setForcedFrom] = useState<number | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const [message, setMessage] = useState("Setup your match to start playing!");
  const [rotated, setRotated] = useState(false);
  const [localMoves, setLocalMoves] = useState<MoveLogEntry[]>([]);
  const [localGameStarted, setLocalGameStarted] = useState(false);

  // Dynamically compute captures (takes) directly from the board state for 100% sync in both online and local modes
  const captures = useMemo<Record<Player, number>>(() => {
    let whiteCount = 0;
    let blackCount = 0;
    for (let i = 0; i < board.length; i++) {
      const piece = board[i];
      if (piece?.player === "white") whiteCount++;
      else if (piece?.player === "black") blackCount++;
    }
    return {
      white: Math.max(0, 20 - blackCount),
      black: Math.max(0, 20 - whiteCount),
    };
  }, [board]);

  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [onlineBusy, setOnlineBusy] = useState(false);
  const [onlineError, setOnlineError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(60);

  // UI Modals & Drawers
  const [showPregameModal, setShowPregameModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTrainingIntel, setShowTrainingIntel] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"themes" | "audio" | "rules" | "display">("themes");
  const [showHistory, setShowHistory] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showMatchSummaryModal, setShowMatchSummaryModal] = useState(false);
  const hasShownSummaryForMatchRef = useRef<string | null>(null);
  const [disputeNotesInput, setDisputeNotesInput] = useState("");

  // Arena Lobby & Hub State
  const [lobbyRooms, setLobbyRooms] = useState<Room[]>([]);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [lobbyLeagues, setLobbyLeagues] = useState<League[]>([]);
  const [lobbyLoading, setLobbyLoading] = useState(true);
  const [lobbyTab, setLobbyTab] = useState<"live" | "players" | "tournaments">("live");
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");

  // Audio & Event Effects Customization
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(() => soundService.getSettings());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundService.isEnabled());
  const [lastCaptureSquare, setLastCaptureSquare] = useState<number | null>(null);
  const [promotedKingEffect, setPromotedKingEffect] = useState<{ square: number; player: Player } | null>(null);
  const [animatedMove, setAnimatedMove] = useState<{ from: number; to: number; id: number } | null>(null);

  function toggleSoundCat(category: keyof SoundSettings) {
    const updated = soundService.toggleCategory(category);
    setSoundSettings(updated);
    setSoundEnabled(updated.master);
  }

  // Per Player Device Customization
  const [boardTheme, setBoardTheme] = useState<BoardThemeKey>("emerald");
  const [marbleTheme, setMarbleTheme] = useState<MarbleThemeKey>("classic");
  const [animatePieces, setAnimatePieces] = useState<boolean>(true);
  const [boardZoom, setBoardZoom] = useState<number>(1);

  function handleZoomChange(nextZoom: number) {
    setBoardZoom(nextZoom);
    localStorage.setItem("damii-board-zoom", String(nextZoom));
  }

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHistory, setCopiedHistory] = useState(false);
  const [copiedShareResult, setCopiedShareResult] = useState(false);
  const [notationStyle, setNotationStyle] = useState<"alg" | "sq" | "both">("alg");
  const [mobileArenaTab, setMobileArenaTab] = useState<"chat" | "history" | "settings">("chat");

  const activeBoardConfig = BOARD_THEME_STYLES[boardTheme] || BOARD_THEME_STYLES.emerald;
  const activeMarbleConfig = MARBLE_THEME_STYLES[marbleTheme] || MARBLE_THEME_STYLES.classic;

  function saveCustomTheme(bKey: BoardThemeKey, mKey: MarbleThemeKey) {
    setBoardTheme(bKey);
    setMarbleTheme(mKey);
    localStorage.setItem("damii-board-theme", bKey);
    localStorage.setItem("damii-marble-theme", mKey);
  }

  function togglePieceAnimation(enabled: boolean) {
    setAnimatePieces(enabled);
    localStorage.setItem("damii-animate-pieces", enabled ? "true" : "false");
  }

  const historyScrollRef = useRef<HTMLDivElement>(null);
  const lastProcessedRoomCodeRef = useRef<string>("");
  const lastProcessedMoveCountRef = useRef<number>(-1);
  const lastKnownGuestTokenRef = useRef<string | null>(null);

  const [focusMode, setFocusMode] = useState(false);
  const [showGameActions, setShowGameActions] = useState(false);

  // Live Chat & Training Hub State
  const [chatInput, setChatInput] = useState("");
  const [localChat, setLocalChat] = useState<ChatMessage[]>(() => [
    {
      id: "init-1",
      sender: "System",
      senderRole: "system",
      text: "Ghanaian Damii Arena active. Compulsory multi-jump capture rule in effect.",
      timestamp: Date.now(),
    },
  ]);
  const [sendingChat, setSendingChat] = useState(false);
  const [showHistoryCollapsed, setShowHistoryCollapsed] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const activeMoves = useMemo(
    () => (mode === "online" ? room?.moves ?? [] : localMoves),
    [mode, room?.moves, localMoves]
  );

  const lastMove = useMemo(() => {
    if (mode === "online") {
      if (room?.moves && room.moves.length > 0) {
        const last = room.moves[room.moves.length - 1];
        if (last.from !== undefined && last.to !== undefined) {
          return {
            from: last.from,
            to: last.to,
            player: last.player,
            playerName: last.playerName,
            isCapture: last.isCapture,
            notation: last.notation,
            sqNotation: last.sqNotation,
          };
        }
      }
      return null;
    }
    if (localMoves.length > 0) {
      const last = localMoves[localMoves.length - 1];
      return {
        from: last.from,
        to: last.to,
        player: last.player,
        playerName: last.playerName,
        isCapture: last.isCapture,
        notation: last.notation,
        sqNotation: last.sqNotation,
      };
    }
    return null;
  }, [mode, room?.moves, localMoves]);

  const isMatchActive = useMemo(() => {
    if (winner) return false;
    if (mode === "online") {
      return room?.status === "active" || (room?.moves && room.moves.length > 0);
    }
    return localMoves.length > 0;
  }, [winner, mode, room?.status, room?.moves, localMoves.length]);

  const hasActiveGame = useMemo(() => {
    if (mode === "online" && room) return true;
    if (mode === "local" && (localGameStarted || localMoves.length > 0 || winner)) return true;
    return false;
  }, [mode, room, localGameStarted, localMoves.length, winner]);

  // Live Win Probability Meter Calculation
  const winProbability = useMemo(() => {
    if (winner === "white") return { whiteProb: 100, blackProb: 0 };
    if (winner === "black") return { whiteProb: 0, blackProb: 100 };
    if (winner === "draw") return { whiteProb: 50, blackProb: 50 };

    const whitePieces = 20 - (captures?.black ?? 0);
    const blackPieces = 20 - (captures?.white ?? 0);
    const total = Math.max(1, whitePieces + blackPieces);
    let whiteProb = Math.round((whitePieces / total) * 100);
    // slight bias towards active turn
    if (turn === "white") whiteProb = Math.min(95, whiteProb + 2);
    else whiteProb = Math.max(5, whiteProb - 2);
    const blackProb = 100 - whiteProb;
    return { whiteProb, blackProb };
  }, [captures?.white, captures?.black, winner, turn]);

  const activeRuleVariations = useMemo(() => {
    if (mode === "online" && room?.ruleVariations) return room.ruleVariations;
    return undefined;
  }, [mode, room?.ruleVariations]);

  const moves = useMemo(
    () => (winner ? [] : legalMoves(board, turn, forcedFrom, activeRuleVariations)),
    [board, turn, forcedFrom, winner, activeRuleVariations]
  );

  const selectable = useMemo(() => {
    const allowed = new Set(moves.map((move) => move.from));
    if (mode === "online" && room?.role !== turn) return new Set<number>();
    if (mode === "local" && subMode === "vs_cpu" && turn === "black") return new Set<number>();
    return allowed;
  }, [moves, mode, room?.role, turn, subMode]);

  const destinations = useMemo(
    () =>
      new Map(
        moves
          .filter((move) => move.from === selected)
          .map((move) => [move.to, move])
      ),
    [moves, selected]
  );

  // Live Tactical Intel / Suggested Training Move
  const suggestedHint = useMemo(() => {
    if (winner || moves.length === 0) return null;
    try {
      const best = getBestCpuMove(board, turn, forcedFrom, "medium", activeRuleVariations);
      if (!best) return null;
      const formatted = formatMoveNotation(best.from, best.to, best.isCapture);
      return {
        from: best.from,
        to: best.to,
        notation: formatted.notation,
        algNotation: formatted.algNotation,
        sqNotation: formatted.sqNotation,
        isCapture: best.isCapture,
      };
    } catch {
      return null;
    }
  }, [board, turn, forcedFrom, activeRuleVariations, moves.length, winner]);

  // Chat message selector
  const displayChatMessages = useMemo(() => {
    if (mode === "online" && room?.chat && room.chat.length > 0) {
      return room.chat;
    }
    return localChat;
  }, [mode, room?.chat, localChat]);

  // Auto-scroll chat on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [displayChatMessages]);

  // Send Chat Handler (Online API + Local / Bot responses)
  async function handleSendChat(customText?: string) {
    const textToSend = (customText || chatInput).trim();
    if (!textToSend) return;

    if (mode === "online" && room && token) {
      setSendingChat(true);
      try {
        const res = await fetch("/api/damii", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "chat",
            code: room.code,
            token,
            username: profile?.username || user?.username || "Player",
            text: textToSend,
          }),
        });
        const data = await res.json();
        if (data.room) {
          loadRoom(data.room);
        }
      } catch {
        // offline fallback
      } finally {
        setSendingChat(false);
        setChatInput("");
      }
    } else {
      // Local / vs CPU game chat
      const playerMsg: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: turn === "white" ? whiteDisplayName : blackDisplayName,
        senderRole: turn === "white" ? "white" : "black",
        text: textToSend,
        timestamp: Date.now(),
      };
      setLocalChat((prev) => [...prev.slice(-40), playerMsg]);
      setChatInput("");

      if (subMode === "vs_cpu") {
        setTimeout(() => {
          const botReplies = [
            "Good move! Let's see your defense.",
            "Analyzing board combinations...",
            "Defending the king row!",
            "Well played!",
            "Ghanaian Damii masters never blink 😎",
            "Careful with that exposed marble!",
            "Let's see if you can handle this counter-attack!",
            "Good game!",
          ];
          const randomReply = botReplies[Math.floor(Math.random() * botReplies.length)];
          const botMsg: ChatMessage = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sender: "Damii Bot",
            senderRole: "black",
            text: randomReply,
            timestamp: Date.now(),
          };
          setLocalChat((prev) => [...prev.slice(-40), botMsg]);
        }, 800);
      }
    }
  }

  function startBotMatch(difficulty: "easy" | "medium" | "hard" = cpuDifficulty) {
    if ((difficulty === "medium" || difficulty === "hard") && (!token || !profile)) {
      window.dispatchEvent(new CustomEvent("damii-open-auth"));
      setMessage(`🔒 ${difficulty === "medium" ? "Tactical AI" : "Grandmaster"} requires a registered player account. Please sign in or create an account.`);
      return;
    }
    setCpuDifficulty(difficulty);
    setMode("local");
    setSubMode("vs_cpu");
    setRoom(null);
    setLocalGameStarted(true);
    resetLocalMatch();
    setShowPregameModal(false);
    setShowSettings(false);
  }

  function startLocalPassAndPlay() {
    setMode("local");
    setSubMode("pass_play");
    setRoom(null);
    setLocalGameStarted(true);
    resetLocalMatch();
    setShowPregameModal(false);
    setShowSettings(false);
  }

  const toggleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("damii-focus-mode", next ? "true" : "false");
      window.dispatchEvent(new CustomEvent("damii-focus-mode-change", { detail: next }));
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("damii-active-match", isMatchActive ? "true" : "false");
      window.dispatchEvent(new CustomEvent("damii-match-active-change", { detail: isMatchActive }));
    }
  }, [isMatchActive]);

  useEffect(() => {
    if (!isMatchActive) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Active 1-on-1 match in progress! Leaving will exit your match.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isMatchActive]);

  // Auto-trigger Match Summary Modal when a match concludes
  useEffect(() => {
    const isMatchEnded = Boolean(
      winner ||
      (mode === "online" && (room?.status === "completed" || room?.status === "draw" || !!room?.winner))
    );

    if (isMatchEnded) {
      const matchKey =
        mode === "online" && room
          ? `${room.code}-${room.moveCount}-${room.winner || room.status}`
          : `local-${localMoves.length}-${winner}`;
      if (hasShownSummaryForMatchRef.current !== matchKey) {
        hasShownSummaryForMatchRef.current = matchKey;
        setShowMatchSummaryModal(true);
      }
    } else {
      hasShownSummaryForMatchRef.current = null;
      setShowMatchSummaryModal(false);
    }
  }, [winner, mode, room?.status, room?.winner, room?.code, room?.moveCount, localMoves.length]);

  // Initialize Token & User Profile
  useEffect(() => {
    const syncArenaAuth = () => {
      const savedToken = localStorage.getItem("damii-player-token");
      setToken(savedToken || "");

      const rawAuth = localStorage.getItem("damii-auth-user");
      let storedRole: string | undefined;
      if (rawAuth) {
        try {
          const parsed = JSON.parse(rawAuth);
          if (parsed?.role) {
            storedRole = parsed.role;
          }
        } catch {}
      }

      const savedName = localStorage.getItem("damii-player-name") ?? "";
      if (savedName) {
        setUsername(savedName);
        setLocalWhiteName(savedName);
      } else {
        setUsername("");
      }

      if (storedRole) {
        setProfile((prev) =>
          prev
            ? { ...prev, role: storedRole }
            : { username: savedName, rating: 1000, points: 0, wins: 0, losses: 0, draws: 0, role: storedRole }
        );
      }

      if (savedToken) {
        fetch(`/api/wallet?token=${encodeURIComponent(savedToken)}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.balance) {
              setProfile(d.balance);
              if (!savedName && d.balance.username) {
                setUsername(d.balance.username);
                setLocalWhiteName(d.balance.username);
              }
            } else {
              setProfile(null);
            }
          })
          .catch(() => setProfile(null));
      } else {
        setProfile(null);
      }
    };

    syncArenaAuth();

    window.addEventListener("damii-auth-changed", syncArenaAuth);

    const savedBoardTheme = localStorage.getItem("damii-board-theme") as BoardThemeKey | null;
    if (savedBoardTheme && BOARD_THEME_STYLES[savedBoardTheme]) {
      setBoardTheme(savedBoardTheme);
    }

    const savedMarbleTheme = localStorage.getItem("damii-marble-theme") as MarbleThemeKey | null;
    if (savedMarbleTheme && MARBLE_THEME_STYLES[savedMarbleTheme]) {
      setMarbleTheme(savedMarbleTheme);
    }

    const savedAnimatePieces = localStorage.getItem("damii-animate-pieces");
    if (savedAnimatePieces !== null) {
      setAnimatePieces(savedAnimatePieces === "true");
    }

    const savedZoom = localStorage.getItem("damii-board-zoom");
    if (savedZoom) {
      const parsed = parseFloat(savedZoom);
      if ([1, 1.25, 1.5, 1.75].includes(parsed)) {
        setBoardZoom(parsed);
      }
    }

    // Check URL search params or path structure for direct 1-on-1 invite, room landing link, or vs bot
    if (typeof window !== "undefined") {
      const currentAuthToken = localStorage.getItem("damii-player-token") || "";
      const params = new URLSearchParams(window.location.search);
      let roomParam = params.get("room") || params.get("code");

      // Support path-based room routes such as /arena/room/ABC12345 or /room/ABC12345
      if (!roomParam) {
        const pathMatches = window.location.pathname.match(/\/(?:arena\/)?room\/([a-zA-Z0-9]+)/i);
        if (pathMatches && pathMatches[1]) {
          roomParam = pathMatches[1];
        }
      }

      // If user refreshed during an active online match without query params, restore from session storage
      if (!roomParam && !params.get("mode")) {
        const savedRoom = sessionStorage.getItem("damii_active_room");
        if (savedRoom) {
          roomParam = savedRoom;
        }
      }

      const joinParam = params.get("join");
      const botParam = params.get("bot");
      const modeParam = params.get("mode");
      if (roomParam) {
        const targetCode = roomParam.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
        setJoinCode(targetCode);
        setMode("online");
        fetch(`/api/damii?code=${encodeURIComponent(targetCode)}&token=${encodeURIComponent(currentAuthToken)}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.room && d.room.status !== "cancelled" && d.room.status !== "completed" && !d.room.winner) {
              loadRoom(d.room);
            } else {
              sessionStorage.removeItem("damii_active_room");
              localStorage.removeItem("damii_hosted_room");
              if (window.location.search.includes("room=") || window.location.search.includes("code=")) {
                window.history.replaceState({}, "", "/arena");
              }
              setRoom(null);
              setMode("local");
              setShowPregameModal(false);
            }
          })
          .catch(() => {
            sessionStorage.removeItem("damii_active_room");
            localStorage.removeItem("damii_hosted_room");
            if (window.location.search.includes("room=") || window.location.search.includes("code=")) {
              window.history.replaceState({}, "", "/arena");
            }
            setRoom(null);
            setMode("local");
            setShowPregameModal(false);
          });
      } else if (joinParam) {
        setJoinCode(joinParam.toUpperCase());
        setMode("online");
        setShowPregameModal(true);
      } else if (botParam === "1" || botParam === "true" || modeParam === "vs_cpu" || modeParam === "bot") {
        setMode("local");
        setSubMode("vs_cpu");
        setShowPregameModal(true);
      } else if (modeParam === "local" || modeParam === "pass_play") {
        setMode("local");
        setSubMode("pass_play");
        setShowPregameModal(true);
      }
    }

    return () => {
      window.removeEventListener("damii-auth-changed", syncArenaAuth);
    };
  }, []);

  // Prevent indiscriminate pinch-zoom, double-tap zoom, and layout scaling shifts on mobile during gameplay
  useEffect(() => {
    const handleGesture = (e: Event) => {
      e.preventDefault();
    };

    let lastTapTime = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      const target = e.target as HTMLElement | null;
      if (target && target.closest(".board-touch-contain, .square, .piece, .board-wrap")) {
        if (now - lastTapTime <= 320) {
          // Prevent synthetic double-tap zoom on board elements
          e.preventDefault();
        }
      }
      lastTapTime = now;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        const target = e.target as HTMLElement | null;
        if (target && target.closest(".board-touch-contain, .board-wrap")) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener("gesturestart", handleGesture, { passive: false });
    document.addEventListener("gesturechange", handleGesture, { passive: false });
    document.addEventListener("gestureend", handleGesture, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", handleGesture);
      document.removeEventListener("gesturechange", handleGesture);
      document.removeEventListener("gestureend", handleGesture);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  // Poll lobby data when in Lobby view (no active game/room)
  useEffect(() => {
    const fetchLobbyData = async () => {
      try {
        const queryParams = new URLSearchParams({ lobby: "1" });
        if (token) queryParams.set("token", token);
        if (username) queryParams.set("username", username);

        const res = await fetch(`/api/damii?${queryParams.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.activeRooms) {
          const liveOnly = (data.activeRooms as Room[]).filter(
            (r) => !r.winner && (r.status === "playing" || r.status === "waiting")
          );
          setLobbyRooms(liveOnly);
        }
        if (data.leaderboard) {
          const nonPlayerRoles = new Set(["admin", "super_admin", "organizer", "facilitator", "treasurer"]);
          const mapped: LobbyPlayer[] = (data.leaderboard as LobbyPlayer[])
            .filter((p) => !nonPlayerRoles.has(p.role || "") && p.status !== "banned")
            .map((p) => ({
              ...p,
              rank: getProfileRank(p),
            }));
          setLobbyPlayers(mapped);
        }
        if (data.leagues) setLobbyLeagues(data.leagues);
      } catch {
        /* Ignore transient lobby fetch failures */
      } finally {
        setLobbyLoading(false);
      }
    };

    fetchLobbyData();
    const interval = window.setInterval(fetchLobbyData, 2500);
    return () => window.clearInterval(interval);
  }, [token, username]);

  function handleDirectChallenge(targetUsername: string, challengeType: "casual" | "wager" = "casual") {
    if (!token) {
      window.dispatchEvent(new CustomEvent("damii-open-auth"));
      setOnlineError("Please sign in or register to challenge " + targetUsername);
      return;
    }
    if (profile?.role === "admin" || profile?.role === "super_admin") {
      setOnlineError("Admin accounts cannot participate in player matches.");
      return;
    }
    setChallengeTargetUser(targetUsername);
    setMode("online");
    setRoomMode(challengeType);
    setShowPregameModal(true);
  }

  // Poll online room state when in online mode or when hosting a room
  useEffect(() => {
    const targetCode =
      room?.code || (typeof window !== "undefined" ? localStorage.getItem("damii_hosted_room") : null);
    if (!targetCode) return;
    const update = async () => {
      try {
        const response = await fetch(
          `/api/damii?code=${encodeURIComponent(targetCode)}&token=${encodeURIComponent(token || "")}`
        );
        if (!response.ok) return;
        const data = await response.json();
        if (data.room) {
          if (data.room.status === "cancelled") {
            if (typeof window !== "undefined") {
              localStorage.removeItem("damii_hosted_room");
              sessionStorage.removeItem("damii_active_room");
              if (window.location.search.includes("room=") || window.location.search.includes("code=")) {
                window.history.replaceState({}, "", "/arena");
              }
            }
            setRoom(null);
            setMode("local");
            setMessage("This match room was cancelled by the host.");
            return;
          }
          loadRoom(data.room);
        }
      } catch {
        /* Retain last confirmed state */
      }
    };
    const timer = window.setInterval(update, 800);
    return () => window.clearInterval(timer);
  }, [mode, room?.code, token]);

  const whiteDisplayName = useMemo(() => {
    if (mode === "online" && room) return room.hostName;
    return localWhiteName.trim() || "Player 1";
  }, [mode, room, localWhiteName]);

  const blackDisplayName = useMemo(() => {
    if (mode === "online" && room) return room.guestName ?? "Waiting for Opponent…";
    if (subMode === "vs_cpu") return `DAMII Bot (${cpuDifficulty})`;
    return localBlackName.trim() || "Player 2";
  }, [mode, room, subMode, cpuDifficulty, localBlackName]);

  const currentTurnPlayerName = turn === "white" ? whiteDisplayName : blackDisplayName;
  const isSpectator = useMemo(() => mode === "online" && room !== null && room.role === "spectator", [mode, room]);

  // Turn timer countdown
  useEffect(() => {
    if (mode === "online" && room?.timerState?.remainingTurnSeconds !== undefined && room.timerState.remainingTurnSeconds !== null) {
      setSecondsLeft(room.timerState.remainingTurnSeconds);
    } else {
      setSecondsLeft(turnTimerLimit > 0 ? turnTimerLimit : 60);
    }
  }, [turn, room?.moveCount, mode, turnTimerLimit, localGameStarted]);

  useEffect(() => {
    // Only run the countdown timer if an actual match is actively in progress
    const isOnlinePlaying = mode === "online" && room !== null && room.status === "playing" && !room.winner && !winner;
    const isLocalPlaying = mode === "local" && localGameStarted && !winner;

    if ((!isOnlinePlaying && !isLocalPlaying) || turnTimerLimit === 0) {
      return;
    }

    // Determine if audio tick / reminder should be allowed for THIS specific client:
    // - In local mode: user is actively playing on device -> sound allowed
    // - In online mode: ONLY when it is THIS player's turn (not spectator, not opponent's turn)
    const isMyTurn = mode === "local" || (mode === "online" && room !== null && room.role === room.turn);

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        const next = current > 0 ? current - 1 : 0;
        if (isMyTurn) {
          if (next < 10 && next > 0) {
            soundService.playUrgentTick(next);
          }
          if (next === 9) {
            soundService.playTurnReminder();
          }
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode, localGameStarted, room?.status, room?.winner, room?.role, room?.turn, winner, turn, turnTimerLimit]);

  // Auto CPU move trigger for simulation mode
  useEffect(() => {
    if (mode !== "local" || subMode !== "vs_cpu" || winner) {
      setIsCpuThinking(false);
      return;
    }
    if (turn === "black") {
      setIsCpuThinking(true);
      const timer = setTimeout(() => {
        const cpuMove = getBestCpuMove(board, turn, forcedFrom, cpuDifficulty);
        if (cpuMove) {
          playLocal(cpuMove);
        } else {
          setMessage(`🏆 Game Over! ${whiteDisplayName} wins as ${blackDisplayName} has no legal moves.`);
          setWinner("white");
        }
        setIsCpuThinking(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsCpuThinking(false);
    }
  }, [mode, subMode, turn, winner, board, forcedFrom, cpuDifficulty, whiteDisplayName, blackDisplayName]);

  // Auto-scroll move history drawer
  useEffect(() => {
    if (historyScrollRef.current) {
      historyScrollRef.current.scrollTop = historyScrollRef.current.scrollHeight;
    }
  }, [activeMoves.length]);

  function loadRoom(next: Room) {
    // Detect opponent join event: Trigger sound and transition to game screen
    const isHost = next.role === "white" || next.hostName === username;
    const previouslyNoGuest = !lastKnownGuestTokenRef.current;
    const nowHasGuest = Boolean(next.guestToken || next.guestName);

    if (isHost && previouslyNoGuest && nowHasGuest) {
      soundService.playOpponentJoined();
      setMode("online");
      setLocalGameStarted(false);
      setShowPregameModal(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem("damii_hosted_room");
      }
    }
    lastKnownGuestTokenRef.current = next.guestToken || null;

    // Sound & Event Animation Triggers for Online Room Updates
    const isNewRoom = lastProcessedRoomCodeRef.current !== next.code;
    const prevMoveCount = isNewRoom ? -1 : lastProcessedMoveCountRef.current;
    const newMoveCount = next.moveCount;
    const moveCountChanged = isNewRoom || newMoveCount !== prevMoveCount;

    lastProcessedRoomCodeRef.current = next.code;
    lastProcessedMoveCountRef.current = newMoveCount;

    if (!isNewRoom && prevMoveCount >= 0 && newMoveCount > prevMoveCount) {
      if (next.winner) {
        soundService.playVictory();
      } else if (next.forcedFrom !== null) {
        soundService.playMultiJump();
      } else {
        const lastMove = next.moves && next.moves.length > 0 ? next.moves[next.moves.length - 1] : null;
        if (lastMove && lastMove.from !== undefined && lastMove.to !== undefined && animatePieces) {
          setAnimatedMove({ from: lastMove.from, to: lastMove.to, id: Date.now() });
          setTimeout(() => setAnimatedMove(null), 360);
        }
        if (lastMove?.isCapture) {
          soundService.playCapture();
          if (lastMove.to !== undefined) {
            setLastCaptureSquare(lastMove.to);
            setTimeout(() => setLastCaptureSquare(null), 800);
          }
        } else {
          soundService.playMove();
        }
      }
    }

    setRoom(next);

    if (typeof window !== "undefined" && next?.code) {
      sessionStorage.setItem("damii_active_room", next.code);
      const targetQuery = `/arena?room=${next.code}`;
      if (window.location.pathname + window.location.search !== targetQuery && !window.location.pathname.startsWith(`/arena/room/${next.code}`)) {
        window.history.replaceState({ roomCode: next.code }, "", targetQuery);
      }
    }

    // Only overwrite board and turn if there is a new room or a move has landed on the server
    if (moveCountChanged) {
      setBoard(next.board);
      setTurn(next.turn);
      setForcedFrom(next.forcedFrom);
      setWinner(next.winner);

      // Auto-select piece if in the middle of a compulsory multi-jump sequence on your turn
      if (next.forcedFrom !== null && next.role === next.turn) {
        setSelected(next.forcedFrom);
      } else {
        setSelected(null);
      }
    } else {
      // Idle polling tick with no new moves:
      // Update winner / forcedFrom / status in case of resignation/timeout/draw
      if (next.winner !== winner) setWinner(next.winner);
      if (next.forcedFrom !== forcedFrom) setForcedFrom(next.forcedFrom);
      // PRESERVE `selected` so the player's active piece selection and destination highlights are never disrupted by polling!
    }

    if (next.timerState?.remainingTurnSeconds !== undefined && next.timerState.remainingTurnSeconds !== null) {
      setSecondsLeft(next.timerState.remainingTurnSeconds);
    }
    if (next.status === "waiting") {
      if (next.guestName) {
        if (next.role === "white") {
          setMessage(`⚔️ Challenger ${next.guestName} connected & ready! Press "Ready — Start Match" to begin.`);
        } else {
          setMessage(`⚔️ Connected to ${next.hostName}'s room! Marked ready, waiting for host to start...`);
        }
      } else {
        setMessage(`Room ${next.code} (${next.isPrivate ? "Private" : "Public"}) open! Waiting for opponent to accept...`);
      }
    } else if (next.winner) {
      const wName = next.winner === "white" ? next.hostName : next.guestName ?? "Guest";
      setMessage(`🏆 Game Over! ${wName} (${playerName(next.winner)}) wins!`);
    } else if (moveCountChanged) {
      if (next.role === next.turn)
        setMessage(`🎯 Your turn to move as ${next.role === "white" ? next.hostName : next.guestName}!`);
      else setMessage(`⏳ Waiting for ${next.turn === "white" ? next.hostName : next.guestName} to move...`);
    }
  }

  const handleReturnToArenaLobby = useCallback(() => {
    setShowMatchSummaryModal(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("damii_hosted_room");
      sessionStorage.removeItem("damii_active_room");
      if (window.location.search.includes("room=") || window.location.search.includes("code=")) {
        window.history.replaceState({}, "", "/arena");
      }
    }
    setRoom(null);
    setMode("local");
    setWinner(null);
    setLocalMoves([]);
    setLocalGameStarted(false);
    setSelected(null);
    setForcedFrom(null);
    setBoard(createBoard());
    setTurn("white");
    setIsCpuThinking(false);
    setLastCaptureSquare(null);
    setPromotedKingEffect(null);
    setMessage("Setup your match to start playing!");
    hasShownSummaryForMatchRef.current = null;
  }, []);

  function resetLocalMatch() {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("damii_active_room");
      if (window.location.search.includes("room=")) {
        window.history.replaceState({}, "", "/arena");
      }
    }
    setBoard(createBoard());
    setTurn("white");
    setSelected(null);
    setForcedFrom(null);
    setWinner(null);
    setLocalMoves([]);
    setIsCpuThinking(false);
    setLastCaptureSquare(null);
    setPromotedKingEffect(null);
    const firstPlayer = localWhiteName.trim() || "Player 1";
    setMessage(`🎯 Match started! ${firstPlayer}'s turn to move (Player 1).`);
  }

  async function handleSaveLoginProfile(nameToSave: string) {
    if (!nameToSave.trim()) return;
    localStorage.setItem("damii-player-name", nameToSave.trim());
    setUsername(nameToSave.trim());
    setLocalWhiteName(nameToSave.trim());
    window.dispatchEvent(new CustomEvent("damii-open-auth"));
  }

  async function onlineAction(action: string, extra: Record<string, unknown> = {}) {
    if (!token) {
      window.dispatchEvent(new CustomEvent("damii-open-auth"));
      setOnlineError("Authentication Required: Please sign in or register an account to create or join 1-on-1 matches.");
      return null;
    }
    if (profile?.role === "admin" || profile?.role === "super_admin") {
      setOnlineError("Administrator accounts serve as league facilitators and regulators. Admin accounts cannot participate as players or host matches.");
      return null;
    }
    setOnlineBusy(true);
    setOnlineError("");
    try {
      localStorage.setItem("damii-player-name", username.trim());
      const response = await fetch("/api/damii", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action, token, username: username.trim(), ...extra }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to complete action");
      if (data.profile) setProfile(data.profile);
      if (data.room) {
        if (action === "create") {
          localStorage.setItem("damii_hosted_room", data.room.code);
          sessionStorage.setItem("damii_active_room", data.room.code);
        }
        loadRoom(data.room);
        if (action === "create" || action === "join") {
          setShowPregameModal(false);
          setShowSettings(false);
          // If a challenge target was specified, dispatch challenge notification with direct room link
          if (action === "create" && challengeTargetUser.trim()) {
            fetch("/api/notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "send_challenge",
                token,
                targetUsername: challengeTargetUser.trim(),
                roomCode: data.room.code,
                wagerAmount: extra.wagerAmount || 0,
              }),
            }).catch(() => undefined);
            setChallengeTargetUser("");
          }
        }
      }
      return data;
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : "Connection error");
      return null;
    } finally {
      setOnlineBusy(false);
    }
  }

  async function spectateRoom(code: string) {
    const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    if (!cleanCode) return;
    setOnlineBusy(true);
    setOnlineError("");
    try {
      const response = await fetch(
        `/api/damii?code=${encodeURIComponent(cleanCode)}&token=${encodeURIComponent(token || "")}`
      );
      const data = await response.json();
      if (!response.ok || !data.room) {
        throw new Error(data.error || "Room not found or no longer available.");
      }
      if (data.room.status === "cancelled") {
        throw new Error("This game was cancelled by the host.");
      }
      setMode("online");
      setLocalGameStarted(false);
      setShowPregameModal(false);
      setShowSettings(false);
      loadRoom(data.room);
      setMessage(`👁 Spectating Match ${cleanCode}: ${data.room.hostName} vs ${data.room.guestName || "Waiting for Opponent..."}`);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("damii_active_room", cleanCode);
        window.history.replaceState({}, "", `/arena?room=${cleanCode}`);
      }
    } catch (err) {
      setOnlineError(err instanceof Error ? err.message : "Failed to spectate room");
    } finally {
      setOnlineBusy(false);
    }
  }

  async function playOnline(move: Move) {
    if (!room) return;
    setSelected(null);
    await onlineAction("move", { code: room.code, from: move.from, to: move.to });
  }

  async function forfeitOnline() {
    if (!room) return;
    await onlineAction("forfeit", { code: room.code });
  }

  async function offerDrawOnline() {
    if (!room) return;
    await onlineAction("offer_draw", { code: room.code });
  }

  async function acceptDrawOnline() {
    if (!room) return;
    await onlineAction("accept_draw", { code: room.code });
  }

  async function declineDrawOnline() {
    if (!room) return;
    await onlineAction("decline_draw", { code: room.code });
  }

  async function claimTimeoutOnline() {
    if (!room) return;
    await onlineAction("claim_timeout_win", { code: room.code });
  }

  async function readyOnline() {
    if (!room) return;
    await onlineAction("ready", { code: room.code });
  }

  async function cancelRoomOnline() {
    if (!room) return;
    const roomCode = room.code;
    if (typeof window !== "undefined") {
      localStorage.removeItem("damii_hosted_room");
      sessionStorage.removeItem("damii_active_room");
      if (window.location.search.includes("room=") || window.location.search.includes("code=")) {
        window.history.replaceState({}, "", "/arena");
      }
    }
    setRoom(null);
    setMode("local");
    setShowPregameModal(false);
    setMessage("Room cancelled and returned to arena lobby.");
    await onlineAction("cancel_room", { code: roomCode });
  }

  async function reportDisputeOnline(notes: string) {
    if (!room) return;
    await onlineAction("report_dispute", { code: room.code, notes });
    setShowDisputeModal(false);
    setDisputeNotesInput("");
  }

  async function requestRematch() {
    if (mode === "local") {
      resetLocalMatch();
      return;
    }
    if (!room) return;
    await onlineAction("rematch", { code: room.code });
  }

  function playLocal(move: Move) {
    const activeName = turn === "white" ? whiteDisplayName : blackDisplayName;
    const pieceBefore = board[move.from];

    const result = applyMove(board, turn, forcedFrom, move.from, move.to, activeRuleVariations);

    // Append move to local history log with dynamic player name
    const formatted = formatMoveNotation(move.from, move.to, result.captured);
    const entry: MoveLogEntry = {
      moveNumber: localMoves.length + 1,
      player: turn,
      playerName: activeName,
      from: move.from,
      to: move.to,
      notation: formatted.notation,
      algNotation: formatted.algNotation,
      sqNotation: formatted.sqNotation,
      isCapture: result.captured,
      timestamp: Date.now(),
    };
    setLocalMoves((prev) => [...prev, entry]);

    setBoard(result.board);
    setTurn(result.turn);
    setForcedFrom(result.forcedFrom);
    setWinner(result.winner);

    if (animatePieces) {
      setAnimatedMove({ from: move.from, to: move.to, id: Date.now() });
      setTimeout(() => setAnimatedMove(null), 450);
    }

    // Audio & Event Animations
    if (result.forcedFrom !== null) {
      soundService.playMultiJump();
    } else if (result.captured) {
      soundService.playCapture();
    } else {
      soundService.playMove();
    }

    if (result.captured && move.captured !== undefined) {
      setLastCaptureSquare(move.captured);
      setTimeout(() => setLastCaptureSquare(null), 850);
    }

    const pieceAfter = result.board[move.to];
    if (pieceBefore && !pieceBefore.king && pieceAfter && pieceAfter.king) {
      soundService.playKingPromotion();
      setPromotedKingEffect({ square: move.to, player: pieceBefore.player });
      setTimeout(() => setPromotedKingEffect(null), 2800);
    }

    if (result.winner) {
      soundService.playVictory();
    }

    if (result.forcedFrom !== null) {
      setSelected(result.forcedFrom);
      setMessage(`💥 ${activeName} captured piece (${formatted.notation})! Compulsory multi-jump active. Jump again.`);
    } else {
      setSelected(null);
      const nextPlayerName = result.turn === "white" ? whiteDisplayName : blackDisplayName;
      if (result.winner) {
        const winnerName = result.winner === "white" ? whiteDisplayName : blackDisplayName;
        setMessage(`🏆 Victory! ${winnerName} (${playerName(result.winner)}) wins the match!`);
      } else {
        setMessage(`♟ ${activeName} moved ${formatted.notation} (${formatted.sqNotation}). ${nextPlayerName}'s turn.`);
      }
    }
  }

  function toggleAudioSound() {
    const nextState = soundService.toggle();
    setSoundEnabled(nextState);
  }

  function handleSquare(square: number) {
    if (winner) return;

    if (mode === "local" && subMode === "vs_cpu" && turn === "black") {
      // Bot turn is in progress
      return;
    }

    if (mode === "online") {
      if (!room) {
        setMessage("Join or create an online room to play online.");
        setShowPregameModal(true);
        return;
      }
      if (isSpectator) {
        setMessage("👁 You are in Spectator Mode. Watching live match moves.");
        return;
      }
      if (room.status === "waiting") {
        setMessage(`⏳ Waiting for an opponent to join room code ${room.code}...`);
        return;
      }
      if (room.status !== "playing") {
        setMessage("Online match is not currently active.");
        return;
      }
      if (room.role !== turn) {
        setMessage(`It is ${currentTurnPlayerName}'s turn to move.`);
        return;
      }
    }

    if (mode === "local" && subMode === "vs_cpu" && turn === "black") {
      return;
    }

    const destination = destinations.get(square);
    if (destination) {
      mode === "online" ? void playOnline(destination) : playLocal(destination);
      return;
    }

    const clickedPiece = board[square];

    if (selectable.has(square)) {
      soundService.playSelect();
      setSelected(square);
      const isCapture = moves.some((move) => move.from === square && move.captured !== undefined);
      setMessage(
        isCapture
          ? `💥 Compulsory capture! Click a green highlighted square for ${currentTurnPlayerName}.`
          : `✨ Piece selected for ${currentTurnPlayerName}. Click a green destination square.`
      );
      return;
    }

    if (clickedPiece) {
      if (clickedPiece.player !== turn) {
        soundService.playWarning();
        setMessage(`It is ${currentTurnPlayerName}'s turn to move (${playerName(turn)}).`);
      } else if (mustCapture) {
        soundService.playWarning();
        setMessage("⚠️ Compulsory capture rule! Select a piece highlighted with a glowing red border.");
      } else {
        soundService.playWarning();
        setMessage("This piece has no valid legal moves.");
      }
      return;
    }

    if (forcedFrom === null) {
      setSelected(null);
      setMessage(`Click one of ${currentTurnPlayerName}'s highlighted pieces to move.`);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setSelected(null);
    setOnlineError("");
    if (next === "local") resetLocalMatch();
    else if (room) loadRoom(room);
    else setShowPregameModal(true);
  }

  const copyRoomCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyChallengeLink = () => {
    if (!room) return;
    const url = `${window.location.origin}/arena?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyMoveLog = () => {
    if (activeMoves.length === 0) return;
    const logText = activeMoves
      .map(
        (m) =>
          `Move ${m.moveNumber}: ${m.playerName} [${m.player.toUpperCase()}] Played ${m.notation}`
      )
      .join("\n");
    navigator.clipboard.writeText(
      `DAMII Draughts Match Log (${activeMoves.length} Moves):\n${logText}`
    );
    setCopiedHistory(true);
    setTimeout(() => setCopiedHistory(false), 2000);
  };

  const copyShareResult = async () => {
    if (!winner) return;
    const winnerName = winner === "white" ? whiteDisplayName : blackDisplayName;
    const loserName = winner === "white" ? blackDisplayName : whiteDisplayName;
    const modeText =
      mode === "online"
        ? room?.leagueId || room?.mode === "league"
          ? "Official League Tournament"
          : room?.mode === "wager"
          ? `Wager Match (GH₵ ${(room.wagerAmount * 2).toFixed(2)})`
          : "Online Arena Room"
        : subMode === "vs_cpu"
        ? `VS DAMII Bot (${cpuDifficulty})`
        : "Local 2-Player";

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const summaryText = [
      `🏆 DAMII Draughts Match Result`,
      `----------------------------------------`,
      `👑 Winner: ${winnerName} (${winner === "white" ? "Player 1 ♔" : "Player 2 ♚"})`,
      `⚔️ Opponent: ${loserName}`,
      `🎮 Mode: ${modeText}`,
      `📊 Match Performance:`,
      `   • Player 1 Captures: ${captures.white}`,
      `   • Player 2 Captures: ${captures.black}`,
      `   • Total Moves: ${activeMoves.length}`,
      `----------------------------------------`,
      origin ? `Play 10x10 DAMII Draughts: ${origin}` : `Play 10x10 DAMII Draughts!`,
    ].join("\n");

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "DAMII Draughts Match Result",
          text: summaryText,
          url: origin || undefined,
        });
      } else {
        await navigator.clipboard.writeText(summaryText);
      }
      setCopiedShareResult(true);
      setTimeout(() => setCopiedShareResult(false), 2500);
    } catch {
      try {
        await navigator.clipboard.writeText(summaryText);
        setCopiedShareResult(true);
        setTimeout(() => setCopiedShareResult(false), 2500);
      } catch {
        /* fallback */
      }
    }
  };

  const orderedSquares = Array.from({ length: 100 }, (_, square) => square);
  if (rotated) orderedSquares.reverse();
  const mustCapture = moves.some((move) => move.captured !== undefined);

  // Format move pairs for notation table
  const pairedMoves = useMemo(() => {
    const pairs: { turnNum: number; white?: MoveLogEntry; black?: MoveLogEntry }[] = [];
    activeMoves.forEach((m) => {
      if (m.player === "white") {
        pairs.push({ turnNum: pairs.length + 1, white: m });
      } else {
        if (pairs.length > 0 && !pairs[pairs.length - 1].black) {
          pairs[pairs.length - 1].black = m;
        } else {
          pairs.push({ turnNum: pairs.length + 1, black: m });
        }
      }
    });
    return pairs;
  }, [activeMoves]);

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  return (
    <main className="app-shell flex flex-col min-h-screen">
      <SharedHeader />

      {/* LOBBY VIEW vs GAME BOARD VIEW */}
      {!hasActiveGame ? (
        /* ARENA LOBBY HUB (Consistent 1100px Container matching Home Page) */
        <section className="flex-1 max-w-[1100px] w-full mx-auto p-2 sm:p-4 space-y-4 sm:space-y-5">
          {/* Streamlined Lobby Hero & Quick Actions Hub */}
          <div className="p-4 sm:p-6 bg-gradient-to-br from-[#06261f] via-[#0c3b2e] to-[#081c15] border-2 border-[#184d3c] rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-[#d6a735]/20 border border-[#d6a735]/40 text-[#d6a735] text-[10px] font-extrabold uppercase tracking-widest rounded-full flex items-center gap-1">
                    <Radio size={12} className="animate-pulse text-emerald-400" />
                    Live Arena
                  </span>
                  <span className="text-xs text-slate-300">10x10 Flying Kings</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-[#f5efdf] font-serif">
                  DAMII Matchmaking & Lobby Hub
                </h1>
              </div>

              <a
                href="/leagues"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#081c15] hover:bg-[#0c3b2e] text-[#d6a735] border border-[#184d3c] rounded-xl text-xs font-bold transition-colors shrink-0 self-start sm:self-auto"
              >
                <Trophy size={14} className="text-[#d6a735]" />
                <span>Tournaments & Leagues</span>
                <ChevronRight size={14} />
              </a>
            </div>

            {/* Focused 3-Card Quick Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: Match Setup */}
              <div className="p-4 bg-[#06261f]/90 border border-[#184d3c] hover:border-[#d6a735]/50 rounded-xl flex flex-col justify-between gap-3 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-[#d6a735]/15 border border-[#d6a735]/30 rounded-xl text-[#d6a735] shrink-0">
                    <Swords size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#f5efdf]">Create Match</h3>
                    <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                      Configure Casual, Wager, AI, or Local 2-player board.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPregameModal(true)}
                  className="w-full py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
                >
                  <Swords size={14} /> Match Setup
                </button>
              </div>

              {/* Card 2: Practice vs Bot */}
              <div className="p-4 bg-[#06261f]/90 border border-[#184d3c] hover:border-emerald-500/50 rounded-xl flex flex-col justify-between gap-3 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#f5efdf]">Practice vs AI</h3>
                    <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                      Single-player training across 3 engine difficulty tiers.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode("local");
                    setSubMode("vs_cpu");
                    setShowPregameModal(true);
                  }}
                  className="w-full py-2 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Bot size={14} className="text-emerald-400" /> Start AI Match
                </button>
              </div>

              {/* Card 3: Enter Room Code */}
              <div className="p-4 bg-[#06261f]/90 border border-[#184d3c] hover:border-[#d6a735]/50 rounded-xl flex flex-col justify-between gap-3 transition-colors overflow-hidden">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-[#144435] border border-[#184d3c] rounded-xl text-[#d6a735] shrink-0">
                    <ArrowRight size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[#f5efdf]">Enter Room Code</h3>
                    <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                      Join a friend&apos;s private room directly with an 8-digit ticket.
                    </p>
                  </div>
                </div>
                <div className="flex items-stretch w-full min-w-0 bg-[#0c3b2e] border border-[#184d3c] rounded-xl overflow-hidden focus-within:border-[#d6a735] transition-all">
                  <input
                    type="text"
                    maxLength={8}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    className="flex-1 min-w-0 w-full px-3 py-2 bg-transparent text-xs font-mono font-bold tracking-widest text-[#f5efdf] uppercase placeholder:text-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={onlineBusy || !joinCode}
                    onClick={() => {
                      if (!token) {
                        window.dispatchEvent(new CustomEvent("damii-open-auth"));
                        return;
                      }
                      void onlineAction("join", { code: joinCode });
                    }}
                    className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-slate-950 font-black text-xs transition-all shrink-0 flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>Join</span>
                    <ArrowRight size={13} className="shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lobby Segmented Controller Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#0c3b2e] border border-[#184d3c] rounded-2xl shadow-inner">
            <button
              type="button"
              onClick={() => setLobbyTab("live")}
              className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                lobbyTab === "live"
                  ? "bg-[#d6a735] text-[#06261f] shadow-md shadow-[#d6a735]/20 font-black"
                  : "text-[#cbd5e1] hover:text-white"
              }`}
            >
              <Gamepad2 size={15} />
              <span className="truncate">Live Games</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-black hidden xs:inline ${
                  lobbyTab === "live" ? "bg-[#06261f] text-[#d6a735]" : "bg-[#144435] text-slate-300"
                }`}
              >
                {lobbyRooms.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLobbyTab("players")}
              className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                lobbyTab === "players"
                  ? "bg-[#d6a735] text-[#06261f] shadow-md shadow-[#d6a735]/20 font-black"
                  : "text-[#cbd5e1] hover:text-white"
              }`}
            >
              <Users size={15} />
              <span className="truncate">Players & Ranks</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-black hidden xs:inline ${
                  lobbyTab === "players" ? "bg-[#06261f] text-[#d6a735]" : "bg-[#144435] text-slate-300"
                }`}
              >
                {lobbyPlayers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLobbyTab("tournaments")}
              className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                lobbyTab === "tournaments"
                  ? "bg-[#d6a735] text-[#06261f] shadow-md shadow-[#d6a735]/20 font-black"
                  : "text-[#cbd5e1] hover:text-white"
              }`}
            >
              <Trophy size={15} />
              <span className="truncate">Tournaments</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-black hidden xs:inline ${
                  lobbyTab === "tournaments" ? "bg-[#06261f] text-[#d6a735]" : "bg-[#144435] text-slate-300"
                }`}
              >
                {lobbyLeagues.length}
              </span>
            </button>
          </div>

          {/* TAB 1: LIVE ONGOING GAMES */}
          {lobbyTab === "live" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#f5efdf]">Active Game Rooms</h2>
                <p className="text-xs text-slate-400">Spectate games in real time or jump into open rooms waiting for an opponent.</p>
              </div>

              {lobbyLoading ? (
                <div className="p-12 text-center text-slate-400 bg-[#06261f] border border-[#184d3c] rounded-2xl flex flex-col items-center gap-3">
                  <RefreshCw size={24} className="animate-spin text-[#d6a735]" />
                  <span className="text-xs">Loading live matches across the arena...</span>
                </div>
              ) : lobbyRooms.length === 0 ? (
                <div className="p-12 text-center bg-[#06261f] border border-[#184d3c] rounded-2xl space-y-3">
                  <Gamepad2 size={36} className="mx-auto text-slate-500" />
                  <h3 className="text-base font-bold text-[#f5efdf]">No Live Matches Right Now</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Be the first to open a game room or challenge another player to kick off an arena match!
                  </p>
                  {profile?.role !== "admin" && profile?.role !== "super_admin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("online");
                        setShowPregameModal(true);
                      }}
                      className="px-4 py-2 bg-[#d6a735] text-[#06261f] font-black rounded-xl text-xs inline-flex items-center gap-2"
                    >
                      <Plus size={14} /> Create a Match Room
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {lobbyRooms.map((r) => {
                    const isPlaying = r.status === "playing";
                    const isWaiting = r.status === "waiting";
                    const isWager = r.mode === "wager";
                    const isLeague = r.mode === "league" || !!r.leagueId;

                    return (
                      <div
                        key={r.code}
                        className="p-4 bg-[#06261f] border border-[#184d3c] hover:border-[#d6a735]/60 rounded-2xl space-y-3 shadow-lg transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 bg-[#0c3b2e] border border-[#184d3c] text-[#d6a735] font-mono font-bold text-xs rounded-md">
                              ROOM {r.code}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {r.isPrivate ? (
                                <span className="px-2 py-0.5 bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold text-[10px] rounded-md flex items-center gap-1">
                                  <Lock size={10} /> Private
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] rounded-md flex items-center gap-1">
                                  <Globe size={10} /> Public
                                </span>
                              )}
                              {isPlaying && (
                                <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-extrabold text-[10px] rounded-md flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                                  Live
                                </span>
                              )}
                              {isWaiting && (
                                <span className="px-2 py-0.5 bg-amber-950/80 border border-amber-500/40 text-amber-300 font-extrabold text-[10px] rounded-md flex items-center gap-1">
                                  <Clock size={10} /> Open
                                </span>
                              )}
                              {isWager && (
                                <span className="px-2 py-0.5 bg-[#d6a735]/20 border border-[#d6a735]/50 text-[#d6a735] font-bold text-[10px] rounded-md flex items-center gap-1">
                                  <Zap size={10} /> GH₵ {(r.wagerAmount * 2).toFixed(2)}
                                </span>
                              )}
                              {isLeague && (
                                <span className="px-2 py-0.5 bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold text-[10px] rounded-md flex items-center gap-1">
                                  <Trophy size={10} /> Tournament
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Players Roster */}
                          <div className="p-3 bg-[#081c15] border border-[#184d3c] rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded-full bg-[#f5efdf] border border-slate-400 inline-block" />
                                <strong className="text-[#f5efdf] truncate max-w-[130px]">{r.hostName}</strong>
                              </span>
                              <span className="text-[10px] font-bold text-[#d6a735]">White (Host)</span>
                            </div>
                            <div className="border-t border-[#184d3c]/60 my-1" />
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded-full bg-[#114232] border border-emerald-400 inline-block" />
                                <strong className="text-[#f5efdf] truncate max-w-[130px]">
                                  {r.guestName || "Waiting for opponent..."}
                                </strong>
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">Black</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                            <span>Moves: <strong className="text-[#f5efdf]">{r.moveCount || 0}</strong></span>
                            <span>Turn: <strong className="text-[#d6a735]">{r.turn === "white" ? "White" : "Black"}</strong></span>
                          </div>
                        </div>

                        {/* Action CTA */}
                        <div className="pt-2 flex items-center gap-2">
                          {isWaiting && !r.guestName && profile?.role !== "admin" && profile?.role !== "super_admin" ? (
                            r.hostName === username && token ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  setMode("online");
                                  await onlineAction("join", { code: r.code });
                                }}
                                className="w-full py-2 bg-[#144435] hover:bg-[#1f5e4a] text-[#f5efdf] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-[#184d3c] transition-all"
                              >
                                Rejoin Your Waiting Room
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!token) {
                                    window.dispatchEvent(new CustomEvent("damii-open-auth"));
                                    return;
                                  }
                                  setChallengeToAccept(r);
                                }}
                                className="w-full py-2 bg-gradient-to-r from-emerald-500 to-[#d6a735] hover:brightness-110 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all animate-pulse"
                              >
                                <Swords size={14} /> Accept Challenge
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              disabled={onlineBusy}
                              onClick={() => void spectateRoom(r.code)}
                              className="w-full py-2 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                            >
                              <Eye size={14} className="text-[#d6a735]" /> Spectate Live Game
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PLAYERS & RANKINGS */}
          {lobbyTab === "players" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-[#f5efdf]">Arena Players & Online Ranks</h2>
                  <p className="text-xs text-slate-400">Request free or wagered matches directly against any registered player.</p>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search player username..."
                    value={playerSearchQuery}
                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] placeholder-slate-500 focus:outline-none focus:border-[#d6a735] w-full sm:w-64"
                  />
                </div>
              </div>

              {(() => {
                const NON_PLAYER_ROLES = ["admin", "super_admin", "organizer", "facilitator", "treasurer"];
                const activePlayers = lobbyPlayers.filter((p) => {
                  const isPlayer = !p.role || !NON_PLAYER_ROLES.includes(p.role);
                  const isNotBanned = p.status !== "banned";
                  const matchesSearch = playerSearchQuery
                    ? p.username.toLowerCase().includes(playerSearchQuery.toLowerCase())
                    : true;
                  return isPlayer && isNotBanned && matchesSearch;
                });

                if (activePlayers.length === 0) {
                  return (
                    <div className="p-8 text-center bg-[#06261f] border border-[#184d3c] rounded-2xl text-slate-400 text-xs">
                      No active players registered yet.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activePlayers.map((p, idx) => {
                      const isSelf = p.username === username;
                      const isAdmin = p.role === "admin" || p.role === "super_admin";
                      const isBot = p.token?.startsWith("bot-player-") || (!p.token && p.username && p.username.includes("_"));
                      // Check if in active live game
                      const inActiveRoom = lobbyRooms.some(
                        (r) => !r.winner && r.status === "playing" && (r.hostName === p.username || r.guestName === p.username)
                      );
                      const isInMatch = p.presenceStatus === "in_match" || inActiveRoom;
                      const isOnline = isBot ? true : Boolean(p.isOnline || p.presenceStatus === "online" || isInMatch);

                      return (
                        <div
                          key={p.username}
                          className="p-4 bg-[#06261f] border border-[#184d3c] hover:border-[#1f5e4a] rounded-2xl space-y-3 shadow-md flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            {/* Player Header: Rank Number, Name, Online Status */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="h-8 w-8 rounded-full bg-[#0c3b2e] border border-[#184d3c] text-[#d6a735] font-black text-xs flex items-center justify-center shrink-0 shadow-inner">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <strong className="text-xs sm:text-sm text-[#f5efdf] truncate">{p.username}</strong>
                                    {isSelf && (
                                      <span className="text-[10px] px-1.5 py-0.2 bg-[#d6a735]/20 text-[#d6a735] font-bold rounded-full shrink-0">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 truncate block">
                                    {p.rank?.aka || "Draughts Player"}
                                  </span>
                                </div>
                              </div>

                              {/* Online / In Game / Offline Status Badge */}
                              {isInMatch ? (
                                <span className="text-[10px] px-2.5 py-0.5 bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold rounded-full flex items-center gap-1.5 shrink-0">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                                  In Game
                                </span>
                              ) : isOnline ? (
                                <span className="text-[10px] px-2.5 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold rounded-full flex items-center gap-1.5 shrink-0">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Online
                                </span>
                              ) : (
                                <span className="text-[10px] px-2.5 py-0.5 bg-slate-900 border border-slate-700/60 text-slate-400 font-medium rounded-full flex items-center gap-1.5 shrink-0">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                                  Offline
                                </span>
                              )}
                            </div>

                            {/* Rank & Rating Banner (Wins, Losses, Points Removed) */}
                            <div className="flex items-center justify-between p-2.5 bg-[#081c15] border border-[#184d3c] rounded-xl text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-base select-none">{p.rank?.badgeEmoji || "🪵"}</span>
                                <div>
                                  <small className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Rank</small>
                                  <strong className="text-xs font-bold text-[#f5efdf] block leading-none">{p.rank?.title || "Draft Learner"}</strong>
                                </div>
                              </div>
                              <div className="text-right">
                                <small className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Rating</small>
                                <strong className="text-xs font-black text-[#d6a735] font-mono leading-none">{p.rating} ELO</strong>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons: Free vs Wager Challenge */}
                          {!isSelf && !isAdmin && profile?.role !== "admin" && profile?.role !== "super_admin" && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleDirectChallenge(p.username, "casual")}
                                className="py-1.5 px-2 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                              >
                                <Swords size={12} className="text-[#d6a735]" />
                                <span>Free Match</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDirectChallenge(p.username, "wager")}
                                className="py-1.5 px-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] rounded-lg text-[11px] font-black flex items-center justify-center gap-1 shadow-sm transition-all"
                              >
                                <Zap size={12} />
                                <span>Wager Match</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 3: TOURNAMENTS & LEAGUES */}
          {lobbyTab === "tournaments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-[#f5efdf]">Tournaments & Leagues</h2>
                  <p className="text-xs text-slate-400">Sanctioned 10x10 tournament brackets and prize pools.</p>
                </div>
                <a
                  href="/leagues"
                  className="px-3 py-1.5 bg-[#d6a735] text-[#06261f] font-black rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Trophy size={14} />
                  <span>View All Leagues</span>
                </a>
              </div>

              {lobbyLeagues.length === 0 ? (
                <div className="p-8 text-center bg-[#06261f] border border-[#184d3c] rounded-2xl text-slate-400 text-xs">
                  No active tournament leagues right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lobbyLeagues.map((l) => (
                    <div
                      key={l.id}
                      className="p-5 bg-[#06261f] border border-[#184d3c] hover:border-[#d6a735]/50 rounded-2xl space-y-3 shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40 text-[10px] font-extrabold uppercase rounded-md inline-block mb-1">
                            {l.status}
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-[#f5efdf]">{l.title}</h3>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Prize Pool</span>
                          <strong className="text-sm font-black text-[#d6a735]">GH₵ {l.prizePool}</strong>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2">{l.description}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-[#184d3c] text-xs">
                        <span className="text-slate-400">
                          Players: <strong className="text-[#f5efdf]">{Array.isArray(l.participants) ? l.participants.length : (typeof l.participants === "number" ? l.participants : (l.participantCount || 0))} / {l.maxPlayers || l.maxParticipants || 8}</strong>
                        </span>
                        <a
                          href={`/leagues?id=${l.id}`}
                          className="text-[#d6a735] hover:underline font-bold flex items-center gap-1"
                        >
                          <span>Open Tournament</span>
                          <ChevronRight size={13} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      ) : mode === "online" && room && room.status === "waiting" && !room.guestToken ? (
        <section className="flex-1 max-w-[1100px] w-full mx-auto p-2 sm:p-4 flex flex-col items-center justify-center">
          <WaitingRoom
            room={room}
            currentUsername={username}
            isHost={room.role === "white"}
            onCancelRoom={cancelRoomOnline}
            onPracticeAi={() => startBotMatch("easy")}
            busy={onlineBusy}
          />
        </section>
      ) : (
        /* Main Arena Game Layout Container (Consistent 1100px Desktop Width matching Home Page) */
        <section className="flex-1 max-w-[1100px] w-full mx-auto p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-start">
          <div className="w-full grid grid-cols-1 lg:grid-cols-[190px_minmax(0,1fr)_250px] xl:grid-cols-[200px_minmax(0,1fr)_260px] gap-2.5 xl:gap-3 items-start justify-center">
            
            {/* Left Column: Match Navigation & Settings (Desktop) */}
            <div className="hidden lg:flex flex-col gap-2.5 w-full sticky top-2 select-none">
              <MatchNavigationCard
                mode={mode}
                subMode={subMode}
                cpuDifficulty={cpuDifficulty}
                room={room}
                whiteDisplayName={whiteDisplayName}
                blackDisplayName={blackDisplayName}
              />
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
            </div>

            {/* Center Column: 10x10 Board Stage & In-Game Actions */}
            <ArenaBoardView
              mode={mode}
              subMode={subMode}
              room={room}
              board={board}
              orderedSquares={orderedSquares}
              activeBoardConfig={activeBoardConfig}
              activeMarbleConfig={activeMarbleConfig}
              boardZoom={boardZoom}
              handleZoomChange={handleZoomChange}
              promotedKingEffect={promotedKingEffect}
              lastCaptureSquare={lastCaptureSquare}
              animatePieces={animatePieces}
              animatedMove={animatedMove}
              selected={selected}
              destinations={destinations}
              selectable={selectable}
              moves={moves}
              lastMove={lastMove}
              handleSquare={handleSquare}
              winner={winner}
              turn={turn}
              secondsLeft={secondsLeft}
              turnTimerLimit={turnTimerLimit}
              whiteDisplayName={whiteDisplayName}
              blackDisplayName={blackDisplayName}
              spectatorCount={mode === "online" && room ? (room.spectatorCount ?? 0) : 0}
              message={message}
              mustCapture={mustCapture}
              showGameActions={showGameActions}
              setShowGameActions={setShowGameActions}
              onlineBusy={onlineBusy}
              offerDrawOnline={offerDrawOnline}
              acceptDrawOnline={acceptDrawOnline}
              declineDrawOnline={declineDrawOnline}
              forfeitOnline={forfeitOnline}
              claimTimeoutOnline={claimTimeoutOnline}
              cancelRoomOnline={cancelRoomOnline}
              requestRematch={requestRematch}
              resetLocalMatch={resetLocalMatch}
              setRotated={setRotated}
              rotated={rotated}
              boardTheme={boardTheme}
              marbleTheme={marbleTheme}
              saveCustomTheme={saveCustomTheme}
              soundEnabled={soundEnabled}
              toggleAudioSound={toggleAudioSound}
              setSettingsTab={setSettingsTab}
              setShowSettings={setShowSettings}
              setShowDisputeModal={setShowDisputeModal}
              mobileArenaTab={mobileArenaTab}
              setMobileArenaTab={setMobileArenaTab}
              displayChatMessages={displayChatMessages}
              handleSendChat={handleSendChat}
              sendingChat={sendingChat}
              currentUsername={username}
              userRole={mode === "online" && room ? room.role : "white"}
              activeMoves={activeMoves}
              pairedMoves={pairedMoves}
              notationStyle={notationStyle}
              setNotationStyle={setNotationStyle}
              copyMoveLog={copyMoveLog}
              copiedHistory={copiedHistory}
              showTrainingIntel={showTrainingIntel}
              onToggleTrainingIntel={() => setShowTrainingIntel((v) => !v)}
              suggestedHint={suggestedHint}
              onReturnToLobby={handleReturnToArenaLobby}
              onOpenSummary={() => setShowMatchSummaryModal(true)}
              readyOnline={readyOnline}
            />

            {/* Right Column: Game Intelligence Hub & Live Match Chat (Desktop) */}
            <div className="hidden lg:flex flex-col gap-2.5 w-full sticky top-2 select-none">
              <GameIntelligenceHub
                whiteDisplayName={whiteDisplayName}
                blackDisplayName={blackDisplayName}
                whiteRating={profile?.rating || 1850}
                blackRating={mode === "online" && room ? (room.guestName ? 1820 : 1500) : (subMode === "vs_cpu" ? (cpuDifficulty === "hard" ? 2100 : cpuDifficulty === "medium" ? 1700 : 1300) : 1820)}
                captures={captures}
                turn={turn}
                winner={winner}
                secondsLeft={secondsLeft}
                turnTimerLimit={turnTimerLimit}
                winProbability={winProbability}
                pairedMoves={pairedMoves}
                activeMovesCount={activeMoves.length}
                notationStyle={notationStyle}
                onSetNotationStyle={setNotationStyle}
                onCopyHistory={copyMoveLog}
                copiedHistory={copiedHistory}
                historyScrollRef={historyScrollRef}
                showTrainingIntel={showTrainingIntel}
                onToggleTrainingIntel={() => setShowTrainingIntel((v) => !v)}
                suggestedHint={suggestedHint}
              />
              <LiveMatchChat
                messages={displayChatMessages}
                onSendMessage={handleSendChat}
                sending={sendingChat}
                userRole={mode === "online" && room ? room.role : "white"}
                currentUsername={username}
                isMatchFinished={!!winner}
              />
            </div>

          </div>
        </section>
      )}

      {/* Mandatory / Interactive Pregame Match Setup Modal */}
      {showPregameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-[#06261f] border-2 border-[#d6a735] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-[#0c3b2e] border-b border-[#184d3c] flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-[#d6a735]">
                <Swords size={20} className="shrink-0" />
                <div>
                  <h2 className="text-sm sm:text-base font-black text-[#f5efdf] font-serif">DAMII Pregame Match Configuration</h2>
                  <p className="text-[10px] sm:text-[11px] text-[#cbd5e1]">Configure match mode and settings before launching the board.</p>
                </div>
              </div>
              <button
                onClick={() => setShowPregameModal(false)}
                className="text-[#cbd5e1] hover:text-white p-1.5 rounded-xl hover:bg-[#144435] transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">

              {(profile?.role === "admin" || profile?.role === "super_admin") && (
                <div className="p-3.5 sm:p-4 bg-amber-950/90 border border-amber-500/80 rounded-xl text-[#f5efdf] space-y-2 shadow-lg">
                  <div className="flex items-center gap-2 text-[#d6a735] font-bold text-xs">
                    <ShieldAlert size={18} />
                    <span>Administrator Account (Non-Playing Facilitator)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    As an Administrator, your account serves exclusively as a match facilitator, regulator, and spectator. Admin accounts are restricted from hosting or participating in player matches or wagers.
                  </p>
                  <a
                    href="/admin"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#d6a735] text-[#06261f] font-black rounded-lg text-xs hover:bg-[#b88c24] transition-colors mt-1 shadow-sm"
                  >
                    <ShieldCheck size={14} /> Open Admin Control Center
                  </a>
                </div>
              )}

              {/* Mode Selection Tabs */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#f5efdf] uppercase tracking-wider">
                  Select Game Mode
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1 bg-[#0c3b2e] border border-[#184d3c] rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("local");
                      setSubMode("pass_play");
                    }}
                    className={`py-2 sm:py-2.5 px-1 sm:px-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                      mode === "local" && subMode === "pass_play"
                        ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                        : "text-[#cbd5e1] hover:text-white font-bold"
                    }`}
                  >
                    <Monitor size={16} className="shrink-0" />
                    <span className="text-[10px] sm:text-xs font-bold tracking-tight text-center leading-tight whitespace-nowrap">Pass & Play</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("local");
                      setSubMode("vs_cpu");
                    }}
                    className={`py-2 sm:py-2.5 px-1 sm:px-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                      mode === "local" && subMode === "vs_cpu"
                        ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                        : "text-[#cbd5e1] hover:text-white font-bold"
                    }`}
                  >
                    <Bot size={16} className="shrink-0" />
                    <span className="text-[10px] sm:text-xs font-bold tracking-tight text-center leading-tight whitespace-nowrap">Vs Bot AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("online")}
                    className={`py-2 sm:py-2.5 px-1 sm:px-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                      mode === "online"
                        ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                        : "text-[#cbd5e1] hover:text-white font-bold"
                    }`}
                  >
                    <Globe size={16} className="shrink-0" />
                    <span className="text-[10px] sm:text-xs font-bold tracking-tight text-center leading-tight whitespace-nowrap">Online 1-on-1</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Pregame Configurations depending on Mode */}
              {mode === "local" && subMode === "pass_play" && (
                <div className="space-y-4 p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-xl">
                  <h4 className="text-xs font-bold text-[#f5efdf] flex items-center gap-2">
                    <Monitor size={15} className="text-[#d6a735]" />
                    Local 2-Player Pass & Play Match Setup
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#d6a735] uppercase mb-1">
                        Player 1 (White)
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={localWhiteName}
                        onChange={(e) => setLocalWhiteName(e.target.value)}
                        placeholder="Player 1 Name"
                        className="w-full px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-emerald-400 uppercase mb-1">
                        Player 2 (Black)
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={localBlackName}
                        onChange={(e) => setLocalBlackName(e.target.value)}
                        placeholder="Player 2 Name"
                        className="w-full px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#cbd5e1] mb-1">
                      Turn Time Limit
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[30, 60, 90, 0].map((seconds) => (
                        <button
                          key={seconds}
                          type="button"
                          onClick={() => setTurnTimerLimit(seconds)}
                          className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            turnTimerLimit === seconds
                              ? "bg-[#d6a735]/20 border-[#d6a735] text-[#d6a735]"
                              : "bg-[#06261f] border-[#184d3c] text-[#cbd5e1] hover:text-white"
                          }`}
                        >
                          {seconds === 0 ? "Unlimited" : `${seconds}s`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {mode === "local" && subMode === "vs_cpu" && (
                <div className="space-y-4 p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-xl">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#f5efdf] flex items-center gap-2">
                      <Bot size={15} className="text-[#d6a735]" />
                      Computer AI Simulation Setup
                    </h4>
                    {token && profile ? (
                      <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/30 rounded-full">
                        ● Signed In: {profile.username || username} ({profile.rating} ELO)
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-300 font-semibold px-2 py-0.5 bg-amber-950/60 border border-amber-500/30 rounded-full">
                        ⚡ Instant Practice Mode
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#d6a735] uppercase mb-1">
                      Your Player Name (White)
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      value={localWhiteName}
                      onChange={(e) => setLocalWhiteName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold text-[#cbd5e1]">
                        AI Bot Difficulty
                      </label>
                      <span className="text-[10px] text-[#d6a735] font-bold">
                        {cpuDifficulty === "easy"
                          ? "Casual Bot (Beginner · Free Guest Play)"
                          : cpuDifficulty === "medium"
                          ? "Tactical AI (Intermediate · Player Account)"
                          : "Grandmaster (Pro FMJD · Player Account)"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(
                        [
                          { key: "easy", label: "Casual Bot", desc: "Free guest play · Forgiving pace & captures", isFree: true },
                          { key: "medium", label: "Tactical AI", desc: "Positional tactics · Account required", isFree: false },
                          { key: "hard", label: "Grandmaster", desc: "Ruthless calculation · Account required", isFree: false },
                        ] as const
                      ).map(({ key, label, desc, isFree }) => {
                        const requiresAccount = !isFree && (!token || !profile);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              if (requiresAccount) {
                                window.dispatchEvent(new CustomEvent("damii-open-auth"));
                                setMessage("🔒 " + label + " requires a registered player account. Sign in or register to unlock.");
                                return;
                              }
                              setCpuDifficulty(key);
                            }}
                            className={`p-2.5 text-left rounded-xl border transition-all relative ${
                              cpuDifficulty === key
                                ? "bg-[#d6a735]/20 border-[#d6a735] text-[#d6a735] shadow-sm ring-1 ring-[#d6a735]/50"
                                : requiresAccount
                                ? "bg-[#041a15] border-[#184d3c]/70 text-slate-400 hover:text-[#f5efdf] hover:border-[#d6a735]/40"
                                : "bg-[#06261f] border-[#184d3c] text-[#cbd5e1] hover:text-white hover:border-[#22634f]"
                            }`}
                          >
                            <div className="text-xs font-bold flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                {label}
                                {requiresAccount && <Lock size={11} className="text-amber-400 shrink-0" />}
                              </span>
                              {cpuDifficulty === key && <span className="text-[10px]">●</span>}
                              {requiresAccount ? (
                                <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded font-normal">
                                  Sign In
                                </span>
                              ) : isFree ? (
                                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/30 rounded font-normal">
                                  Free
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[10px] opacity-75 mt-0.5 leading-tight">
                              {requiresAccount ? "Requires player account" : desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#cbd5e1] mb-1">
                      Turn Time Limit
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[30, 60, 90, 0].map((seconds) => (
                        <button
                          key={seconds}
                          type="button"
                          onClick={() => setTurnTimerLimit(seconds)}
                          className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            turnTimerLimit === seconds
                              ? "bg-[#d6a735]/20 border-[#d6a735] text-[#d6a735]"
                              : "bg-[#06261f] border-[#184d3c] text-[#cbd5e1] hover:text-white"
                          }`}
                        >
                          {seconds === 0 ? "Unlimited" : `${seconds}s`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {mode === "online" && (
                <div className="space-y-4 p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-xl">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#f5efdf] flex items-center gap-2">
                      <Globe size={15} className="text-[#d6a735]" />
                      Online 1-on-1 Challenge & Room Creation
                    </h4>
                    {token && profile && (
                      <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/30 rounded-full">
                        ● Signed In: {profile.username || username}
                      </span>
                    )}
                  </div>

                  {onlineError && (
                    <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                      <AlertTriangle size={15} className="shrink-0 text-red-400" />
                      <span>{onlineError}</span>
                    </div>
                  )}

                  {!token ? (
                    <div className="p-4 bg-[#06261f] border border-[#d6a735]/40 rounded-xl text-center space-y-3">
                      <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-xs">
                        <Lock size={15} className="text-[#d6a735]" />
                        <span>Authentication Required for Online Matches</span>
                      </div>
                      <p className="text-[11px] text-[#cbd5e1] leading-relaxed max-w-sm mx-auto">
                        Online 1-on-1 multiplayer, real-time sync, and wager matches require an authenticated player account. Please sign in or register to create or join matches.
                      </p>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent("damii-open-auth"))}
                        className="w-full py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black text-xs rounded-xl transition-all shadow-md shadow-[#d6a735]/20 flex items-center justify-center gap-2"
                      >
                        <User size={14} /> Sign In / Register Account
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Match Visibility Selector */}
                      <div className="p-3 bg-[#06261f] border border-[#184d3c] rounded-xl space-y-2">
                        <label className="text-[11px] font-extrabold text-[#d6a735] uppercase tracking-wider block">
                          Match Visibility
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setIsPrivateRoom(false)}
                            className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                              !isPrivateRoom
                                ? "bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-500/10"
                                : "bg-[#081c15] border-[#184d3c] text-slate-400 hover:border-slate-600"
                            }`}
                          >
                            <Globe size={16} className={`mt-0.5 shrink-0 ${!isPrivateRoom ? "text-emerald-400" : "text-slate-500"}`} />
                            <div>
                              <strong className="text-xs block font-bold text-[#f5efdf]">Public Match</strong>
                              <span className="text-[10px] text-slate-300 leading-tight block">
                                Listed in Arena Lobby. Any online player can accept.
                              </span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsPrivateRoom(true)}
                            className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                              isPrivateRoom
                                ? "bg-purple-950/80 border-purple-500 text-purple-200 shadow-md shadow-purple-500/10"
                                : "bg-[#081c15] border-[#184d3c] text-slate-400 hover:border-slate-600"
                            }`}
                          >
                            <Lock size={16} className={`mt-0.5 shrink-0 ${isPrivateRoom ? "text-purple-400" : "text-slate-500"}`} />
                            <div>
                              <strong className="text-xs block font-bold text-[#f5efdf]">Private Room</strong>
                              <span className="text-[10px] text-slate-300 leading-tight block">
                                Unlisted. Only players with your room code can join.
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Match Mode Radio Selection */}
                      <div className="p-3 bg-[#06261f] border border-[#184d3c] rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-extrabold text-[#d6a735] uppercase tracking-wider block">
                            Match Type & Stakes
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {roomMode === "wager" ? "Escrow Pot Active" : "No Stake"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setRoomMode("casual")}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                              roomMode === "casual"
                                ? "bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-sm ring-1 ring-emerald-500/40"
                                : "bg-[#081c15] border-[#184d3c] text-slate-400 hover:border-slate-600 hover:text-slate-200"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                roomMode === "casual" ? "border-emerald-400 bg-emerald-400" : "border-slate-500"
                              }`}
                            >
                              {roomMode === "casual" && <div className="w-1.5 h-1.5 rounded-full bg-[#06261f]" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold flex items-center gap-1.5">
                                <span className="text-[#f5efdf]">Casual Match</span>
                                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-500/30 rounded font-normal">
                                  Free
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                Friendly game · No stakes
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRoomMode("wager")}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                              roomMode === "wager"
                                ? "bg-amber-950/70 border-amber-400 text-amber-200 shadow-sm ring-1 ring-amber-400/40"
                                : "bg-[#081c15] border-[#184d3c] text-slate-400 hover:border-slate-600 hover:text-slate-200"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                roomMode === "wager" ? "border-amber-400 bg-amber-400" : "border-slate-500"
                              }`}
                            >
                              {roomMode === "wager" && <div className="w-1.5 h-1.5 rounded-full bg-[#06261f]" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold flex items-center gap-1.5">
                                <span className="text-amber-300 font-extrabold">Wager Match</span>
                                <Zap size={11} className="text-amber-400 shrink-0" />
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                GH₵ Escrow Pot · Winner takes all
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* Wager Stake Amount Row (Next line when Wager is active) */}
                        {roomMode === "wager" && (
                          <div className="pt-2.5 border-t border-[#184d3c] space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold text-slate-300">
                                Wager Stake (GH₵ per player)
                              </label>
                              <span className="text-[10px] text-slate-400">
                                Balance: <strong className="text-emerald-400">GH₵ {Math.max(Number(profile?.points ?? 0), Number(profile?.marbles ?? 0)).toFixed(2)}</strong>
                              </span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#d6a735]">
                                  GH₵
                                </span>
                                <input
                                  type="number"
                                  min={5}
                                  step={5}
                                  value={wagerInput}
                                  onChange={(e) => setWagerInput(Math.max(1, Number(e.target.value)))}
                                  placeholder="Stake amount"
                                  className="w-full pl-11 pr-3 py-2 bg-[#081c15] border border-[#184d3c] rounded-xl text-xs font-bold text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                {[10, 20, 50, 100].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setWagerInput(preset)}
                                    className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                                      wagerInput === preset
                                        ? "bg-[#d6a735] text-[#06261f] border-[#d6a735]"
                                        : "bg-[#081c15] border-[#184d3c] text-slate-300 hover:border-slate-500"
                                    }`}
                                  >
                                    GH₵{preset}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Optional target player challenge field */}
                        <div className="pt-1">
                          <input
                            type="text"
                            value={challengeTargetUser}
                            onChange={(e) => setChallengeTargetUser(e.target.value)}
                            placeholder="Target Opponent Username (Optional - Sends In-App Alert)"
                            className="w-full px-3 py-2 bg-[#081c15] border border-[#184d3c] rounded-xl text-[11px] text-[#f5efdf] placeholder-slate-500 focus:outline-none focus:border-[#d6a735]"
                          />
                        </div>

                        {/* Next line: Dedicated Create Room Button */}
                        <div>
                          <button
                            type="button"
                            disabled={onlineBusy}
                            onClick={() =>
                              void onlineAction("create", {
                                mode: roomMode,
                                wagerAmount: roomMode === "wager" ? wagerInput : 0,
                                isPrivate: isPrivateRoom,
                                targetUsername: challengeTargetUser.trim(),
                              })
                            }
                            className="w-full py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-extrabold rounded-xl text-xs transition-all shadow-md shadow-[#d6a735]/15 flex items-center justify-center gap-2"
                          >
                            <Plus size={15} />
                            <span>
                              Create {isPrivateRoom ? "Private" : "Public"} {roomMode === "wager" ? `GH₵ ${wagerInput} Wager` : "Casual"} Room
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Transparent Player-Facing Escrow Audit Trail Breakdown */}
                      {(roomMode === "wager" || room?.mode === "wager") && (
                        <div className="p-3 bg-[#06261f] border border-[#d6a735]/50 rounded-xl space-y-2 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[#d6a735] font-extrabold uppercase tracking-wider text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <ShieldCheck size={14} className="shrink-0" /> Escrow Vault Audit Trail
                            </span>
                            <span className="self-start sm:self-auto px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-500/30 text-[9px]">
                              Disputes &lt; 2h SLA
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-[#cbd5e1] pt-1.5 border-t border-[#184d3c]">
                            <div className="flex items-center justify-between sm:justify-start sm:gap-1">
                              <span>• Your Wager Stake:</span>
                              <strong className="text-[#f5efdf]">GH₵ {Number(wagerInput).toFixed(2)}</strong>
                            </div>
                            <div className="flex items-center justify-between sm:justify-start sm:gap-1">
                              <span>• Opponent Stake:</span>
                              <strong className="text-[#f5efdf]">GH₵ {Number(wagerInput).toFixed(2)}</strong>
                            </div>
                            <div className="flex items-center justify-between sm:justify-start sm:gap-1">
                              <span>• Total Wager Pot:</span>
                              <strong className="text-amber-300">GH₵ {(Number(wagerInput) * 2).toFixed(2)}</strong>
                            </div>
                            <div className="flex items-center justify-between sm:justify-start sm:gap-1">
                              <span>• Winner Takes Pot:</span>
                              <strong className="text-emerald-400">GH₵ {(Number(wagerInput) * 2).toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Join Room Section with Mobile & Desktop Optimization */}
                      <div className="p-3 bg-[#06261f] border border-[#184d3c] rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-extrabold text-[#d6a735] uppercase tracking-wider flex items-center gap-1.5">
                            <ArrowRight size={13} className="text-[#d6a735] shrink-0" />
                            <span>Join Existing Room</span>
                          </label>
                          <span className="text-[10px] text-slate-400">8-digit Code</span>
                        </div>
                        <div className="flex items-stretch w-full min-w-0 bg-[#081c15] border border-[#184d3c] rounded-xl overflow-hidden focus-within:border-[#d6a735] transition-all">
                          <input
                            type="text"
                            maxLength={8}
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="ENTER ROOM CODE (E.G. ABCD1234)"
                            className="flex-1 min-w-0 w-full px-3 py-2 bg-transparent text-xs font-mono font-bold tracking-widest text-[#f5efdf] placeholder-[#63716b] uppercase focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={onlineBusy || !joinCode}
                            onClick={() => void onlineAction("join", { code: joinCode })}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ArrowRight size={14} className="shrink-0" />
                            <span>Join Room</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {room && (
                    <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-xl space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                            Active Room Code
                          </span>
                          <span className="text-base font-mono font-black text-[#d6a735] tracking-widest">
                            {room.code}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={copyChallengeLink}
                          className="w-full sm:w-auto px-3 py-2 bg-[#144435] hover:bg-[#1f5e4a] text-[#f5efdf] text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 border border-[#184d3c] transition-colors"
                        >
                          <Share2 size={13} />
                          <span>{copiedLink ? "Link Copied!" : "Copy Challenge Link"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer with Mobile Responsiveness */}
            <div className="p-4 sm:px-6 sm:py-4 bg-[#0c3b2e] border-t border-[#184d3c] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-[#cbd5e1] text-center sm:text-left">
                FMJD 10x10 Compulsory Rules Active
              </span>
              <button
                type="button"
                onClick={() => {
                  if (mode === "online") {
                    if (!token) {
                      window.dispatchEvent(new CustomEvent("damii-open-auth"));
                      setOnlineError("Authentication Required: Please sign in or register an account to play online.");
                      return;
                    }
                    if (!room) {
                      setOnlineError("Please create a room or enter a valid room code to join before launching.");
                      return;
                    }
                    setShowPregameModal(false);
                    return;
                  }
                  if (subMode === "vs_cpu" && (cpuDifficulty === "medium" || cpuDifficulty === "hard") && (!token || !profile)) {
                    window.dispatchEvent(new CustomEvent("damii-open-auth"));
                    setMessage(`🔒 ${cpuDifficulty === "medium" ? "Tactical AI" : "Grandmaster"} requires a registered player account. Sign in or register to unlock.`);
                    return;
                  }
                  setLocalGameStarted(true);
                  resetLocalMatch();
                  setShowPregameModal(false);
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-[#d6a735]/20 flex items-center justify-center gap-2"
              >
                {subMode === "vs_cpu" && (cpuDifficulty === "medium" || cpuDifficulty === "hard") && (!token || !profile) ? (
                  <Lock size={14} />
                ) : (
                  <Play size={14} fill="currentColor" />
                )}
                <span>
                  {mode === "online"
                    ? "Enter Arena Room"
                    : subMode === "vs_cpu"
                    ? (cpuDifficulty === "medium" || cpuDifficulty === "hard") && (!token || !profile)
                      ? `Sign In to Play ${cpuDifficulty === "medium" ? "Tactical AI" : "Grandmaster"}`
                      : `Launch Bot Match (${cpuDifficulty === "easy" ? "Casual Bot" : cpuDifficulty === "medium" ? "Tactical AI" : "Grandmaster"})`
                    : "Launch Pass & Play"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Master Arena Preferences, Themes, Audio, Rules & Display Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setShowSettings(false)}
        >
          <section
            className="w-full max-w-xl bg-[#06261f] border-2 border-[#184d3c] rounded-2xl p-4 sm:p-6 shadow-2xl relative space-y-4 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#184d3c]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#d6a735]/15 border border-[#d6a735]/40 flex items-center justify-center text-[#d6a735] shrink-0">
                  <Settings size={18} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[#f5efdf] font-serif">
                    Arena Preferences & Options
                  </h2>
                  <p className="text-[11px] text-slate-300">
                    Customize themes, audio feedback, rules, and focus mode
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#144435] transition-colors"
                onClick={() => setShowSettings(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Segmented Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#0c3b2e] border border-[#184d3c] rounded-xl">
              <button
                type="button"
                onClick={() => setSettingsTab("themes")}
                className={`py-2 px-1 sm:px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  settingsTab === "themes"
                    ? "bg-[#d6a735] text-[#06261f] shadow-md shadow-[#d6a735]/20 font-black"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Palette size={13} />
                <span className="truncate">Themes</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab("audio")}
                className={`py-2 px-1 sm:px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  settingsTab === "audio"
                    ? "bg-[#d6a735] text-[#06261f] shadow-md shadow-[#d6a735]/20 font-black"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Volume2 size={13} />
                <span className="truncate">Audio</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab("rules")}
                className={`py-2 px-1 sm:px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  settingsTab === "rules"
                    ? "bg-[#d6a735] text-[#06261f] shadow-md shadow-[#d6a735]/20 font-black"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <HelpCircle size={13} />
                <span className="truncate">Rules</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab("display")}
                className={`py-2 px-1 sm:px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  settingsTab === "display"
                    ? "bg-[#d6a735] text-[#06261f] shadow-md shadow-[#d6a735]/20 font-black"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Sliders size={13} />
                <span className="truncate">Display</span>
              </button>
            </div>

            {/* TAB CONTENT: THEMES */}
            {settingsTab === "themes" && (
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin">
                {/* Board Theme Selection */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={13} /> Select Board Theme
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(Object.keys(BOARD_THEME_STYLES) as BoardThemeKey[]).map((key) => {
                      const cfg = BOARD_THEME_STYLES[key];
                      const isSelected = boardTheme === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => saveCustomTheme(key, marbleTheme)}
                          className={`p-2.5 rounded-xl text-left border transition-all flex items-start gap-2.5 ${
                            isSelected
                              ? "bg-[#0c3b2e] border-[#d6a735] ring-2 ring-[#d6a735]/30"
                              : "bg-[#0c3b2e]/50 border-[#184d3c] hover:border-[#22634d] hover:bg-[#0c3b2e]/80"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 border border-[#184d3c] shrink-0 shadow-sm">
                            <div style={{ backgroundColor: cfg.restBg }} />
                            <div style={{ backgroundColor: cfg.playableBg }} />
                            <div style={{ backgroundColor: cfg.playableAltBg }} />
                            <div style={{ backgroundColor: cfg.restBg }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <strong className="text-xs font-bold text-[#f5efdf]">{cfg.name}</strong>
                              {isSelected && <Check size={13} className="text-[#d6a735]" />}
                            </div>
                            <p className="text-[10px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                              {cfg.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Marble Style Selection */}
                <div className="space-y-2 pt-2 border-t border-[#184d3c]">
                  <h3 className="text-xs font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-1.5">
                    <Target size={13} /> Select Marble Style
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(Object.keys(MARBLE_THEME_STYLES) as MarbleThemeKey[]).map((key) => {
                      const cfg = MARBLE_THEME_STYLES[key];
                      const isSelected = marbleTheme === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => saveCustomTheme(boardTheme, key)}
                          className={`p-2.5 rounded-xl text-left border transition-all flex items-start gap-2.5 ${
                            isSelected
                              ? "bg-[#0c3b2e] border-[#d6a735] ring-2 ring-[#d6a735]/30"
                              : "bg-[#0c3b2e]/50 border-[#184d3c] hover:border-[#22634d] hover:bg-[#0c3b2e]/80"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#06261f] border border-[#184d3c] flex items-center justify-center gap-1 shrink-0">
                            <span className="w-3 h-3 rounded-full border shadow" style={cfg.whiteStyle} />
                            <span className="w-3 h-3 rounded-full border shadow" style={cfg.blackStyle} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <strong className="text-xs font-bold text-[#f5efdf]">{cfg.name}</strong>
                              {isSelected && <Check size={13} className="text-[#d6a735]" />}
                            </div>
                            <p className="text-[10px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                              {cfg.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Move Animation */}
                <div className="p-3 bg-[#0c3b2e] border border-[#184d3c] rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-bold text-[#f5efdf] flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[#d6a735]" /> Smooth Move Animations
                    </span>
                    <p className="text-[10px] text-slate-300">
                      Glides marbles smoothly across the 10x10 board.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePieceAnimation(!animatePieces)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      animatePieces ? "bg-[#d6a735]" : "bg-[#06261f]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#06261f] shadow transition duration-200 ${
                        animatePieces ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: AUDIO */}
            {settingsTab === "audio" && (
              <div className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin">
                <div className="flex items-center justify-between p-3 bg-[#0c3b2e] border border-[#184d3c] rounded-xl">
                  <div>
                    <strong className="text-xs font-bold text-[#f5efdf] block">Master Audio</strong>
                    <span className="text-[10px] text-slate-300">Toggle all sound effects</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSoundCat("master")}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg border transition-all ${
                      soundSettings.master
                        ? "bg-[#d6a735] text-[#06261f] border-[#d6a735]"
                        : "bg-[#06261f] text-slate-400 border-[#184d3c]"
                    }`}
                  >
                    {soundSettings.master ? "AUDIO ON" : "MUTED"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSoundCat("move")}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                      soundSettings.master && soundSettings.move
                        ? "bg-[#0c3b2e] border-[#184d3c] text-[#f5efdf]"
                        : "bg-[#06261f] border-[#184d3c] text-slate-500"
                    }`}
                  >
                    <div>
                      <strong className="block text-xs font-bold">Piece Movement</strong>
                      <span className="text-[10px] text-slate-400">Tactile placement</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      soundSettings.master && soundSettings.move ? "bg-[#d6a735]/20 text-[#d6a735]" : "bg-[#06261f] text-slate-500"
                    }`}>
                      {soundSettings.master && soundSettings.move ? "ON" : "OFF"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSoundCat("capture")}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                      soundSettings.master && soundSettings.capture
                        ? "bg-[#0c3b2e] border-[#184d3c] text-[#f5efdf]"
                        : "bg-[#06261f] border-[#184d3c] text-slate-500"
                    }`}
                  >
                    <div>
                      <strong className="block text-xs font-bold">Captures & Jumps</strong>
                      <span className="text-[10px] text-slate-400">Marble clack sound</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      soundSettings.master && soundSettings.capture ? "bg-[#d6a735]/20 text-[#d6a735]" : "bg-[#06261f] text-slate-500"
                    }`}>
                      {soundSettings.master && soundSettings.capture ? "ON" : "OFF"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSoundCat("win")}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                      soundSettings.master && soundSettings.win
                        ? "bg-[#0c3b2e] border-[#184d3c] text-[#f5efdf]"
                        : "bg-[#06261f] border-[#184d3c] text-slate-500"
                    }`}
                  >
                    <div>
                      <strong className="block text-xs font-bold">King & Victory</strong>
                      <span className="text-[10px] text-slate-400">Fanfare alerts</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      soundSettings.master && soundSettings.win ? "bg-[#d6a735]/20 text-[#d6a735]" : "bg-[#06261f] text-slate-500"
                    }`}>
                      {soundSettings.master && soundSettings.win ? "ON" : "OFF"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSoundCat("ui")}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                      soundSettings.master && soundSettings.ui
                        ? "bg-[#0c3b2e] border-[#184d3c] text-[#f5efdf]"
                        : "bg-[#06261f] border-[#184d3c] text-slate-500"
                    }`}
                  >
                    <div>
                      <strong className="block text-xs font-bold">UI Clicks & Alerts</strong>
                      <span className="text-[10px] text-slate-400">Interaction feedback</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      soundSettings.master && soundSettings.ui ? "bg-[#d6a735]/20 text-[#d6a735]" : "bg-[#06261f] text-slate-500"
                    }`}>
                      {soundSettings.master && soundSettings.ui ? "ON" : "OFF"}
                    </span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#184d3c]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Test Audio:</span>
                  <button
                    type="button"
                    onClick={() => soundService.playMove()}
                    className="px-2.5 py-1 bg-[#0c3b2e] hover:bg-[#144435] text-[10px] font-bold text-[#f5efdf] rounded-lg border border-[#184d3c] transition-colors"
                  >
                    🔊 Move
                  </button>
                  <button
                    type="button"
                    onClick={() => soundService.playCapture()}
                    className="px-2.5 py-1 bg-[#0c3b2e] hover:bg-[#144435] text-[10px] font-bold text-[#f5efdf] rounded-lg border border-[#184d3c] transition-colors"
                  >
                    💥 Capture
                  </button>
                  <button
                    type="button"
                    onClick={() => soundService.playKingPromotion()}
                    className="px-2.5 py-1 bg-[#0c3b2e] hover:bg-[#144435] text-[10px] font-bold text-[#f5efdf] rounded-lg border border-[#184d3c] transition-colors"
                  >
                    👑 King
                  </button>
                  <button
                    type="button"
                    onClick={() => soundService.playVictory()}
                    className="px-2.5 py-1 bg-[#0c3b2e] hover:bg-[#144435] text-[10px] font-bold text-[#f5efdf] rounded-lg border border-[#184d3c] transition-colors"
                  >
                    🏆 Victory
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: RULES & TUTORIAL */}
            {settingsTab === "rules" && (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin text-xs text-[#cbd5e1] leading-relaxed">
                <ol className="space-y-2.5 list-decimal list-inside">
                  <li>
                    <strong className="text-[#f5efdf]">10x10 Board & Diagonal Moves.</strong> White pieces move first. Men advance diagonally one square at a time onto dark squares.
                  </li>
                  <li>
                    <strong className="text-[#f5efdf]">Compulsory Captures.</strong> If an opposing piece is adjacent with an empty landing square behind it, jumping is mandatory. Backward capture jumps with regular men are legal!
                  </li>
                  <li>
                    <strong className="text-[#f5efdf]">Maximum Chain Continuations.</strong> If the capturing piece has further jumps available after landing, the multi-jump must be completed in the same turn.
                  </li>
                  <li>
                    <strong className="text-[#f5efdf]">Flying Kings.</strong> Reaching the opponent&apos;s baseline crowns the piece into a Flying King, capable of traversing long diagonals and jumping from any distance.
                  </li>
                  <li>
                    <strong className="text-[#f5efdf]">Victory.</strong> Capture all opponent pieces or leave them with no legal moves to win.
                  </li>
                </ol>
                <div className="p-3 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#d6a735] text-xs flex items-center gap-2">
                  <ShieldCheck size={16} className="shrink-0 text-[#d6a735]" />
                  <span>Fair play verified by server with deterministic move state.</span>
                </div>
              </div>
            )}

            {/* TAB CONTENT: DISPLAY & FOCUS */}
            {settingsTab === "display" && (
              <div className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin">
                <div className="p-3.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#f5efdf] flex items-center gap-1.5">
                      <Eye size={13} className="text-[#d6a735]" /> Arena Focus Mode
                    </span>
                    <p className="text-[10px] text-slate-300">
                      Dims secondary UI to prevent accidental misclicks during matches.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleFocusMode}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-lg border transition-all ${
                      focusMode
                        ? "bg-[#d6a735] text-[#06261f] border-[#d6a735]"
                        : "bg-[#06261f] text-slate-400 border-[#184d3c]"
                    }`}
                  >
                    {focusMode ? "FOCUS ACTIVE" : "FOCUS OFF"}
                  </button>
                </div>

                {profile && (
                  <div className="p-3.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl space-y-2">
                    <span className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider block">
                      Account Ledger
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-[#06261f] border border-[#184d3c] rounded-lg">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Points</span>
                        <strong className="text-sm font-bold text-sky-400 flex items-center gap-1">
                          <Zap size={14} /> {profile.points}
                        </strong>
                      </div>
                      <div className="p-2.5 bg-[#06261f] border border-[#184d3c] rounded-lg">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">ELO Rating</span>
                        <strong className="text-sm font-bold text-[#d6a735] flex items-center gap-1">
                          <Award size={14} /> {profile.rating}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-[#184d3c]">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-full py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-xs transition-all shadow-md"
              >
                Done
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Administrative Review / Dispute Report Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <section className="bg-[#06261f] border border-[#184d3c] rounded-2xl max-w-md w-full p-4 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#184d3c]">
              <div className="flex items-center gap-2">
                <Scale size={20} className="text-indigo-400" />
                <h2 className="text-base font-bold text-[#f5efdf]">Request Administrative Review</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#0c3b2e] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#cbd5e1]">
              <p>
                Placing this match under review preserves all <strong>move logs</strong>, <strong>timestamps</strong>, and <strong>connection telemetry</strong> for regulator oversight.
              </p>
              <div className="p-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[11px] text-indigo-200">
                ⚡ <strong>SLA Guarantee:</strong> Disputes and match reviews are examined and resolved by administrators within 2 hours.
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#f5efdf]">Reason / Issue Description</label>
              <textarea
                value={disputeNotesInput}
                onChange={(e) => setDisputeNotesInput(e.target.value)}
                placeholder="Explain the rules discrepancy, timer stall, or disconnection issue..."
                rows={3}
                className="w-full bg-[#031c17] border border-[#184d3c] focus:border-[#d6a735] text-[#f5efdf] text-xs p-3 rounded-xl outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="px-4 py-2 bg-[#0c3b2e] hover:bg-[#144435] text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={onlineBusy}
                onClick={() => reportDisputeOnline(disputeNotesInput)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                Submit for Review
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Challenge Acceptance Confirmation Modal */}
      {challengeToAccept && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <section className="bg-[#06261f] border-2 border-[#d6a735] rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#184d3c]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#d6a735]/20 border border-[#d6a735]/40 flex items-center justify-center text-[#d6a735]">
                  <Swords size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#f5efdf]">Accept Match Challenge</h2>
                  <p className="text-[11px] text-slate-300 font-mono">Room Code: {challengeToAccept.code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChallengeToAccept(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#0c3b2e] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-[#081c15] border border-[#184d3c] rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Challenger (Host):</span>
                <span className="font-extrabold text-[#f5efdf] flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f5efdf] inline-block" />
                  {challengeToAccept.hostName} (White)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Your Assigned Side:</span>
                <span className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#114232] border border-emerald-400 inline-block" />
                  You (Black)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Match Format:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  challengeToAccept.mode === "wager"
                    ? "bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40"
                    : "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                }`}>
                  {challengeToAccept.mode === "wager" ? "Wager Match" : "Casual Match (Free)"}
                </span>
              </div>

              {challengeToAccept.mode === "wager" && (() => {
                const userAvailableBal = Math.max(Number(profile?.points ?? 0), Number(profile?.marbles ?? 0));
                const isInsufficient = userAvailableBal < Number(challengeToAccept.wagerAmount);
                return (
                  <div className="pt-2 border-t border-[#184d3c] space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-300">
                      <span>Entry Stake (Wager):</span>
                      <strong className="text-[#d6a735]">GH₵ {Number(challengeToAccept.wagerAmount).toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Total Winner Pot:</span>
                      <strong className="text-emerald-400">GH₵ {(Number(challengeToAccept.wagerAmount) * 2).toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Your Current Balance:</span>
                      <span className="font-semibold text-slate-200">GH₵ {userAvailableBal.toFixed(2)}</span>
                    </div>
                    {isInsufficient && (
                      <div className="p-2 rounded-lg bg-red-950/70 border border-red-800/80 text-[11px] text-red-300 flex items-center gap-1.5">
                        <AlertTriangle size={13} className="shrink-0 text-red-400" />
                        <span>Insufficient balance (GH₵ {userAvailableBal.toFixed(2)}) for this GH₵ {Number(challengeToAccept.wagerAmount).toFixed(2)} wager. Please top up your wallet.</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Once you accept, you will connect to the room as Player 2. The host will be notified of your connection to begin the match.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setChallengeToAccept(null)}
                className="px-4 py-2.5 bg-[#0c3b2e] hover:bg-[#144435] text-slate-300 rounded-xl text-xs font-semibold"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={
                  onlineBusy ||
                  (challengeToAccept.mode === "wager" &&
                    Math.max(Number(profile?.points ?? 0), Number(profile?.marbles ?? 0)) < Number(challengeToAccept.wagerAmount))
                }
                onClick={async () => {
                  const targetCode = challengeToAccept.code;
                  setChallengeToAccept(null);
                  setMode("online");
                  await onlineAction("join", { code: targetCode });
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-[#d6a735] hover:brightness-110 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                <Swords size={15} /> Accept Challenge & Connect
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Match Summary Modal */}
      <MatchSummaryModal
        isOpen={showMatchSummaryModal}
        onClose={handleReturnToArenaLobby}
        onLobby={handleReturnToArenaLobby}
        onExamineBoard={() => setShowMatchSummaryModal(false)}
        winner={winner}
        board={board}
        totalMoves={activeMoves.length}
        whiteDisplayName={whiteDisplayName}
        blackDisplayName={blackDisplayName}
        whiteCaptures={captures.white}
        blackCaptures={captures.black}
        mode={mode}
        subMode={subMode}
        roomMode={roomMode}
        room={room}
        cpuDifficulty={cpuDifficulty}
        onRematch={
          mode === "local"
            ? () => {
                setLocalGameStarted(true);
                resetLocalMatch();
              }
            : () => {
                void requestRematch();
              }
        }
        onNewGame={() => {
          handleReturnToArenaLobby();
          setShowPregameModal(true);
        }}
        onReviewLog={() => {
          setShowMatchSummaryModal(false);
          setShowHistory(true);
        }}
        boardThemeBg={activeBoardConfig.boardBg}
        playableBg={activeBoardConfig.playableBg}
        playableAltBg={activeBoardConfig.playableAltBg}
        restBg={activeBoardConfig.restBg}
      />
    </main>
  );
}

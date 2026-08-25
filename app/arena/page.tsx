"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { SharedHeader } from "@/components/SharedHeader";
import { NavLink } from "@/components/NavLink";
import { MatchSummaryModal } from "@/components/MatchSummaryModal";
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
import type { MoveLogEntry, Room, League } from "@/lib/types";
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

type Room = {
  code: string;
  hostName: string;
  guestName: string | null;
  board: Board;
  turn: Player;
  forcedFrom: number | null;
  winner: Player | null;
  status: string;
  mode: RoomMode;
  wagerAmount: number;
  escrowId: string | null;
  leagueId?: string | null;
  moveCount: number;
  moves?: MoveLogEntry[];
  role: "white" | "black" | "spectator";
  timerState?: {
    timedOut: boolean;
    forfeitedPlayer: Player | null;
    remainingTurnSeconds: number;
    remainingDisconnectSeconds: number | null;
    warning: string | null;
  };
  updatedAt?: string;
};

type Profile = {
  username: string;
  rating: number;
  marbles?: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  role?: string;
  status?: string;
};

type LobbyPlayer = Profile & {
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
  const [cpuDifficulty, setCpuDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [turnTimerLimit, setTurnTimerLimit] = useState<number>(60);
  const [isCpuThinking, setIsCpuThinking] = useState(false);

  const [board, setBoard] = useState<Board>(() => createBoard());
  const [turn, setTurn] = useState<Player>("white");
  const [selected, setSelected] = useState<number | null>(null);
  const [forcedFrom, setForcedFrom] = useState<number | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const [message, setMessage] = useState("Setup your match to start playing!");
  const [rotated, setRotated] = useState(false);
  const [captures, setCaptures] = useState<Record<Player, number>>({ white: 0, black: 0 });
  const [localMoves, setLocalMoves] = useState<MoveLogEntry[]>([]);
  const [localGameStarted, setLocalGameStarted] = useState(false);

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

  const [focusMode, setFocusMode] = useState(false);

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

  function startBotMatch(difficulty: "easy" | "medium" | "hard" = cpuDifficulty) {
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

    // Check URL search params for direct 1-on-1 invite or vs bot
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const joinParam = params.get("join");
      const botParam = params.get("bot");
      const modeParam = params.get("mode");
      if (joinParam) {
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
        if (data.activeRooms) setLobbyRooms(data.activeRooms);
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
    const interval = window.setInterval(fetchLobbyData, 4000);
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

  // Poll online room state when in online mode
  useEffect(() => {
    if (mode !== "online" || !room || !token) return;
    const update = async () => {
      try {
        const response = await fetch(
          `/api/damii?code=${encodeURIComponent(room.code)}&token=${encodeURIComponent(token)}`
        );
        if (!response.ok) return;
        const data = await response.json();
        loadRoom(data.room);
      } catch {
        /* Retain last confirmed state */
      }
    };
    const timer = window.setInterval(update, 1500);
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
  }, [turn, room?.moveCount, mode, turnTimerLimit]);

  useEffect(() => {
    const matchReady = mode === "local" || room?.status === "playing";
    if (!matchReady || winner || turnTimerLimit === 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        const next = current > 0 ? current - 1 : 0;
        if (next < 10 && next > 0) {
          soundService.playUrgentTick(next);
        }
        if (next === 9) {
          soundService.playTurnReminder();
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode, room?.status, winner, turn, turnTimerLimit]);

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

  const moves = useMemo(
    () => (winner ? [] : legalMoves(board, turn, forcedFrom)),
    [board, turn, forcedFrom, winner]
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

  function loadRoom(next: Room) {
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
    } else if (isNewRoom && next.winner) {
      soundService.playVictory();
    }

    setRoom(next);

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

  function resetLocalMatch() {
    setBoard(createBoard());
    setTurn("white");
    setSelected(null);
    setForcedFrom(null);
    setWinner(null);
    setCaptures({ white: 0, black: 0 });
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, token, username: username.trim(), ...extra }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to complete action");
      if (data.profile) setProfile(data.profile);
      if (data.room) {
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

  async function cancelRoomOnline() {
    if (!room) return;
    await onlineAction("cancel_room", { code: room.code });
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

    const result = applyMove(board, turn, forcedFrom, move.from, move.to);
    if (result.captured)
      setCaptures((current) => ({ ...current, [turn]: current[turn] + 1 }));

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
    const url = `${window.location.origin}/arena?join=${room.code}`;
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

      {/* Arena Screen Control Toolbar */}
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-3 border border-[#184d3c] bg-[#06261f] text-[#f5efdf] rounded-2xl shadow-xl mt-2 sm:mt-3 mb-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Active Mode & Player Profile Indicator */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none max-w-full shrink">
            {mode === "local" ? (
              <span className="px-2.5 py-1 bg-[#0c3b2e] border border-[#184d3c] text-[#f5efdf] rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 shrink-0">
                {subMode === "vs_cpu" ? (
                  <>
                    <Bot size={13} className="text-[#d6a735]" />
                    <span className="truncate">AI ({cpuDifficulty})</span>
                  </>
                ) : (
                  <>
                    <Monitor size={13} className="text-[#d6a735]" />
                    <span className="truncate">Local 2P</span>
                  </>
                )}
              </span>
            ) : room ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2.5 py-1 bg-[#0c3b2e] border border-[#184d3c] text-[#f5efdf] rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1">
                  <Globe size={13} className="text-[#d6a735] shrink-0" />
                  <span>Room:</span>
                  <strong className="tracking-wider text-[#d6a735] font-mono">{room.code}</strong>
                  <button
                    onClick={copyRoomCode}
                    title="Copy Room Code"
                    className="hover:text-white transition-colors ml-0.5"
                  >
                    {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </span>
                {room.mode === "wager" && (
                  <span className="px-2 py-1 bg-amber-950/80 border border-amber-800 text-amber-300 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1">
                    <Zap size={12} className="text-amber-400" /> GH₵ {(room.wagerAmount * 2).toFixed(2)} Pot
                  </span>
                )}
              </div>
            ) : (
              <span className="px-2.5 py-1 bg-[#0c3b2e] border border-[#184d3c] text-[#d6a735] rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 shrink-0">
                <Globe size={13} className="text-[#d6a735]" />
                <span>Online Arena</span>
              </span>
            )}

            {/* Logged in User Badge */}
            {username && (
              <span className="px-2.5 py-1 bg-[#0c3b2e] border border-[#184d3c] text-[#d6a735] rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 shrink-0">
                <User size={12} className="text-[#d6a735]" />
                <span className="truncate max-w-[80px] xs:max-w-[110px] sm:max-w-none">{username}</span>
                {profile && (
                  <span className="text-[10px] text-[#cbd5e1] border-l border-[#184d3c] pl-1.5 hidden sm:inline">
                    {profile.rating} ELO
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Action Toolbar Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-between sm:justify-end">
            {profile?.role !== "admin" && profile?.role !== "super_admin" && (
              <button
                onClick={() => setShowPregameModal(true)}
                className="flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all shadow-md shadow-[#d6a735]/10"
              >
                <Swords size={13} />
                <span>{hasActiveGame ? "Match Setup" : "Create Match"}</span>
              </button>
            )}

            {hasActiveGame && (
              <button
                onClick={() => {
                  setRoom(null);
                  setMode("local");
                  setWinner(null);
                  setLocalMoves([]);
                  setLocalGameStarted(false);
                }}
                className="px-2.5 sm:px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] border border-[#184d3c] rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all"
                title="Return to Arena Lobby"
              >
                <Gamepad2 size={13} />
                <span>Lobby</span>
              </button>
            )}

            {hasActiveGame && (
              <button
                onClick={() => setShowHistory((prev) => !prev)}
                className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all border ${
                  showHistory
                    ? "bg-[#d6a735] text-[#06261f] border-[#d6a735] font-bold"
                    : "bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] border-[#184d3c]"
                }`}
              >
                <ListOrdered size={13} />
                <span>Move Log</span>
                {activeMoves.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${showHistory ? "bg-[#06261f] text-[#d6a735]" : "bg-[#d6a735]/20 text-[#d6a735]"}`}>
                    {activeMoves.length}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setShowSettings((prev) => !prev)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all border ${
                showSettings
                  ? "bg-[#d6a735] text-[#06261f] border-[#d6a735] font-bold"
                  : "bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] border-[#184d3c]"
              }`}
            >
              <Settings size={13} />
              <span className="hidden sm:inline">Config</span>
            </button>

            <button
              onClick={() => toggleSoundCat("master")}
              title={soundSettings.master ? "Master Audio Enabled" : "Master Audio Muted"}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all border ${
                soundSettings.master
                  ? "bg-[#0c3b2e] text-[#d6a735] border-[#184d3c] hover:bg-[#144435]"
                  : "bg-[#06261f] text-slate-500 border-[#184d3c]"
              }`}
            >
              {soundSettings.master ? <Volume2 size={13} className="text-[#d6a735]" /> : <VolumeX size={13} className="text-slate-500" />}
              <span className="hidden sm:inline">{soundSettings.master ? "Audio On" : "Muted"}</span>
            </button>

            <button
              onClick={toggleFocusMode}
              title={focusMode ? "Exit Arena Focus Mode" : "Enter Focus Mode (Prevents Accidental Misclicks)"}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all border ${
                focusMode
                  ? "bg-[#d6a735] text-[#06261f] border-[#d6a735] shadow-md shadow-[#d6a735]/20"
                  : "bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] border-[#184d3c]"
              }`}
            >
              <Eye size={13} />
              <span className="hidden xs:inline sm:inline">{focusMode ? "Focus ON" : "Focus"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Match Protection & Dispute SLA Banner */}
      {isMatchActive && (
        <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#06261f] via-[#0c3b2e] to-[#06261f] border border-[#d6a735]/40 rounded-xl text-[#f5efdf] text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-lg mb-1 sm:mb-2">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs truncate">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-extrabold text-[#d6a735] uppercase tracking-wider">1v1 Match In Progress</span>
            <span className="hidden sm:inline text-[#cbd5e1]">| Accidental navigation & misclicks protected</span>
          </div>
          <div className="flex items-center gap-2">
            {room?.mode === "wager" ? (
              <span className="text-[10px] sm:text-[11px] px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-extrabold rounded-md flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-400" />
                <span>Escrow SLA: Disputes resolved &lt; 2 hrs</span>
              </span>
            ) : (
              <span className="text-[10px] sm:text-[11px] px-2 py-0.5 bg-[#0c3b2e] border border-[#184d3c] text-[#d6a735] font-bold rounded-md flex items-center gap-1">
                <ShieldCheck size={12} className="text-[#d6a735]" />
                <span>Fair Play Protected</span>
              </span>
            )}
            <button
              onClick={toggleFocusMode}
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold shrink-0 flex items-center gap-1 transition-all border ${
                focusMode
                  ? "bg-[#d6a735] text-[#06261f] border-[#d6a735]"
                  : "bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] border-[#184d3c]"
              }`}
            >
              <Eye size={12} />
              <span>{focusMode ? "Focus Mode Active" : "Focus Mode"}</span>
            </button>
          </div>
        </div>
      )}

      {/* LOBBY VIEW vs GAME BOARD VIEW */}
      {!hasActiveGame ? (
        /* ARENA LOBBY HUB */
        <section className="flex-1 max-w-6xl w-full mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6">
          {/* Lobby Hero & Quick Actions Banner */}
          <div className="p-4 sm:p-6 bg-gradient-to-br from-[#06261f] via-[#0c3b2e] to-[#081c15] border-2 border-[#184d3c] rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-[#d6a735]/20 border border-[#d6a735]/40 text-[#d6a735] text-[10px] font-extrabold uppercase tracking-widest rounded-full flex items-center gap-1">
                  <Radio size={12} className="animate-pulse text-emerald-400" />
                  Live DAMII Arena
                </span>
                <span className="text-xs text-slate-400">10x10 Flying Kings & Compulsory Captures</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#f5efdf] font-serif">
                Arena Matchmaking & Live Hub
              </h1>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Watch active games in real time, challenge online grandmasters to free or wagered matches, or enter sanctioned tournaments.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => {
                  setMode("local");
                  setSubMode("vs_cpu");
                  setShowPregameModal(true);
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#d6a735]/20 transition-all hover:scale-[1.02]"
              >
                <Bot size={16} />
                <span>Play Vs Bot AI</span>
              </button>
              {profile?.role !== "admin" && profile?.role !== "super_admin" && (
                <button
                  type="button"
                  onClick={() => setShowPregameModal(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Swords size={16} className="text-[#d6a735]" />
                  <span>Match Setup</span>
                </button>
              )}
              <a
                href="/leagues"
                className="flex-1 sm:flex-none px-4 py-2.5 bg-[#081c15] hover:bg-[#0c3b2e] text-[#f5efdf] border border-[#184d3c] font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Trophy size={15} className="text-[#d6a735]" />
                <span>Tournaments</span>
              </a>
            </div>
          </div>

          {/* Lobby Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#184d3c] pb-2 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setLobbyTab("live")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
                lobbyTab === "live"
                  ? "bg-[#d6a735] text-[#06261f] shadow-md shadow-[#d6a735]/20"
                  : "bg-[#06261f] text-[#cbd5e1] hover:text-white border border-[#184d3c]"
              }`}
            >
              <Gamepad2 size={14} />
              <span>Live & Ongoing Games</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${lobbyTab === "live" ? "bg-[#06261f] text-[#d6a735]" : "bg-[#144435] text-slate-300"}`}>
                {lobbyRooms.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLobbyTab("players")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
                lobbyTab === "players"
                  ? "bg-[#d6a735] text-[#06261f] shadow-md shadow-[#d6a735]/20"
                  : "bg-[#06261f] text-[#cbd5e1] hover:text-white border border-[#184d3c]"
              }`}
            >
              <Users size={14} />
              <span>Online Players & Ranks</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${lobbyTab === "players" ? "bg-[#06261f] text-[#d6a735]" : "bg-[#144435] text-slate-300"}`}>
                {lobbyPlayers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLobbyTab("tournaments")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
                lobbyTab === "tournaments"
                  ? "bg-[#d6a735] text-[#06261f] shadow-md shadow-[#d6a735]/20"
                  : "bg-[#06261f] text-[#cbd5e1] hover:text-white border border-[#184d3c]"
              }`}
            >
              <Trophy size={14} />
              <span>Active Leagues & Brackets</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${lobbyTab === "tournaments" ? "bg-[#06261f] text-[#d6a735]" : "bg-[#144435] text-slate-300"}`}>
                {lobbyLeagues.length}
              </span>
            </button>
          </div>

          {/* TAB 1: LIVE ONGOING GAMES */}
          {lobbyTab === "live" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-[#f5efdf]">Active Game Rooms</h2>
                  <p className="text-xs text-slate-400">Spectate games in real time or jump into open rooms waiting for an opponent.</p>
                </div>
                {profile?.role !== "admin" && profile?.role !== "super_admin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("online");
                      setShowPregameModal(true);
                    }}
                    className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] border border-[#184d3c] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Plus size={14} />
                    <span>Host New Room</span>
                  </button>
                )}
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
                              onClick={async () => {
                                if (!token) {
                                  window.dispatchEvent(new CustomEvent("damii-open-auth"));
                                  return;
                                }
                                setMode("online");
                                await onlineAction("join", { code: r.code });
                              }}
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
                      const isOnline = Boolean(p.isOnline || p.presenceStatus === "online" || p.presenceStatus === "in_match");
                      const isInMatch = p.presenceStatus === "in_match";

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

                              {/* Online / In Match / Offline Status Badge */}
                              {isInMatch ? (
                                <span className="text-[10px] px-2.5 py-0.5 bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold rounded-full flex items-center gap-1.5 shrink-0">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                                  In Match
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
                          Players: <strong className="text-[#f5efdf]">{l.participants?.length || 0} / {l.maxPlayers}</strong>
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
      ) : (
        /* Main Arena Game Layout Container */
        <section className="flex-1 max-w-6xl w-full mx-auto p-1.5 sm:p-4 flex flex-col items-center justify-center">
          <div
            className={`w-full grid gap-3 sm:gap-6 transition-all duration-300 ${
              showHistory
                ? "lg:grid-cols-[1fr_340px] items-start"
                : "max-w-[580px] mx-auto"
            }`}
          >
            {/* Left / Central Game Stage Column */}
            <div className="w-full max-w-[580px] mx-auto space-y-2.5 sm:space-y-4">

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

            {/* Detached Players Panel - Isolated from Board Zoom & Layout Shifts */}
            <div className="w-full bg-[#06261f] border border-[#184d3c] rounded-2xl p-2.5 sm:p-3.5 shadow-xl">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-3 min-h-[52px] sm:min-h-[60px]">
                
                {/* Player 1 Card */}
                <div
                  className={`relative flex items-center gap-1 sm:gap-2.5 p-1 sm:p-2.5 rounded-xl transition-all border min-h-[44px] sm:min-h-[52px] ${
                    turn === "white" && !winner
                      ? secondsLeft < 10 && turnTimerLimit > 0 && (mode === "local" || room?.status === "playing")
                        ? "bg-red-950/40 border-red-500/90 ring-2 ring-red-500/70 shadow-lg shadow-red-500/20 animate-urgent-card"
                        : "bg-[#0c3b2e] border-[#d6a735] ring-2 ring-[#d6a735]/40 shadow-lg shadow-[#d6a735]/10"
                      : "bg-[#0c3b2e]/60 border-[#184d3c] opacity-80"
                  }`}
                >
                  <span className="w-6 h-6 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-amber-100 via-amber-200 to-amber-400 border-2 border-amber-200 shadow-md flex items-center justify-center text-slate-950 font-black text-[10px] sm:text-sm shrink-0">
                    ♔
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-0.5 sm:gap-1 h-3.5 sm:h-4">
                      <small className="block text-[7px] sm:text-[10px] font-bold tracking-wider text-[#d6a735] uppercase shrink-0">
                        PLAYER 1
                      </small>
                      {turn === "white" && !winner && (
                        secondsLeft < 10 && turnTimerLimit > 0 && (mode === "local" || room?.status === "playing") ? (
                          <span
                            className="px-1.5 py-0.2 text-[7px] sm:text-[9px] font-black rounded-full uppercase tracking-tighter shrink-0 animate-badge-urgent flex items-center gap-0.5 shadow-sm"
                            title="Turn clock urgent: less than 10 seconds remaining"
                          >
                            <Flame size={9} className="text-red-300 animate-bounce shrink-0" />
                            <span>{secondsLeft}s LEFT</span>
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 bg-[#d6a735] text-[#06261f] text-[7px] sm:text-[9px] font-extrabold rounded-full uppercase tracking-tighter transition-opacity shrink-0 opacity-100 animate-pulse">
                            TURN
                          </span>
                        )
                      )}
                    </div>
                    <strong className="block text-[11px] sm:text-sm font-extrabold text-[#f5efdf] truncate max-w-[65px] xs:max-w-[100px] sm:max-w-none">
                      {whiteDisplayName}
                    </strong>
                  </div>
                  <div className="text-right shrink-0">
                    <small className="block text-[7px] sm:text-[9px] text-[#cbd5e1] font-bold uppercase">Takes</small>
                    <span className="text-[11px] sm:text-sm font-black text-[#d6a735]">
                      {captures.white}
                    </span>
                  </div>
                </div>

                {/* VS & Match Timer Badge */}
                <div className="flex flex-col items-center justify-center gap-0.5 shrink-0 px-0.5 min-w-[38px] sm:min-w-[54px]">
                  <span className="px-1 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-black text-[#f5efdf] uppercase tracking-widest bg-[#0c3b2e] rounded-md border border-[#184d3c]">
                    VS
                  </span>
                  {turnTimerLimit > 0 ? (
                    secondsLeft < 10 && !winner && (mode === "local" || room?.status === "playing") ? (
                      <div
                        id="turn-timer-urgent-badge"
                        className="flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 bg-red-950/95 border border-red-500 rounded-md animate-timer-urgent text-red-200 shadow-md shadow-red-500/40 min-h-[20px]"
                        title="Urgent: Less than 10 seconds remaining on turn clock!"
                      >
                        <Flame size={10} className="text-red-400 animate-bounce shrink-0" />
                        <span className="text-[9px] sm:text-[11px] font-mono font-black text-red-200 tracking-tight">
                          {secondsLeft}s
                        </span>
                      </div>
                    ) : secondsLeft <= 15 && !winner && (mode === "local" || room?.status === "playing") ? (
                      <div
                        id="turn-timer-warning-badge"
                        className="flex items-center gap-0.5 px-1 py-0.5 bg-amber-950/70 border border-amber-500/70 rounded-md text-amber-300 animate-pulse min-h-[20px]"
                        title="Warning: 15 seconds remaining"
                      >
                        <Clock size={9} className="text-amber-400 shrink-0" />
                        <span className="text-[8px] sm:text-[10px] font-mono font-bold text-amber-300">
                          {secondsLeft}s
                        </span>
                      </div>
                    ) : (
                      <span
                        id="turn-timer-badge"
                        className="text-[8px] sm:text-[10px] font-mono font-bold px-1 py-0.5 rounded text-[#cbd5e1]"
                      >
                        {secondsLeft}s
                      </span>
                    )
                  ) : (
                    <span className="text-[8px] sm:text-[10px] text-slate-500 font-mono">∞</span>
                  )}
                </div>

                {/* Player 2 Card */}
                <div
                  className={`relative flex items-center justify-end gap-1 sm:gap-2.5 p-1 sm:p-2.5 rounded-xl transition-all border min-h-[44px] sm:min-h-[52px] ${
                    turn === "black" && !winner
                      ? secondsLeft < 10 && turnTimerLimit > 0 && (mode === "local" || room?.status === "playing")
                        ? "bg-red-950/40 border-red-500/90 ring-2 ring-red-500/70 shadow-lg shadow-red-500/20 animate-urgent-card"
                        : "bg-[#0c3b2e] border-[#d6a735] ring-2 ring-[#d6a735]/40 shadow-lg shadow-[#d6a735]/10"
                      : "bg-[#0c3b2e]/60 border-[#184d3c] opacity-80"
                  }`}
                >
                  <div className="text-left shrink-0">
                    <small className="block text-[7px] sm:text-[9px] text-[#cbd5e1] font-bold uppercase">Takes</small>
                    <span className="text-[11px] sm:text-sm font-black text-[#d6a735]">
                      {captures.black}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <div className="flex items-center justify-end gap-0.5 sm:gap-1 h-3.5 sm:h-4">
                      {turn === "black" && !winner && (
                        secondsLeft < 10 && turnTimerLimit > 0 && (mode === "local" || room?.status === "playing") ? (
                          <span
                            className="px-1.5 py-0.2 text-[7px] sm:text-[9px] font-black rounded-full uppercase tracking-tighter shrink-0 animate-badge-urgent flex items-center gap-0.5 shadow-sm"
                            title="Turn clock urgent: less than 10 seconds remaining"
                          >
                            <Flame size={9} className="text-red-300 animate-bounce shrink-0" />
                            <span>{secondsLeft}s LEFT</span>
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 bg-[#d6a735] text-[#06261f] text-[7px] sm:text-[9px] font-extrabold rounded-full uppercase tracking-tighter transition-opacity shrink-0 opacity-100 animate-pulse">
                            TURN
                          </span>
                        )
                      )}
                      <small className="block text-[7px] sm:text-[10px] font-bold tracking-wider text-[#d6a735] uppercase shrink-0">
                        PLAYER 2
                      </small>
                    </div>
                    <strong className="block text-[11px] sm:text-sm font-extrabold text-[#f5efdf] truncate max-w-[65px] xs:max-w-[100px] sm:max-w-none">
                      {blackDisplayName}
                    </strong>
                  </div>
                  <span className="w-6 h-6 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#0c3b2e] via-[#06261f] to-slate-950 border-2 border-[#184d3c] shadow-md flex items-center justify-center text-[#f5efdf] font-black text-[10px] sm:text-sm shrink-0">
                    {subMode === "vs_cpu" ? <Bot size={13} /> : "♚"}
                  </span>
                </div>
              </div>

              {/* Dynamic Turn Countdown Progress Bar */}
              {turnTimerLimit > 0 && !winner && (mode === "local" || room?.status === "playing") && (
                <div className="mt-2 w-full bg-[#041913] rounded-full h-1 sm:h-1.5 overflow-hidden border border-[#184d3c]/80 relative shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ease-linear ${
                      secondsLeft < 10
                        ? "bg-gradient-to-r from-red-600 via-rose-500 to-red-400 urgent-bar-animated shadow-[0_0_10px_rgba(239,68,68,0.9)]"
                        : secondsLeft <= 15
                        ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                        : "bg-gradient-to-r from-emerald-500 via-[#10b981] to-[#d6a735]"
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, (secondsLeft / turnTimerLimit) * 100))}%` }}
                  />
                </div>
              )}
            </div>

            {/* Standalone Board & Game Stage Card */}
            <div className="w-full bg-[#06261f] border border-[#184d3c] rounded-2xl p-2 sm:p-5 shadow-2xl space-y-2.5 sm:space-y-4">

            {/* Post-Match Summary Banner */}
            {(winner || (mode === "online" && (room?.status === "completed" || room?.status === "draw" || room?.status === "cancelled" || room?.status === "under_review"))) && (
              <div id="post-match-concluded-banner" className="relative overflow-hidden w-full bg-gradient-to-br from-[#06261f] via-[#081c15] to-[#04140f] border-2 border-[#d6a735]/80 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-300">
                {winner && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <span
                        key={i}
                        className="confetti-particle"
                        style={{
                          left: `${(i * 100) / 28}%`,
                          backgroundColor: ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"][i % 6],
                          animationDelay: `${(i % 5) * 0.35}s`,
                          animationDuration: `${2.2 + (i % 4) * 0.5}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 shrink-0">
                      {winner ? (
                        <Trophy size={32} className="animate-bounce" />
                      ) : (room?.status === "draw" || (room?.status === "completed" && !winner)) ? (
                        <Handshake size={32} className="animate-pulse text-[#d6a735]" />
                      ) : room?.status === "under_review" ? (
                        <Scale size={32} className="animate-pulse text-indigo-400" />
                      ) : (
                        <AlertTriangle size={32} className="text-amber-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 bg-[#d6a735] text-[#06261f] font-black text-[10px] uppercase tracking-wider rounded-full">
                          {winner
                            ? "MATCH CONCLUDED"
                            : (room?.status === "draw" || (room?.status === "completed" && !winner))
                            ? "MATCH DRAWN"
                            : room?.status === "under_review"
                            ? "UNDER REVIEW"
                            : "CANCELLED"}
                        </span>
                        <span className="text-xs text-slate-300">
                          {activeMoves.length} total moves played
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#f5efdf] mt-0.5">
                        {winner
                          ? (winner === "white" ? `${whiteDisplayName} Wins! 👑` : `${blackDisplayName} Wins! 👑`)
                          : (room?.status === "draw" || (room?.status === "completed" && !winner))
                          ? "Match Drawn by Agreement"
                          : room?.status === "under_review"
                          ? "Match Under Review"
                          : "Match Cancelled"}
                      </h2>
                    </div>
                  </div>

                  {/* Primary CTA: Open Match Summary Modal & Share Result */}
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end flex-wrap">
                    <button
                      id="view-match-summary-btn"
                      type="button"
                      onClick={() => setShowMatchSummaryModal(true)}
                      className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-[#d6a735] hover:brightness-110 text-[#06261f] font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
                    >
                      <Trophy size={15} />
                      <span>View Match Summary</span>
                    </button>

                    <button
                      id="post-match-share-btn"
                      type="button"
                      onClick={() => void copyShareResult()}
                      className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
                    >
                      {copiedShareResult ? (
                        <>
                          <Check size={14} className="text-emerald-300" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 size={14} />
                          <span>Share Result</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Secondary Quick Action Bar */}
                <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#184d3c] text-xs">
                  <div className="flex items-center gap-3 text-slate-300 text-[11px]">
                    <span>⚪ {whiteDisplayName}: <strong className="text-[#d6a735]">{captures.white} captures</strong></span>
                    <span>⚫ {blackDisplayName}: <strong className="text-emerald-400">{captures.black} captures</strong></span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {mode === "local" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setLocalGameStarted(true);
                            resetLocalMatch();
                          }}
                          className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] font-bold text-xs rounded-lg border border-[#184d3c] flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw size={13} /> Rematch
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPregameModal(true)}
                          className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] font-bold text-xs rounded-lg border border-[#184d3c] flex items-center gap-1 transition-colors"
                        >
                          <Swords size={13} /> Setup
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={onlineBusy}
                          onClick={() => void requestRematch()}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw size={13} /> Rematch
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRoom(null);
                            setShowPregameModal(true);
                          }}
                          className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] font-bold text-xs rounded-lg border border-[#184d3c] flex items-center gap-1 transition-colors"
                        >
                          <Swords size={13} /> New Match
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowHistory((prev) => !prev)}
                      className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-slate-300 font-bold text-xs rounded-lg border border-[#184d3c] flex items-center gap-1 transition-colors"
                    >
                      <ListOrdered size={13} /> Move Log
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
                {/* Online Room Waiting & Handshake Banner */}
                {mode === "online" && room && room.status === "waiting" && (
                  <div className="p-3.5 sm:p-4 bg-gradient-to-br from-[#0c3b2e] to-[#06261f] border-2 border-[#d6a735]/70 rounded-2xl shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 bg-[#06261f] border border-[#184d3c] text-[#d6a735] font-mono font-black text-xs rounded-lg">
                          ROOM {room.code}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-1 ${
                          room.isPrivate
                            ? "bg-purple-950/80 text-purple-300 border border-purple-500/40"
                            : "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                        }`}>
                          {room.isPrivate ? <Lock size={11} /> : <Globe size={11} />}
                          {room.isPrivate ? "Private Room (Invite-only)" : "Public Match (Visible in Lobby)"}
                        </span>
                        {room.mode === "wager" && (
                          <span className="px-2 py-0.5 bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40 text-[10px] font-bold rounded-md flex items-center gap-1">
                            <Zap size={11} /> Pot: GH₵ {(room.wagerAmount * 2).toFixed(2)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={copyChallengeLink}
                          className="px-2.5 py-1 bg-[#144435] hover:bg-[#1f5e4a] text-[#f5efdf] text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Share2 size={12} /> {copiedLink ? "Link Copied!" : "Share Link"}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await navigator.clipboard.writeText(room.code).then(() => true).catch(() => false);
                            if (ok) {
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 2000);
                            }
                          }}
                          className="px-2.5 py-1 bg-[#144435] hover:bg-[#1f5e4a] text-[#f5efdf] text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Copy size={12} /> {copiedCode ? "Code Copied!" : "Copy Code"}
                        </button>
                      </div>
                    </div>

                    {/* Handshake Status Section */}
                    {!room.guestName ? (
                      /* Waiting for challenger to join */
                      <div className="p-3 bg-[#081c15]/90 border border-[#184d3c] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
                            <Clock size={18} />
                          </div>
                          <div>
                            <strong className="text-xs sm:text-sm text-[#f5efdf] block font-extrabold">
                              Waiting for an Opponent to Accept
                            </strong>
                            <p className="text-[11px] text-slate-300">
                              {room.isPrivate
                                ? "Share the 6-character room code or invite link with your opponent to connect."
                                : "Your challenge is publicly listed in the Arena Lobby for any online player to accept."}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={onlineBusy}
                          onClick={() => void onlineAction("leave_room", { code: room.code })}
                          className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/40 text-xs font-bold rounded-xl transition-all shrink-0"
                        >
                          Cancel Room
                        </button>
                      </div>
                    ) : (
                      /* Guest connected: Handshake & Ready Section */
                      <div className="p-3.5 bg-gradient-to-r from-emerald-950/90 to-[#081c15] border-2 border-emerald-500/50 rounded-xl space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300 shrink-0">
                              <Swords size={18} className="animate-bounce text-emerald-300" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-black text-emerald-300">
                                  Challenger Connected!
                                </span>
                                <span className="px-1.5 py-0.2 bg-emerald-900 text-emerald-200 text-[9px] font-extrabold rounded">
                                  ● Ready
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-200">
                                <strong>{room.guestName}</strong> accepted your challenge and is in the room.
                              </p>
                            </div>
                          </div>

                          {/* Ready & Start Action for Host / Status for Guest */}
                          {room.role === "white" ? (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <button
                                type="button"
                                disabled={onlineBusy}
                                onClick={() => void onlineAction("ready", { code: room.code })}
                                className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-[#d6a735] hover:brightness-110 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all animate-pulse"
                              >
                                <Play size={14} className="fill-current" /> Ready — Start Match
                              </button>
                              <button
                                type="button"
                                disabled={onlineBusy}
                                onClick={() => void onlineAction("leave_room", { code: room.code })}
                                className="px-3 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 text-xs font-bold rounded-xl transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <span className="text-xs text-amber-300 font-bold animate-pulse flex items-center gap-1">
                                <Clock size={12} /> Waiting for host to click Ready...
                              </span>
                              <button
                                type="button"
                                disabled={onlineBusy}
                                onClick={() => void onlineAction("leave_room", { code: room.code })}
                                className="px-3 py-1.5 bg-[#144435] hover:bg-[#1f5e4a] text-slate-300 text-xs font-bold rounded-xl border border-[#184d3c] transition-all"
                              >
                                Leave Room
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Active 10x10 Board Container with Touch Prevention & Adaptive Zoom */}
              <div
                className={`p-1.5 sm:p-3 ${activeBoardConfig.wrapBg} border-2 ${activeBoardConfig.wrapBorder} rounded-xl shadow-inner relative transition-colors duration-300 board-touch-contain select-none`}
                style={{ touchAction: "none", overscrollBehavior: "none" }}
              >
                {/* King Promotion Event Banner Toast */}
                {promotedKingEffect && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-[11px] sm:text-sm rounded-full shadow-2xl flex items-center gap-1.5 border-2 border-amber-200 animate-in fade-in slide-in-from-top-4 duration-300 max-w-[92%]">
                    <Sparkles size={14} className="animate-spin text-slate-950 shrink-0" />
                    <span className="truncate">👑 FLYING KING PROMOTED for {promotedKingEffect.player === "white" ? whiteDisplayName : blackDisplayName}!</span>
                  </div>
                )}

                {/* Adaptive Board Zoom Toolbar */}
                <div className="flex items-center justify-between mb-2 px-1 text-xs select-none">
                  <div className="flex items-center gap-1.5 text-[#f5efdf]">
                    <Maximize2 size={13} className="text-[#d6a735]" />
                    <span className="font-bold text-[10px] sm:text-xs">Adaptive Board Zoom:</span>
                  </div>
                  <div className="flex items-center gap-1 bg-[#06261f] p-1 rounded-lg border border-[#184d3c]">
                    {[1, 1.25, 1.5, 1.75].map((z) => (
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
            </div>

            {/* Dynamic Turn Status & Message Banner */}
            <div className={`flex flex-wrap items-center justify-between p-2.5 sm:p-3 rounded-xl text-xs gap-2 min-h-[42px] sm:min-h-[46px] transition-all border ${
              secondsLeft < 10 && turnTimerLimit > 0 && !winner && (mode === "local" || room?.status === "playing")
                ? "bg-red-950/60 border-red-500/80 shadow-md shadow-red-500/10"
                : "bg-[#0c3b2e]/90 border-[#184d3c]"
            }`}>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[#f5efdf] font-medium min-w-0 flex-1">
                <span className={`turn-dot ${turn} shrink-0`} />
                <span className="truncate font-semibold text-[11px] sm:text-xs">{message}</span>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#06261f] border border-[#184d3c] rounded-lg text-[10px] sm:text-xs text-[#f5efdf] shrink-0 min-h-[24px]">
                <span className="font-bold text-[#d6a735]">Last Move:</span>
                <span className="font-mono text-[#f5efdf]">
                  {lastMove
                    ? `${lastMove.playerName || (lastMove.player === "white" ? whiteDisplayName : blackDisplayName)}: sq ${lastMove.from} ➔ sq ${lastMove.to}`
                    : "Start"}
                </span>
              </div>

              {secondsLeft < 10 && turnTimerLimit > 0 && !winner && (mode === "local" || room?.status === "playing") && (
                <span
                  id="urgent-turn-status-badge"
                  className="px-1.5 sm:px-2 py-0.5 bg-red-950 text-red-200 border border-red-500 text-[9px] sm:text-[10px] font-black rounded-lg uppercase tracking-tight shrink-0 animate-badge-urgent flex items-center gap-1 shadow-sm shadow-red-500/30"
                  title="Turn timer alert: less than 10 seconds remaining"
                >
                  <AlertTriangle size={10} className="text-red-300 animate-bounce shrink-0" />
                  <span>{secondsLeft}s Clock Alert!</span>
                </span>
              )}

              {mustCapture && !winner && (
                <span className="px-1.5 sm:px-2 py-0.5 bg-red-950 text-red-300 border border-red-800 text-[9px] sm:text-[10px] font-extrabold rounded uppercase tracking-wider shrink-0 animate-pulse">
                  Compulsory Capture!
                </span>
              )}
            </div>

            {/* Quick Action Controls */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full xs:w-auto">
                <button
                  type="button"
                  onClick={() => setRotated((v) => !v)}
                  className="flex-1 xs:flex-initial px-2.5 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 border border-[#184d3c] transition-colors"
                >
                  ⇅ Flip
                </button>

                <button
                  type="button"
                  onClick={() => setShowThemeModal(true)}
                  className="flex-1 xs:flex-initial px-2.5 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 border border-[#184d3c] transition-colors"
                >
                  <Palette size={13} /> Theme
                </button>

                <button
                  type="button"
                  onClick={() => setShowGuide(true)}
                  className="flex-1 xs:flex-initial px-2.5 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 border border-[#184d3c] transition-colors"
                >
                  <HelpCircle size={13} /> Rules
                </button>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 w-full xs:w-auto justify-end">
                {mode === "local" && (
                  <button
                    type="button"
                    onClick={resetLocalMatch}
                    className="w-full xs:w-auto px-2.5 py-1.5 bg-[#d6a735]/15 hover:bg-[#d6a735]/25 text-[#d6a735] rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 border border-[#d6a735]/40 transition-colors"
                  >
                    <RotateCcw size={13} /> Restart
                  </button>
                )}

                {mode === "online" && room?.status === "playing" && !winner && (
                  <>
                    <button
                      type="button"
                      disabled={onlineBusy || Boolean(room?.drawOfferedBy)}
                      onClick={() => void offerDrawOnline()}
                      className="w-full xs:w-auto px-2.5 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 border border-[#184d3c] transition-colors disabled:opacity-50"
                      title="Offer a mutual draw to opponent"
                    >
                      <Handshake size={13} /> Draw
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDisputeModal(true)}
                      className="w-full xs:w-auto px-2.5 py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-indigo-300 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 border border-[#184d3c] transition-colors"
                      title="Report issue for administrative review"
                    >
                      <Scale size={13} /> Review
                    </button>

                    <button
                      type="button"
                      onClick={() => void forfeitOnline()}
                      className="w-full xs:w-auto px-2.5 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 border border-red-800 transition-colors"
                    >
                      <AlertTriangle size={13} /> Forfeit
                    </button>
                  </>
                )}

                {winner && (
                  <button
                    type="button"
                    disabled={onlineBusy}
                    onClick={() => void requestRematch()}
                    className="w-full xs:w-auto px-3 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] rounded-lg text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 transition-all shadow-md shadow-[#d6a735]/10"
                  >
                    <RefreshCw size={13} /> Play Again
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

          {/* Dedicated Side Panel Move History */}
          {showHistory && (
            <div className="w-full max-w-[580px] mx-auto bg-[#06261f] border border-[#184d3c] rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-col h-[400px] sm:h-[600px] animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#184d3c]">
                <div className="flex items-center gap-2">
                  <ListOrdered size={16} className="text-[#d6a735]" />
                  <h3 className="text-xs sm:text-sm font-bold text-[#f5efdf]">Match Move History</h3>
                  <span className="px-2 py-0.5 bg-[#0c3b2e] border border-[#184d3c] text-[#d6a735] rounded-full text-[10px] font-extrabold">
                    {activeMoves.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#0c3b2e] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="py-2 flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800/80">
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 sm:p-1 rounded-lg border border-slate-800 overflow-x-auto max-w-full">
                  <button
                    onClick={() => setNotationStyle("alg")}
                    className={`px-2 py-1 text-[9px] sm:text-[10px] font-bold rounded transition-colors whitespace-nowrap ${
                      notationStyle === "alg"
                        ? "bg-amber-500 text-slate-950"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Algebraic (D4-E5)
                  </button>
                  <button
                    onClick={() => setNotationStyle("sq")}
                    className={`px-2 py-1 text-[9px] sm:text-[10px] font-bold rounded transition-colors whitespace-nowrap ${
                      notationStyle === "sq"
                        ? "bg-amber-500 text-slate-950"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Squares (32-28)
                  </button>
                  <button
                    onClick={() => setNotationStyle("both")}
                    className={`px-2 py-1 text-[9px] sm:text-[10px] font-bold rounded transition-colors whitespace-nowrap ${
                      notationStyle === "both"
                        ? "bg-amber-500 text-slate-950"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Both
                  </button>
                </div>

                <button
                  onClick={copyMoveLog}
                  disabled={activeMoves.length === 0}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 rounded-lg text-[10px] sm:text-[11px] font-semibold border border-slate-700 flex items-center gap-1 transition-colors ml-auto"
                >
                  {copiedHistory ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedHistory ? "Copied" : "Export"}</span>
                </button>
              </div>

              <div
                ref={historyScrollRef}
                className="flex-1 overflow-y-auto py-2 pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800"
              >
                {activeMoves.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                    <FileText size={32} className="opacity-40 text-amber-400" />
                    <p className="text-xs font-medium">No moves played yet.</p>
                    <span className="text-[10px]">Move history with custom player names will appear here.</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="grid grid-cols-[36px_1fr_1fr] text-[10px] font-bold text-slate-500 uppercase px-2 py-1 border-b border-slate-800/50">
                      <span>#</span>
                      <span className="truncate flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-300" /> {whiteDisplayName}</span>
                      <span className="truncate flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {blackDisplayName}</span>
                    </div>

                    {pairedMoves.map((pair) => (
                      <div
                        key={pair.turnNum}
                        className="grid grid-cols-[36px_1fr_1fr] items-center text-xs px-2 py-1.5 rounded-lg bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800/40 transition-colors font-mono"
                      >
                        <span className="text-slate-500 font-bold text-[11px]">{pair.turnNum}.</span>

                        <div>
                          {pair.white ? (
                            <span
                              className={`inline-flex items-center gap-1 font-bold ${
                                pair.white.isCapture ? "text-amber-300" : "text-slate-200"
                              }`}
                            >
                              {notationStyle === "alg"
                                ? pair.white.algNotation
                                : notationStyle === "sq"
                                ? pair.white.sqNotation
                                : pair.white.notation}
                              {pair.white.isCapture && (
                                <span className="text-[10px] text-amber-400" title="Compulsory Capture">
                                  💥
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-700">-</span>
                          )}
                        </div>

                        <div>
                          {pair.black ? (
                            <span
                              className={`inline-flex items-center gap-1 font-bold ${
                                pair.black.isCapture ? "text-emerald-300" : "text-slate-200"
                              }`}
                            >
                              {notationStyle === "alg"
                                ? pair.black.algNotation
                                : notationStyle === "sq"
                                ? pair.black.sqNotation
                                : pair.black.notation}
                              {pair.black.isCapture && (
                                <span className="text-[10px] text-emerald-400" title="Compulsory Capture">
                                  💥
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-700">-</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                <span>FMJD 10x10 Standard Notation</span>
                <span className="text-amber-400 font-bold">compulsory capture &apos;x&apos;</span>
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Mandatory / Interactive Pregame Match Setup Modal */}
      {showPregameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-[#06261f] border-2 border-[#d6a735] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0c3b2e] border-b border-[#184d3c] flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-[#d6a735]">
                <Swords size={20} />
                <div>
                  <h2 className="text-base font-black text-[#f5efdf] font-serif">DAMII Pregame Match Configuration</h2>
                  <p className="text-[11px] text-[#cbd5e1]">Configure match mode and settings before launching the board.</p>
                </div>
              </div>
              <button
                onClick={() => setShowPregameModal(false)}
                className="text-[#cbd5e1] hover:text-white p-1.5 rounded-xl hover:bg-[#144435] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="p-6 space-y-6 overflow-y-auto">

              {(profile?.role === "admin" || profile?.role === "super_admin") && (
                <div className="p-4 bg-amber-950/90 border border-amber-500/80 rounded-xl text-[#f5efdf] space-y-2 shadow-lg">
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
                <div className="grid grid-cols-3 gap-2 p-1 bg-[#0c3b2e] border border-[#184d3c] rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("local");
                      setSubMode("pass_play");
                    }}
                    className={`py-2.5 px-3 text-xs font-bold rounded-lg flex flex-col items-center gap-1 transition-all ${
                      mode === "local" && subMode === "pass_play"
                        ? "bg-[#d6a735] text-[#06261f] shadow-md"
                        : "text-[#cbd5e1] hover:text-white"
                    }`}
                  >
                    <Monitor size={16} />
                    <span>Pass & Play</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("local");
                      setSubMode("vs_cpu");
                    }}
                    className={`py-2.5 px-3 text-xs font-bold rounded-lg flex flex-col items-center gap-1 transition-all ${
                      mode === "local" && subMode === "vs_cpu"
                        ? "bg-[#d6a735] text-[#06261f] shadow-md"
                        : "text-[#cbd5e1] hover:text-white"
                    }`}
                  >
                    <Bot size={16} />
                    <span>Vs Bot AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("online")}
                    className={`py-2.5 px-3 text-xs font-bold rounded-lg flex flex-col items-center gap-1 transition-all ${
                      mode === "online"
                        ? "bg-[#d6a735] text-[#06261f] shadow-md"
                        : "text-[#cbd5e1] hover:text-white"
                    }`}
                  >
                    <Globe size={16} />
                    <span>Online 1-on-1</span>
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
                          ? "Casual Bot (Beginner)"
                          : cpuDifficulty === "medium"
                          ? "Tactical AI (Intermediate)"
                          : "Grandmaster (Pro FMJD)"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(
                        [
                          { key: "easy", label: "Casual Bot", desc: "Forgiving pace & simple captures" },
                          { key: "medium", label: "Tactical AI", desc: "Balanced positional tactics" },
                          { key: "hard", label: "Grandmaster", desc: "Ruthless multi-hop calculation" },
                        ] as const
                      ).map(({ key, label, desc }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setCpuDifficulty(key)}
                          className={`p-2.5 text-left rounded-xl border transition-all ${
                            cpuDifficulty === key
                              ? "bg-[#d6a735]/20 border-[#d6a735] text-[#d6a735] shadow-sm ring-1 ring-[#d6a735]/50"
                              : "bg-[#06261f] border-[#184d3c] text-[#cbd5e1] hover:text-white hover:border-[#22634f]"
                          }`}
                        >
                          <div className="text-xs font-bold flex items-center justify-between">
                            <span>{label}</span>
                            {cpuDifficulty === key && <span className="text-[10px]">●</span>}
                          </div>
                          <div className="text-[10px] opacity-75 mt-0.5 leading-tight">
                            {desc}
                          </div>
                        </button>
                      ))}
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

                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <select
                            value={roomMode}
                            onChange={(e) => setRoomMode(e.target.value as RoomMode)}
                            className="flex-1 px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
                          >
                            <option value="casual">Casual Match (Free)</option>
                            <option value="wager">Wager Match (GH₵ Escrow Pot)</option>
                          </select>

                          {roomMode === "wager" && (
                            <input
                              type="number"
                              min={10}
                              step={10}
                              value={wagerInput}
                              onChange={(e) => setWagerInput(Number(e.target.value))}
                              placeholder="Stake GH₵"
                              className="w-28 px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
                            />
                          )}

                          <button
                            type="button"
                            disabled={onlineBusy}
                            onClick={() =>
                              void onlineAction("create", {
                                mode: roomMode,
                                wagerAmount: roomMode === "wager" ? wagerInput : 0,
                                isPrivate: isPrivateRoom,
                              })
                            }
                            className="px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold rounded-xl text-xs transition-all shadow-md shadow-[#d6a735]/10 flex items-center gap-1 shrink-0"
                          >
                            <Plus size={14} /> Create Room
                          </button>
                        </div>

                        {/* Optional target player challenge field */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={challengeTargetUser}
                            onChange={(e) => setChallengeTargetUser(e.target.value)}
                            placeholder="Target Opponent Username (Optional - Sends Audio & In-App Alert)"
                            className="w-full px-3 py-1.5 bg-[#06261f] border border-[#184d3c] rounded-lg text-[11px] text-[#f5efdf] placeholder-slate-500 focus:outline-none focus:border-[#d6a735]"
                          />
                        </div>
                      </div>

                      {/* Transparent Player-Facing Escrow Audit Trail Breakdown */}
                      {(roomMode === "wager" || room?.mode === "wager") && (
                        <div className="p-3 bg-[#06261f] border border-[#d6a735]/50 rounded-xl space-y-2 text-xs">
                          <div className="flex items-center justify-between text-[#d6a735] font-extrabold uppercase tracking-wider text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <ShieldCheck size={14} /> Guaranteed Escrow Vault Audit Trail
                            </span>
                            <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-500/30 text-[9px]">
                              Disputes &lt; 2h SLA
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#cbd5e1] pt-1 border-t border-[#184d3c]">
                            <div>
                              • Your Wager Stake: <strong className="text-[#f5efdf]">GH₵ {Number(wagerInput).toFixed(2)}</strong> (Locked)
                            </div>
                            <div>
                              • Opponent Stake: <strong className="text-[#f5efdf]">GH₵ {Number(wagerInput).toFixed(2)}</strong> (Locked)
                            </div>
                            <div>
                              • Total Wager Pot: <strong className="text-amber-300">GH₵ {(Number(wagerInput) * 2).toFixed(2)}</strong>
                            </div>
                            <div>
                              • Winner Takes: <strong className="text-emerald-400">GH₵ {(Number(wagerInput) * 2 * 0.95).toFixed(2)}</strong> (5% platform fee)
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-[#184d3c]">
                        <input
                          type="text"
                          maxLength={8}
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          placeholder="ENTER ROOM CODE"
                          className="flex-1 px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs font-mono font-bold tracking-widest text-[#f5efdf] placeholder-[#63716b] uppercase focus:outline-none focus:border-[#d6a735]"
                        />
                        <button
                          type="button"
                          disabled={onlineBusy || !joinCode}
                          onClick={() => void onlineAction("join", { code: joinCode })}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shrink-0"
                        >
                          Join Room
                        </button>
                      </div>
                    </div>
                  )}

                  {room && (
                    <div className="p-3 bg-[#06261f]/80 border border-[#184d3c] rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#d6a735] uppercase">
                          ACTIVE ROOM: {room.code}
                        </span>
                        <button
                          type="button"
                          onClick={copyChallengeLink}
                          className="px-2 py-1 bg-[#144435] hover:bg-[#1f5e4a] text-[#f5efdf] text-[10px] font-bold rounded-lg flex items-center gap-1"
                        >
                          <Share2 size={12} />
                          {copiedLink ? "Link Copied!" : "Copy Challenge Link"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#0c3b2e] border-t border-[#184d3c] flex items-center justify-between">
              <span className="text-[11px] text-[#cbd5e1]">
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
                  setLocalGameStarted(true);
                  resetLocalMatch();
                  setShowPregameModal(false);
                }}
                className="px-6 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-[#d6a735]/20 flex items-center gap-2"
              >
                <Play size={14} fill="currentColor" />
                <span>
                  {mode === "online"
                    ? "Enter Arena Room"
                    : subMode === "vs_cpu"
                    ? `Launch Bot Match (${cpuDifficulty === "easy" ? "Casual Bot" : cpuDifficulty === "medium" ? "Tactical AI" : "Grandmaster"})`
                    : "Launch Pass & Play"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Drawer for Match Configurations & Settings */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#06261f] border-l-2 border-[#184d3c] h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-250">
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#184d3c]">
                <div className="flex items-center gap-2 text-[#f5efdf]">
                  <Settings size={20} className="text-[#d6a735]" />
                  <h3 className="text-base font-bold font-serif">Match Settings & Config</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#0c3b2e] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-[#cbd5e1] uppercase tracking-wider mb-2">
                    Game Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#0c3b2e] border border-[#184d3c] rounded-xl">
                    <button
                      type="button"
                      onClick={() => switchMode("local")}
                      className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        mode === "local"
                          ? "bg-[#d6a735] text-[#06261f] shadow-sm"
                          : "text-[#cbd5e1] hover:text-white"
                      }`}
                    >
                      <Monitor size={14} /> Local Device
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode("online")}
                      className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        mode === "online"
                          ? "bg-[#d6a735] text-[#06261f] shadow-sm"
                          : "text-[#cbd5e1] hover:text-white"
                      }`}
                    >
                      <Globe size={14} /> Online Arena
                    </button>
                  </div>
                </div>

                {mode === "online" && (
                  <div className="space-y-5 pt-2 border-t border-[#184d3c]">
                    {onlineError && (
                      <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                        <AlertTriangle size={15} className="shrink-0 text-red-400" />
                        <span>{onlineError}</span>
                      </div>
                    )}

                    {!token ? (
                      <div className="p-4 bg-[#0c3b2e] border border-[#d6a735]/40 rounded-2xl text-center space-y-3">
                        <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-xs">
                          <Lock size={15} className="text-[#d6a735]" />
                          <span>Authentication Required</span>
                        </div>
                        <p className="text-xs text-[#cbd5e1] leading-relaxed">
                          You must be signed in with a registered player account to create or join online matches.
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
                      <>
                        <div>
                          <label className="block text-xs font-bold text-[#cbd5e1] uppercase tracking-wider mb-1.5">
                            Public Player Name
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={20}
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="Enter display name"
                              className="flex-1 px-3 py-2 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] placeholder-[#63716b] focus:outline-none focus:border-[#d6a735]"
                            />
                            <button
                              type="button"
                              disabled={onlineBusy}
                              onClick={() => void onlineAction("profile")}
                              className="px-3 py-2 bg-[#144435] hover:bg-[#1f5e4a] text-[#f5efdf] text-xs font-bold rounded-xl border border-[#184d3c] transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-2xl">
                          <h4 className="text-xs font-bold text-[#f5efdf] flex items-center gap-1.5">
                            <Plus size={14} className="text-[#d6a735]" /> Create Online Room
                          </h4>

                          <div>
                            <label className="block text-[11px] font-medium text-[#cbd5e1] mb-1">
                              Match Type
                            </label>
                            <select
                              value={roomMode}
                              onChange={(e) => setRoomMode(e.target.value as RoomMode)}
                              className="w-full px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
                            >
                              <option value="casual">Casual Match (Free)</option>
                              <option value="wager">Wager Match (GH₵ Escrow Pot)</option>
                            </select>
                          </div>

                          {roomMode === "wager" && (
                            <div>
                              <label className="block text-[11px] font-medium text-[#cbd5e1] mb-1">
                                Wager Stake (GH₵ per player)
                              </label>
                              <input
                                type="number"
                                min={10}
                                step={10}
                                value={wagerInput}
                                onChange={(e) => setWagerInput(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
                              />
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={onlineBusy}
                            onClick={() =>
                              void onlineAction("create", {
                                mode: roomMode,
                                wagerAmount: roomMode === "wager" ? wagerInput : 0,
                              })
                            }
                            className="w-full py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold rounded-xl text-xs transition-all shadow-md shadow-[#d6a735]/10 flex items-center justify-center gap-1.5"
                          >
                            ＋ Create {roomMode === "wager" ? `GH₵ ${wagerInput} Wager` : "Casual"} Room
                          </button>
                        </div>

                        <div className="space-y-2 p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-2xl">
                          <h4 className="text-xs font-bold text-[#f5efdf] flex items-center gap-1.5">
                            <ArrowRight size={14} className="text-[#d6a735]" /> Join Private Room
                          </h4>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={8}
                              value={joinCode}
                              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                              placeholder="ROOM CODE"
                              className="flex-1 px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs font-mono font-bold tracking-widest text-[#f5efdf] placeholder-[#63716b] uppercase focus:outline-none focus:border-[#d6a735]"
                            />
                            <button
                              type="button"
                              disabled={onlineBusy || !joinCode}
                              onClick={() => void onlineAction("join", { code: joinCode })}
                              className="px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] font-bold text-xs rounded-xl transition-all"
                            >
                              Join
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {room && (
                      <div className="p-4 bg-[#06261f]/80 border border-[#184d3c] rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold tracking-wider text-[#d6a735] uppercase">
                            ACTIVE ROOM TICKET
                          </span>
                          <span className="text-xs font-bold text-[#f5efdf]">
                            Role: {room.role === "white" ? "Player 1" : room.role === "black" ? "Player 2" : "Spectator"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-[#0c3b2e] p-2.5 rounded-xl border border-[#184d3c]">
                          <strong className="text-lg font-mono font-black tracking-widest text-[#d6a735]">
                            {room.code}
                          </strong>
                          <button
                            type="button"
                            onClick={copyRoomCode}
                            className="px-2.5 py-1 bg-[#144435] hover:bg-[#1f5e4a] text-[#f5efdf] rounded-lg text-xs font-bold flex items-center gap-1 border border-[#184d3c] transition-colors"
                          >
                            {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                            {copiedCode ? "Copied" : "Copy Code"}
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {room.status === "waiting"
                            ? "Share code with opponent to start."
                            : `${room.hostName} vs ${room.guestName}`}
                          {room.mode === "wager" && ` · Pot: GH₵ ${(room.wagerAmount * 2).toFixed(2)}`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Granular Audio Settings Panel */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Volume2 size={15} className="text-amber-400" /> Granular Audio Controls
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleSoundCat("master")}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg border transition-all ${
                        soundSettings.master
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                          : "bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      Master: {soundSettings.master ? "ON" : "MUTED"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Piece Movement */}
                    <button
                      type="button"
                      onClick={() => toggleSoundCat("move")}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        soundSettings.master && soundSettings.move
                          ? "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600"
                          : "bg-slate-950/60 border-slate-800 text-slate-500"
                      }`}
                    >
                      <div>
                        <strong className="block text-xs font-bold">Piece Movement</strong>
                        <span className="text-[10px] text-slate-400">Tactile timber placement</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        soundSettings.master && soundSettings.move ? "bg-amber-400/20 text-amber-300" : "bg-slate-800 text-slate-600"
                      }`}>
                        {soundSettings.master && soundSettings.move ? "ON" : "OFF"}
                      </span>
                    </button>

                    {/* Captures & Jumps */}
                    <button
                      type="button"
                      onClick={() => toggleSoundCat("capture")}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        soundSettings.master && soundSettings.capture
                          ? "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600"
                          : "bg-slate-950/60 border-slate-800 text-slate-500"
                      }`}
                    >
                      <div>
                        <strong className="block text-xs font-bold">Captures & Jumps</strong>
                        <span className="text-[10px] text-slate-400">Crisp marble clack sound</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        soundSettings.master && soundSettings.capture ? "bg-amber-400/20 text-amber-300" : "bg-slate-800 text-slate-600"
                      }`}>
                        {soundSettings.master && soundSettings.capture ? "ON" : "OFF"}
                      </span>
                    </button>

                    {/* Victory & Kings */}
                    <button
                      type="button"
                      onClick={() => toggleSoundCat("win")}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        soundSettings.master && soundSettings.win
                          ? "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600"
                          : "bg-slate-950/60 border-slate-800 text-slate-500"
                      }`}
                    >
                      <div>
                        <strong className="block text-xs font-bold">King & Victory Fanfare</strong>
                        <span className="text-[10px] text-slate-400">Promotions & match wins</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        soundSettings.master && soundSettings.win ? "bg-amber-400/20 text-amber-300" : "bg-slate-800 text-slate-600"
                      }`}>
                        {soundSettings.master && soundSettings.win ? "ON" : "OFF"}
                      </span>
                    </button>

                    {/* UI Clicks & Alerts */}
                    <button
                      type="button"
                      onClick={() => toggleSoundCat("ui")}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        soundSettings.master && soundSettings.ui
                          ? "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600"
                          : "bg-slate-950/60 border-slate-800 text-slate-500"
                      }`}
                    >
                      <div>
                        <strong className="block text-xs font-bold">UI Clicks & Alerts</strong>
                        <span className="text-[10px] text-slate-400">Piece selection & warnings</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        soundSettings.master && soundSettings.ui ? "bg-amber-400/20 text-amber-300" : "bg-slate-800 text-slate-600"
                      }`}>
                        {soundSettings.master && soundSettings.ui ? "ON" : "OFF"}
                      </span>
                    </button>
                  </div>

                  {/* Sound Preview Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Test Sound:</span>
                    <button
                      type="button"
                      onClick={() => soundService.playMove()}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-300 rounded border border-slate-800 transition-colors"
                    >
                      🔊 Move
                    </button>
                    <button
                      type="button"
                      onClick={() => soundService.playCapture()}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-300 rounded border border-slate-800 transition-colors"
                    >
                      💥 Capture
                    </button>
                    <button
                      type="button"
                      onClick={() => soundService.playKingPromotion()}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-300 rounded border border-slate-800 transition-colors"
                    >
                      👑 King
                    </button>
                    <button
                      type="button"
                      onClick={() => soundService.playVictory()}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-300 rounded border border-slate-800 transition-colors"
                    >
                      🏆 Victory
                    </button>
                  </div>
                </div>

                {/* Granular Motion & Visual Controls */}
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={15} className="text-amber-400" /> Motion & Visual Effects
                  </label>

                  <button
                    type="button"
                    onClick={() => togglePieceAnimation(!animatePieces)}
                    className="w-full p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles size={18} className={animatePieces ? "text-amber-400 shrink-0" : "text-slate-600 shrink-0"} />
                      <div className="text-left">
                        <strong className="block text-slate-100 font-bold">
                          Piece Move Animation
                        </strong>
                        <span className="text-[10px] text-slate-400">
                          Smoothly slide pieces across board squares on every move
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                        animatePieces
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {animatePieces ? "ANIMATED" : "INSTANT"}
                    </span>
                  </button>
                </div>

                {profile && (
                  <div className="pt-4 border-t border-slate-800 space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Account Ledger
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <small className="block text-[10px] text-slate-500 font-bold uppercase">Points</small>
                        <strong className="text-sm font-bold text-sky-400 flex items-center gap-1">
                          <Zap size={14} /> {profile.points}
                        </strong>
                      </div>
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <small className="block text-[10px] text-slate-500 font-bold uppercase">Rating</small>
                        <strong className="text-sm font-bold text-amber-400 flex items-center gap-1">
                          <Award size={14} /> {profile.rating} ELO
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial / Rules Overlay */}
      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowGuide(false)}
        >
          <section
            className="w-full max-w-lg bg-[#06261f] border-2 border-[#d6a735] rounded-2xl p-6 shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-4 right-4 text-[#cbd5e1] hover:text-white p-1 rounded-lg hover:bg-[#144435] transition-colors"
              onClick={() => setShowGuide(false)}
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 text-[#d6a735]">
              <HelpCircle size={20} />
              <h2 className="text-lg font-bold text-[#f5efdf] font-serif">DAMII Rules & Tutorial</h2>
            </div>
            <ol className="space-y-2.5 text-xs text-[#cbd5e1] list-decimal list-inside leading-relaxed">
              <li>
                <strong className="text-[#f5efdf]">Move diagonally.</strong> Player 1 moves first. Select a highlighted piece then a highlighted destination square.
              </li>
              <li>
                <strong className="text-[#f5efdf]">Compulsory captures.</strong> Jump over an opponent into an empty square. If a jump is available, you MUST capture.
              </li>
              <li>
                <strong className="text-[#f5efdf]">Multiple jumps.</strong> If the same piece can capture again, you must continue jumping.
              </li>
              <li>
                <strong className="text-[#f5efdf]">Flying Kings.</strong> Reach the opponent&apos;s back row to promote to a King capable of flying across long diagonals.
              </li>
              <li>
                <strong className="text-[#f5efdf]">Match Victory.</strong> Capture all enemy pieces or block them from making legal moves.
              </li>
            </ol>
            <div className="p-3 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#d6a735] text-xs flex items-center gap-2">
              <ShieldCheck size={16} className="shrink-0 text-[#d6a735]" />
              <span>
                Server validates all moves, turn clocks, and wagers automatically.
              </span>
            </div>
            <button
              type="button"
              className="w-full py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold rounded-xl text-xs transition-all"
              onClick={() => setShowGuide(false)}
            >
              Got it, back to the game
            </button>
          </section>
        </div>
      )}

      {/* Device Board & Marble Customizer Modal */}
      {showThemeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setShowThemeModal(false)}
        >
          <section
            className="w-full max-w-xl bg-[#06261f] border-2 border-[#d6a735] rounded-2xl p-6 shadow-2xl relative space-y-5 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-4 right-4 text-[#cbd5e1] hover:text-white p-1 rounded-lg hover:bg-[#144435] transition-colors"
              onClick={() => setShowThemeModal(false)}
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 border-b border-[#184d3c] pb-4">
              <div className="w-10 h-10 rounded-xl bg-[#d6a735]/15 border border-[#d6a735]/40 flex items-center justify-center text-[#d6a735] shrink-0">
                <Palette size={22} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[#f5efdf] font-serif flex items-center gap-2">
                  Device Theme & Style Customizer
                </h2>
                <p className="text-xs text-[#cbd5e1]">
                  Customized per-device preferences saved locally to your browser.
                </p>
              </div>
            </div>

            {/* Board Theme Selection */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} /> Select Board Grid Theme
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(BOARD_THEME_STYLES) as BoardThemeKey[]).map((key) => {
                  const cfg = BOARD_THEME_STYLES[key];
                  const isSelected = boardTheme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => saveCustomTheme(key, marbleTheme)}
                      className={`p-3 rounded-xl text-left border transition-all flex items-start gap-3 ${
                        isSelected
                          ? "bg-[#0c3b2e] border-[#d6a735] ring-2 ring-[#d6a735]/30"
                          : "bg-[#0c3b2e]/50 border-[#184d3c] hover:border-[#22634d] hover:bg-[#0c3b2e]/80"
                      }`}
                    >
                      {/* Mini Board Swatch */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 border border-[#184d3c] shrink-0 shadow-md">
                        <div style={{ backgroundColor: cfg.restBg }} />
                        <div style={{ backgroundColor: cfg.playableBg }} />
                        <div style={{ backgroundColor: cfg.playableAltBg }} />
                        <div style={{ backgroundColor: cfg.restBg }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-xs font-bold text-[#f5efdf]">{cfg.name}</strong>
                          {isSelected && <Check size={14} className="text-[#d6a735]" />}
                        </div>
                        <p className="text-[10px] text-[#cbd5e1] leading-snug mt-0.5 line-clamp-2">
                          {cfg.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Marble Style Selection */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-1.5">
                <Target size={14} /> Select Marble Piece Style
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(MARBLE_THEME_STYLES) as MarbleThemeKey[]).map((key) => {
                  const cfg = MARBLE_THEME_STYLES[key];
                  const isSelected = marbleTheme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => saveCustomTheme(boardTheme, key)}
                      className={`p-3 rounded-xl text-left border transition-all flex items-start gap-3 ${
                        isSelected
                          ? "bg-[#0c3b2e] border-[#d6a735] ring-2 ring-[#d6a735]/30"
                          : "bg-[#0c3b2e]/50 border-[#184d3c] hover:border-[#22634d] hover:bg-[#0c3b2e]/80"
                      }`}
                    >
                      {/* Mini Marble Swatch */}
                      <div className="w-10 h-10 rounded-lg bg-[#06261f] border border-[#184d3c] flex items-center justify-center gap-1 shrink-0">
                        <span
                          className="w-4 h-4 rounded-full border shadow"
                          style={cfg.whiteStyle}
                        />
                        <span
                          className="w-4 h-4 rounded-full border shadow"
                          style={cfg.blackStyle}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-xs font-bold text-[#f5efdf]">{cfg.name}</strong>
                          {isSelected && <Check size={14} className="text-[#d6a735]" />}
                        </div>
                        <p className="text-[10px] text-[#cbd5e1] leading-snug mt-0.5 line-clamp-2">
                          {cfg.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Smooth Piece Motion Animation Toggle */}
            <div className="pt-2">
              <div className="flex items-center justify-between p-3.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl gap-3">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-bold text-[#f5efdf] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#d6a735] shrink-0" /> Smooth Piece Move Animations
                  </span>
                  <p className="text-[10px] text-[#cbd5e1] leading-tight">
                    Animates marbles smoothly with CSS transition spring-pop effects when moves occur.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => togglePieceAnimation(!animatePieces)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    animatePieces ? "bg-[#d6a735]" : "bg-[#06261f]"
                  }`}
                  role="switch"
                  aria-checked={animatePieces}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#06261f] shadow-lg ring-0 transition duration-200 ease-in-out ${
                      animatePieces ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Live Mini Preview Box */}
            <div className="p-3.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#f5efdf]">
                <span>Active Preview on Your Device</span>
                <span className="text-emerald-400 font-mono text-[10px]">Saved to localStorage</span>
              </div>
              <div className="flex items-center justify-center gap-4 py-2">
                <div
                  className="w-20 h-20 rounded-xl border border-[#d6a735]/40 p-1 grid grid-cols-3 grid-rows-3 shadow-lg"
                  style={{ backgroundColor: activeBoardConfig.boardBg }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                    const isPlayable = i % 2 === 1;
                    return (
                      <div
                        key={i}
                        className="rounded-sm flex items-center justify-center"
                        style={{
                          backgroundColor: isPlayable
                            ? activeBoardConfig.playableBg
                            : activeBoardConfig.restBg,
                        }}
                      >
                        {i === 1 && (
                          <span
                            className="w-3.5 h-3.5 rounded-full border shadow-sm"
                            style={activeMarbleConfig.whiteStyle}
                          />
                        )}
                        {i === 7 && (
                          <span
                            className="w-3.5 h-3.5 rounded-full border shadow-sm"
                            style={activeMarbleConfig.blackStyle}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="text-left space-y-1 text-xs">
                  <p className="text-[#f5efdf] font-bold">{activeBoardConfig.name}</p>
                  <p className="text-[#cbd5e1] text-[11px]">{activeMarbleConfig.name}</p>
                  <p className="text-[#d6a735] text-[10px] italic">Applies immediately to your board view</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-extrabold rounded-xl text-xs transition-all shadow-lg"
              onClick={() => setShowThemeModal(false)}
            >
              Done & Continue Playing
            </button>
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

              {challengeToAccept.mode === "wager" && (
                <div className="pt-2 border-t border-[#184d3c] space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Entry Stake (Marbles):</span>
                    <strong className="text-[#d6a735]">GH₵ {Number(challengeToAccept.wagerAmount).toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Total Winner Pot:</span>
                    <strong className="text-emerald-400">GH₵ {(Number(challengeToAccept.wagerAmount) * 2).toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Your Current Balance:</span>
                    <span>GH₵ {Number(profile?.marblesBalance || 0).toFixed(2)}</span>
                  </div>
                  {Number(profile?.marblesBalance || 0) < Number(challengeToAccept.wagerAmount) && (
                    <p className="text-[11px] text-red-400 font-bold pt-1">
                      ⚠️ Insufficient balance to match this wager. Please top up your wallet.
                    </p>
                  )}
                </div>
              )}
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
                disabled={onlineBusy || (challengeToAccept.mode === "wager" && Number(profile?.marblesBalance || 0) < Number(challengeToAccept.wagerAmount))}
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
        onClose={() => setShowMatchSummaryModal(false)}
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
        onNewGame={() => setShowPregameModal(true)}
        onReviewLog={() => setShowHistory(true)}
        onLobby={() => {
          setRoom(null);
          setWinner(null);
          setLocalMoves([]);
          setLocalGameStarted(false);
        }}
        boardThemeBg={activeBoardConfig.boardBg}
        playableBg={activeBoardConfig.playableBg}
        playableAltBg={activeBoardConfig.playableAltBg}
        restBg={activeBoardConfig.restBg}
      />
    </main>
  );
}

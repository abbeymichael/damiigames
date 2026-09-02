"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Trophy,
  Wallet,
  Swords,
  User,
  UserPlus,
  LogIn,
  LogOut,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Menu,
  Shield,
  Bell,
  Zap,
  Sparkles,
  Check,
  Phone,
  ChevronDown,
  ChevronRight,
  UserCog,
  Eye,
  Smartphone,
  Clock,
  RefreshCw,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Scale,
  Building2,
  Users,
  Award,
  Activity,
  FileText,
  Mail,
  MapPin,
  Calendar,
  UserCheck,
  Lock,
  Coins,
  Copy,
  EyeOff,
  Upload,
  Image as ImageIcon,
  Camera,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { getProfileRank } from "@/lib/rank-service";
import { NotificationCenter } from "@/components/NotificationCenter";
import { NavLink, safeNavigate } from "@/components/NavLink";
import { SYSTEM_AVATARS, validateAvatarFile, resizeImageToDataUrl } from "@/lib/avatars";
import {
  saveSessionToken,
  rotateSessionToken,
  revokeAllSessions,
  getAuthHeaders,
  clearSessionToken,
} from "@/lib/client-auth";
import MfaSecurityManager from "@/components/MfaSecurityManager";
import { authenticateWithPasskey } from "@/lib/webauthn-client";

type NotificationItem = {
  id: string;
  type: "league_invite" | "wager_settlement" | "system";
  title: string;
  message: string;
  timestamp: string;
  link: string;
};

const DEFAULT_FALLBACK_REGIONS: { id: string; name: string; code?: string }[] = [
  { id: "reg-greater-accra", name: "Greater Accra", code: "GA" },
  { id: "reg-ashanti", name: "Ashanti", code: "AS" },
  { id: "reg-western", name: "Western", code: "WP" },
  { id: "reg-eastern", name: "Eastern", code: "EP" },
  { id: "reg-central", name: "Central", code: "CP" },
  { id: "reg-northern", name: "Northern", code: "NP" },
  { id: "reg-volta", name: "Volta", code: "VR" },
  { id: "reg-upper-east", name: "Upper East", code: "UE" },
  { id: "reg-upper-west", name: "Upper West", code: "UW" },
  { id: "reg-bono", name: "Bono", code: "BO" },
  { id: "reg-bono-east", name: "Bono East", code: "BE" },
  { id: "reg-ahafo", name: "Ahafo", code: "AH" },
  { id: "reg-western-north", name: "Western North", code: "WN" },
  { id: "reg-oti", name: "Oti", code: "OT" },
  { id: "reg-savannah", name: "Savannah", code: "SV" },
  { id: "reg-north-east", name: "North East", code: "NE" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [userToken, setUserToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [points, setPoints] = useState(0);
  const [role, setRole] = useState("user");
  const [roleTitle, setRoleTitle] = useState<string>("");
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [rating, setRating] = useState(1000);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [draws, setDraws] = useState(0);
  const [winStreak, setWinStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [matchesLast7Days, setMatchesLast7Days] = useState(0);
  const [opponentRatingAvg, setOpponentRatingAvg] = useState(1000);
  const [organizerStatus, setOrganizerStatus] = useState<string>("none");
  const [organizationName, setOrganizationName] = useState<string>("");

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Active match protection & Arena Focus mode
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkMatchState = () => {
      if (typeof window !== "undefined") {
        setIsMatchActive(sessionStorage.getItem("damii-active-match") === "true");
        setIsFocusMode(sessionStorage.getItem("damii-focus-mode") === "true");
      }
    };

    checkMatchState();

    const handleMatchChange = (e: CustomEvent<boolean> | Event) => {
      if (e && "detail" in e && typeof e.detail === "boolean") {
        setIsMatchActive(e.detail);
      } else {
        checkMatchState();
      }
    };

    const handleFocusChange = (e: CustomEvent<boolean> | Event) => {
      if (e && "detail" in e && typeof e.detail === "boolean") {
        setIsFocusMode(e.detail);
      } else {
        checkMatchState();
      }
    };

    window.addEventListener("damii-match-active-change", handleMatchChange as EventListener);
    window.addEventListener("damii-focus-mode-change", handleFocusChange as EventListener);

    return () => {
      window.removeEventListener("damii-match-active-change", handleMatchChange as EventListener);
      window.removeEventListener("damii-focus-mode-change", handleFocusChange as EventListener);
    };
  }, []);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (isMatchActive && pathname === "/arena" && href !== "/arena" && href !== "#") {
      e.preventDefault();
      e.stopPropagation();
      setPendingNavUrl(href);
    }
  };

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Auth modal state
  const [authMode, setAuthMode] = useState<"login" | "register" | "complete_profile">("login");
  const [regAccountType, setRegAccountType] = useState<"player" | "organizer">("player");
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [regPhone, setRegPhone] = useState("");
  const [regRequestId, setRegRequestId] = useState("");
  const [regOtpCode, setRegOtpCode] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [createdUsername, setCreatedUsername] = useState<string | null>(null);
  const [hasCopiedUsername, setHasCopiedUsername] = useState(false);
  const [regExpiresAt, setRegExpiresAt] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [regOrgName, setRegOrgName] = useState("");
  const [regOrgBio, setRegOrgBio] = useState("");

  // Profile completion state
  const [profFullName, setProfFullName] = useState("");
  const [profUsername, setProfUsername] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [profGhanaCard, setProfGhanaCard] = useState("");
  const [profDob, setProfDob] = useState("");
  const [profGender, setProfGender] = useState("male");
  const [profRegion, setProfRegion] = useState("Greater Accra");
  const [profCity, setProfCity] = useState("Accra");
  const [profMomoNumber, setProfMomoNumber] = useState("");
  const [profMomoNetwork, setProfMomoNetwork] = useState("MTN");
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [dbRegions, setDbRegions] = useState<{ id: string; name: string; code?: string }[]>(DEFAULT_FALLBACK_REGIONS);
  const regionsList = dbRegions && dbRegions.length > 0 ? dbRegions : DEFAULT_FALLBACK_REGIONS;

  // Dynamic regions fetching from database
  useEffect(() => {
    fetch("/api/regions")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.regions) && data.regions.length > 0) {
          setDbRegions(data.regions);
          if (!profRegion) {
            setProfRegion(data.regions[0].name);
          }
        }
      })
      .catch(() => {
        // Fallback default list
        setDbRegions(DEFAULT_FALLBACK_REGIONS);
      });
  }, []);

  // Existing login state
  const [formUsername, setFormUsername] = useState("");
  const [formPasscode, setFormPasscode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Full User & Profile State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [region, setRegion] = useState("Greater Accra");
  const [city, setCity] = useState("Accra");
  const [address, setAddress] = useState("");
  const [momoNetwork, setMomoNetwork] = useState("MTN");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  // Profile Edit modal state
  const [editUsername, setEditUsername] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [editGender, setEditGender] = useState("male");
  const [editDob, setEditDob] = useState("");
  const [editRegion, setEditRegion] = useState("Greater Accra");
  const [editCity, setEditCity] = useState("Accra");
  const [editAddress, setEditAddress] = useState("");
  const [editMomoNetwork, setEditMomoNetwork] = useState("MTN");
  const [editPasscode, setEditPasscode] = useState("");
  const [editActiveTab, setEditActiveTab] = useState<"identity" | "personal" | "security">("identity");
  const [avatarTab, setAvatarTab] = useState<"presets" | "upload">("presets");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState("");
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [isEditLoading, setIsEditLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Login MFA Challenge State
  const [mfaChallenge, setMfaChallenge] = useState<{
    ticket: string;
    username: string;
    preferredMethod: string;
    hasPasskeys: boolean;
    hasTotp: boolean;
    hasBackupCodes: boolean;
    passkeys: Array<{ id: string; name: string; type: string }>;
  } | null>(null);
  const [mfaLoginCode, setMfaLoginCode] = useState("");
  const [mfaLoginMethod, setMfaLoginMethod] = useState<"totp" | "passkey" | "biometric" | "backup">("totp");
  const [isMfaVerifying, setIsMfaVerifying] = useState(false);

  const fetchNotifications = useCallback((token: string) => {
    fetch(`/api/notifications?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      })
      .catch(() => undefined);
  }, []);

  const syncAuth = useCallback(() => {
    const token = localStorage.getItem("damii-player-token");
    const name = localStorage.getItem("damii-player-name");

    if (token) {
      setUserToken(token);
      setUsername(name || "User");

      // Load cached user data immediately to eliminate UI flicker
      const cachedAuth = localStorage.getItem("damii-auth-user");
      if (cachedAuth) {
        try {
          const parsed = JSON.parse(cachedAuth);
          if (parsed.role) setRole(parsed.role);
          if (parsed.roleTitle) setRoleTitle(parsed.roleTitle);
          if (parsed.isSuperAdmin !== undefined) setIsSuperAdmin(Boolean(parsed.isSuperAdmin));
          if (parsed.username) setUsername(parsed.username);
          if (parsed.points !== undefined) setPoints(parsed.points);
          if (parsed.avatarUrl !== undefined) setAvatarUrl(parsed.avatarUrl);
        } catch {
          // ignore parsing error
        }
      }

      fetch(`/api/auth`, { headers: getAuthHeaders() })
        .then((res) => res.json())
        .then((data) => {
          if (data.profile) {
            if (data.profile.avatarUrl !== undefined) setAvatarUrl(data.profile.avatarUrl);
            if (data.profile.username) setUsername(data.profile.username);
            if (data.profile.phoneNumber !== undefined) setPhoneNumber(data.profile.phoneNumber);
            if (data.profile.points !== undefined) setPoints(data.profile.points);
            if (data.profile.role) setRole(data.profile.role);
            if (data.profile.roleTitle) setRoleTitle(data.profile.roleTitle);
            if (data.roleTitle) setRoleTitle(data.roleTitle);
            if (data.adminPermissions?.roleTitle) setRoleTitle(data.adminPermissions.roleTitle);
            if (data.profile.isSuperAdmin !== undefined) setIsSuperAdmin(Boolean(data.profile.isSuperAdmin));
            if (data.isSuperAdmin !== undefined) setIsSuperAdmin(Boolean(data.isSuperAdmin));
            if (data.adminPermissions?.isSuperAdmin !== undefined) setIsSuperAdmin(Boolean(data.adminPermissions.isSuperAdmin));
            if (data.profile.rating !== undefined) setRating(data.profile.rating);
            if (data.profile.wins !== undefined) setWins(data.profile.wins);
            if (data.profile.losses !== undefined) setLosses(data.profile.losses);
            if (data.profile.draws !== undefined) setDraws(data.profile.draws);
            if (data.profile.winStreak !== undefined) setWinStreak(data.profile.winStreak);
            if (data.profile.bestStreak !== undefined) setBestStreak(data.profile.bestStreak);
            if (data.profile.matchesLast7Days !== undefined) setMatchesLast7Days(data.profile.matchesLast7Days);
            if (data.profile.opponentRatingAvg !== undefined) setOpponentRatingAvg(data.profile.opponentRatingAvg);

            // Sync with cached user in localStorage
            try {
              const currentAuth = localStorage.getItem("damii-auth-user");
              const parsed = currentAuth ? JSON.parse(currentAuth) : {};
              parsed.username = data.profile.username || parsed.username;
              parsed.role = data.profile.role || parsed.role;
              if (data.roleTitle || data.profile.roleTitle || data.adminPermissions?.roleTitle) {
                parsed.roleTitle = data.roleTitle || data.profile.roleTitle || data.adminPermissions?.roleTitle;
              }
              if (data.isSuperAdmin !== undefined || data.profile.isSuperAdmin !== undefined || data.adminPermissions?.isSuperAdmin !== undefined) {
                parsed.isSuperAdmin = Boolean(data.isSuperAdmin ?? data.profile.isSuperAdmin ?? data.adminPermissions?.isSuperAdmin);
              }
              localStorage.setItem("damii-auth-user", JSON.stringify(parsed));
            } catch {
              // ignore
            }
          }
          if (data.user) {
            if (data.user.avatarUrl !== undefined) setAvatarUrl(data.user.avatarUrl);
            if (data.user.fullName) setFullName(data.user.fullName);
            if (data.user.email) setEmail(data.user.email);
            if (data.user.phoneNumber) setPhoneNumber(data.user.phoneNumber);
            if (data.user.isPhoneVerified !== undefined) setIsPhoneVerified(Boolean(data.user.isPhoneVerified));
            if (data.user.gender) setGender(data.user.gender);
            if (data.user.dateOfBirth) setDateOfBirth(data.user.dateOfBirth);
            if (data.user.region) setRegion(data.user.region);
            if (data.user.city) setCity(data.user.city);
            if (data.user.address) setAddress(data.user.address);
            if (data.user.momoNetwork) setMomoNetwork(data.user.momoNetwork);
          }
        })
        .catch(() => undefined);

      fetch(`/api/wallet?token=${encodeURIComponent(token)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.balance) {
            setPoints(data.balance.points ?? 0);
            if (data.balance.username) setUsername(data.balance.username);
            if (data.balance.role) setRole(data.balance.role);
            if (data.balance.roleTitle) setRoleTitle(data.balance.roleTitle);
            if (data.balance.isSuperAdmin !== undefined) setIsSuperAdmin(Boolean(data.balance.isSuperAdmin));
            if (data.balance.rating !== undefined) setRating(data.balance.rating);
            if (data.balance.phoneNumber !== undefined) setPhoneNumber(data.balance.phoneNumber);
            if (data.balance.wins !== undefined) setWins(data.balance.wins);
            if (data.balance.losses !== undefined) setLosses(data.balance.losses);
            if (data.balance.draws !== undefined) setDraws(data.balance.draws);
            if (data.balance.winStreak !== undefined) setWinStreak(data.balance.winStreak);
            if (data.balance.bestStreak !== undefined) setBestStreak(data.balance.bestStreak);
            if (data.balance.matchesLast7Days !== undefined) setMatchesLast7Days(data.balance.matchesLast7Days);
            if (data.balance.opponentRatingAvg !== undefined) setOpponentRatingAvg(data.balance.opponentRatingAvg);

            // Update cached user object in localStorage
            try {
              const currentAuth = localStorage.getItem("damii-auth-user");
              const parsed = currentAuth ? JSON.parse(currentAuth) : {};
              parsed.points = data.balance.points;
              parsed.username = data.balance.username || parsed.username;
              parsed.role = data.balance.role || parsed.role;
              if (data.balance.roleTitle) parsed.roleTitle = data.balance.roleTitle;
              if (data.balance.isSuperAdmin !== undefined) parsed.isSuperAdmin = data.balance.isSuperAdmin;
              localStorage.setItem("damii-auth-user", JSON.stringify(parsed));
            } catch {
              // ignore
            }
          }
        })
        .catch(() => undefined);

      fetch(`/api/organizer/request`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.organizerProfile?.status) {
            setOrganizerStatus(data.organizerProfile.status);
            if (data.organizerProfile.organizationName) {
              setOrganizationName(data.organizerProfile.organizationName);
            }
          } else {
            setOrganizerStatus("none");
          }
          if (data.profile?.role) {
            setRole(data.profile.role);
          }
        })
        .catch(() => setOrganizerStatus("none"));

      fetchNotifications(token);
    } else {
      setUserToken(null);
      setUsername("Guest");
      setPoints(0);
      setRole("guest");
      setRating(1000);
      setPhoneNumber("");
      setAvatarUrl(null);
      setFullName("");
      setEmail("");
      setIsPhoneVerified(false);
      setWins(0);
      setLosses(0);
      setDraws(0);
      setNotifications([]);
      setOrganizerStatus("none");
      setOrganizationName("");
    }
  }, [fetchNotifications]);

  const openEditProfileModal = useCallback(async () => {
    setEditUsername(username);
    setEditFullName(fullName);
    setEditEmail(email);
    setEditPhone(phoneNumber || "");
    setEditAvatarUrl(avatarUrl);
    setEditGender(gender || "male");
    setEditDob(dateOfBirth ? dateOfBirth.split("T")[0] : "");
    setEditRegion(region || "Greater Accra");
    setEditCity(city || "Accra");
    setEditAddress(address || "");
    setEditMomoNetwork(momoNetwork || "MTN");
    setEditPasscode("");
    setEditError("");
    setEditSuccess("");
    setAvatarUploadError("");
    setEditActiveTab("identity");
    setAvatarTab("presets");
    setIsProfileDropdownOpen(false);
    setIsEditProfileOpen(true);

    const token = localStorage.getItem("damii-player-token");
    if (token) {
      try {
        const res = await fetch("/api/auth", { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.profile) {
          if (data.profile.username) setEditUsername(data.profile.username);
          if (data.profile.avatarUrl !== undefined) setEditAvatarUrl(data.profile.avatarUrl);
        }
        if (data.user) {
          if (data.user.fullName) setEditFullName(data.user.fullName);
          if (data.user.email) setEditEmail(data.user.email);
          if (data.user.phoneNumber) setEditPhone(data.user.phoneNumber);
          if (data.user.avatarUrl !== undefined) setEditAvatarUrl(data.user.avatarUrl);
          if (data.user.isPhoneVerified !== undefined) setIsPhoneVerified(Boolean(data.user.isPhoneVerified));
          if (data.user.gender) setEditGender(data.user.gender);
          if (data.user.dateOfBirth) setEditDob(data.user.dateOfBirth.split("T")[0]);
          if (data.user.region) setEditRegion(data.user.region);
          if (data.user.city) setEditCity(data.user.city);
          if (data.user.address) setEditAddress(data.user.address);
          if (data.user.momoNetwork) setEditMomoNetwork(data.user.momoNetwork);
        }
      } catch {
        // preserve current values
      }
    }
  }, [username, fullName, email, phoneNumber, avatarUrl, gender, dateOfBirth, region, city, address, momoNetwork]);

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarUploadError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setAvatarUploadError(validation.error || "Invalid image file");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const resized = await resizeImageToDataUrl(file, 200, 0.85);
      setEditAvatarUrl(resized);
    } catch (err) {
      setAvatarUploadError(err instanceof Error ? err.message : "Failed to process image");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  useEffect(() => {
    try {
      const savedRead = localStorage.getItem("damii-read-notifications");
      if (savedRead) {
        setReadIds(JSON.parse(savedRead));
      }
    } catch {
      // default
    }
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    syncAuth();

    const handleAuthChange = () => syncAuth();
    const handleBalanceChange = (e: Event) => {
      const custom = e as CustomEvent<{ points?: number }>;
      if (custom.detail?.points !== undefined && typeof custom.detail.points === "number") {
        setPoints(custom.detail.points);
      }
      syncAuth();
    };

    const handleOpenAuth = (e: Event) => {
      setAuthError("");
      setAuthSuccess("");
      const customEvent = e as CustomEvent<{ mode?: "login" | "register" | "complete_profile"; accountType?: "player" | "organizer" }>;
      if (customEvent.detail?.mode) {
        setAuthMode(customEvent.detail.mode);
      }
      if (customEvent.detail?.accountType) {
        setRegAccountType(customEvent.detail.accountType);
      }
      setIsAuthOpen(true);
    };

    window.addEventListener("damii-auth-changed", handleAuthChange);
    window.addEventListener("damii-balance-changed", handleBalanceChange);
    window.addEventListener("damii-wallet-updated", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("damii-open-auth", handleOpenAuth);

    // Periodic reactive polling every 5s so balance stays fresh across tab changes / background settlements
    const balanceInterval = setInterval(() => {
      const activeTok = localStorage.getItem("damii_session_token") || localStorage.getItem("damii-player-token");
      if (activeTok && document.visibilityState === "visible") {
        fetch(`/api/wallet?token=${encodeURIComponent(activeTok)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.balance?.points !== undefined) {
              setPoints((prev) => (prev !== data.balance.points ? data.balance.points : prev));
            }
          })
          .catch(() => undefined);
      }
    }, 5000);

    return () => {
      window.removeEventListener("damii-auth-changed", handleAuthChange);
      window.removeEventListener("damii-balance-changed", handleBalanceChange);
      window.removeEventListener("damii-wallet-updated", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("damii-open-auth", handleOpenAuth);
      clearInterval(balanceInterval);
    };
  }, [pathname, syncAuth]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;
  const [unreadCountFromCenter, setUnreadCountFromCenter] = useState<number | null>(null);
  const effectiveUnreadCount = unreadCountFromCenter !== null ? unreadCountFromCenter : unreadCount;

  const markAllNotificationsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem("damii-read-notifications", JSON.stringify(allIds));
  };

  const markNotificationRead = (id: string) => {
    const updated = Array.from(new Set([...readIds, id]));
    setReadIds(updated);
    localStorage.setItem("damii-read-notifications", JSON.stringify(updated));
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!regPhone.trim()) {
      setAuthError("Valid phone number is required.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: regPhone.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setAuthError(data.error || "Failed to send verification OTP.");
        setIsLoading(false);
        return;
      }

      setRegRequestId(data.requestId);
      setRegExpiresAt(data.expiresAt);
      setResendCooldown(60);
      setRegStep(2);
      setAuthSuccess(`6-digit code sent to ${regPhone.trim()}`);
    } catch {
      setAuthError("Network connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!regRequestId || !regOtpCode.trim()) {
      setAuthError("Please enter the 6-digit verification code.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: regRequestId,
          code: regOtpCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setAuthError(data.error || "Invalid or expired OTP code.");
        setIsLoading(false);
        return;
      }

      // Save credentials & active session
      saveSessionToken(data.token, data.csrfToken);
      setUserToken(data.token);
      const verifiedPhone = data.user?.phoneNumber || data.phoneNumber || regPhone;
      setPhoneNumber(verifiedPhone);

      const isCompleted = Boolean(data.profileCompleted || data.user?.profileCompletedAt);
      setProfileCompleted(isCompleted);

      // If this was an existing user who already has a completed profile, log them straight in
      if (isCompleted && (data.username || data.user?.username)) {
        const uname = data.username || data.user?.username;
        const userRole = data.user?.role || data.profile?.role || "player";
        const isAdminUser = ["admin", "super_admin", "treasurer"].includes(userRole);
        const isOrganizerUser = userRole === "organizer" || userRole === "facilitator";

        localStorage.setItem("damii-player-token", data.token);
        localStorage.setItem("damii-player-name", uname);
        localStorage.setItem(
          "damii-auth-user",
          JSON.stringify({
            token: data.token,
            username: uname,
            points: 500,
            role: userRole,
          })
        );
        setUsername(uname);

        if (isAdminUser) {
          setAuthSuccess(`👑 Welcome Admin ${uname}! Redirecting to Admin Dashboard...`);
        } else if (isOrganizerUser) {
          setAuthSuccess(`🏆 Welcome Organizer ${uname}! Redirecting to Organizer Studio...`);
        } else {
          setAuthSuccess(`🎉 Welcome back, ${uname}! Redirecting to Arena...`);
        }

        window.dispatchEvent(new Event("damii-auth-changed"));
        setTimeout(() => {
          setIsAuthOpen(false);
          setRegStep(1);
          setRegOtpCode("");
          setAuthSuccess("");
          if (isAdminUser) {
            safeNavigate(router, "/admin");
          } else if (isOrganizerUser) {
            safeNavigate(router, "/organizer");
          } else {
            if (pathname === "/" || pathname === "/organizer/login" || pathname === "/admin") {
              safeNavigate(router, "/arena");
            }
          }
        }, 1000);
      } else {
        // Move to Step 3: Complete Player or Organizer Registration Details
        if (data.user?.fullName) setProfFullName(data.user.fullName);
        if (data.user?.email) setProfEmail(data.user.email);
        const assignedGamerTag = data.username || data.user?.username || "";
        if (assignedGamerTag) {
          setProfUsername(assignedGamerTag);
        }
        setRegStep(3);
        setAuthSuccess(`Phone verified! Complete your ${regAccountType === "organizer" ? "Organizer" : "Player"} profile below.`);
      }
    } catch {
      setAuthError("Verification failed. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!profUsername.trim()) {
      setAuthError("Gamer Tag / Username is required.");
      return;
    }

    if (!profFullName.trim()) {
      setAuthError("Full legal name is required for registration.");
      return;
    }

    if (regAccountType === "organizer" && !regOrgName.trim()) {
      setAuthError("Organization / Club Name is required for Organizer accounts.");
      return;
    }

    if (!profDob) {
      setAuthError("Date of birth is required to verify account eligibility.");
      return;
    }

    const age = calculateAge(profDob);
    if (age < 18) {
      setAuthError("Underage registration is not permitted. You must be at least 18 years old to join DAMII Draughts Arena.");
      return;
    }

    if (!regPassword.trim()) {
      setAuthError("Please enter a password for your account.");
      return;
    }

    if (regPassword.length < 4) {
      setAuthError("Password must be at least 4 characters long.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setAuthError("Passwords do not match. Please verify your password confirmation.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/profile/complete", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: profUsername.trim(),
          fullName: profFullName.trim(),
          email: profEmail.trim() || undefined,
          dateOfBirth: new Date(profDob).toISOString(),
          password: regPassword.trim(),
          confirmPassword: regConfirmPassword.trim(),
          accountType: regAccountType,
          organizationName: regOrgName.trim() || undefined,
          orgBio: regOrgBio.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setAuthError(data.error || "Failed to complete profile.");
        setIsLoading(false);
        return;
      }

      const finalName = data.user?.username || profUsername.trim();
      const assignedRole = regAccountType === "organizer" ? "organizer" : (data.user?.role || "player");

      if (regAccountType === "organizer") {
        setAuthSuccess(`🏆 Welcome Organizer, ${finalName}! Your Organizer account is activated. Redirecting to Organizer Studio...`);
      } else {
        setAuthSuccess(`🎉 Welcome to DAMII Arena, ${finalName}! Your player profile is registered & verified. Redirecting to Arena...`);
      }

      setProfileCompleted(true);
      setUsername(finalName);

      localStorage.setItem("damii-player-name", finalName);
      if (userToken) {
        localStorage.setItem("damii-player-token", userToken);
        localStorage.setItem(
          "damii-auth-user",
          JSON.stringify({
            token: userToken,
            username: finalName,
            points: 500,
            role: assignedRole,
          })
        );
      }

      window.dispatchEvent(new Event("damii-auth-changed"));

      setTimeout(() => {
        setIsAuthOpen(false);
        setRegStep(1);
        setRegOtpCode("");
        setRegPassword("");
        setRegConfirmPassword("");
        setAuthSuccess("");
        if (regAccountType === "organizer") {
          safeNavigate(router, "/organizer");
        } else {
          safeNavigate(router, "/arena");
        }
      }, 1200);
    } catch {
      setAuthError("Failed to save profile. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!formUsername.trim() || !formPasscode.trim()) {
      setAuthError("Username/phone number and password are required.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: formUsername.trim(),
          passcode: formPasscode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setAuthError(data.error || "Authentication failed.");
        setIsLoading(false);
        return;
      }

      // If Multi-Factor Authentication is enabled on this account
      if (data.mfaRequired) {
        setMfaChallenge({
          ticket: data.ticket,
          username: data.username,
          preferredMethod: data.preferredMethod || "totp",
          hasPasskeys: Boolean(data.hasPasskeys),
          hasTotp: Boolean(data.hasTotp),
          hasBackupCodes: Boolean(data.hasBackupCodes),
          passkeys: data.passkeys || [],
        });
        setMfaLoginMethod(
          data.preferredMethod === "biometric" || data.preferredMethod === "passkey"
            ? (data.hasPasskeys ? "passkey" : "totp")
            : data.hasTotp
            ? "totp"
            : "passkey"
        );
        setIsLoading(false);
        return;
      }

      // Success
      saveSessionToken(data.token, data.csrfToken);
      localStorage.setItem("damii-player-token", data.token);
      localStorage.setItem("damii-player-name", data.profile.username);
      localStorage.setItem(
        "damii-auth-user",
        JSON.stringify({
          token: data.token,
          username: data.profile.username,
          points: data.profile.points,
          role: data.profile.role,
        })
      );

      const userRole = data.profile.role;
      const isAdminUser = ["admin", "super_admin", "treasurer"].includes(userRole) || Boolean(data.adminPermissions?.isSuperAdmin) || Boolean(data.isSuperAdmin);
      const isOrganizerUser = userRole === "organizer" || userRole === "facilitator";

      if (isAdminUser) {
        setAuthSuccess(`👑 Welcome Admin ${data.profile.username}! Redirecting to Admin Control Center...`);
      } else if (isOrganizerUser) {
        setAuthSuccess(`🏆 Welcome Organizer ${data.profile.username}! Redirecting to Organizer Studio...`);
      } else {
        setAuthSuccess(`🎉 Welcome back, ${data.profile.username}! Redirecting to Arena...`);
      }

      window.dispatchEvent(new Event("damii-auth-changed"));

      setTimeout(() => {
        setIsAuthOpen(false);
        setFormPasscode("");
        setAuthSuccess("");
        if (isAdminUser) {
          safeNavigate(router, "/admin");
        } else if (isOrganizerUser) {
          safeNavigate(router, "/organizer");
        } else {
          if (pathname === "/" || pathname === "/organizer/login" || pathname === "/admin") {
            safeNavigate(router, "/arena");
          }
        }
      }, 1000);
    } catch {
      setAuthError("Server communication error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyDirectLogin = async () => {
    setAuthError("");
    setAuthSuccess("");
    setIsLoading(true);

    try {
      // 1. Get challenge
      const chRes = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "challenge" }),
      });
      const chData = await chRes.json();
      const challenge = chData.challenge;

      // 2. Prompt device passkey / biometric
      const authResult = await authenticateWithPasskey();
      if (!authResult.success || !authResult.credentialId) {
        setAuthError(authResult.error || "Passkey authentication was cancelled.");
        setIsLoading(false);
        return;
      }

      // 3. Authenticate with backend
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "passkey_login",
          credentialId: authResult.credentialId,
          challenge,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setAuthError(data.error || "Passkey login failed. Please sign in with username and PIN first to enroll your device.");
        setIsLoading(false);
        return;
      }

      // Success
      saveSessionToken(data.token, data.csrfToken);
      localStorage.setItem("damii-player-token", data.token);
      localStorage.setItem("damii-player-name", data.profile.username);
      localStorage.setItem(
        "damii-auth-user",
        JSON.stringify({
          token: data.token,
          username: data.profile.username,
          points: data.profile.points,
          role: data.profile.role,
        })
      );

      setAuthSuccess(`⚡ Welcome back, ${data.profile.username}! Authenticated via Biometrics / Passkey.`);
      window.dispatchEvent(new Event("damii-auth-changed"));
      setTimeout(() => {
        setIsAuthOpen(false);
        setAuthSuccess("");
      }, 1000);
    } catch {
      setAuthError("Passkey login encountered an error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLoginMfa = async (methodOverride?: "passkey" | "biometric") => {
    if (!mfaChallenge) return;
    const activeMethod = methodOverride || mfaLoginMethod;

    setAuthError("");
    setIsMfaVerifying(true);

    try {
      let credentialId: string | undefined;

      if (activeMethod === "passkey" || activeMethod === "biometric") {
        const allowedIds = (mfaChallenge.passkeys || []).map((p) => p.id);
        const authResult = await authenticateWithPasskey(allowedIds);
        if (!authResult.success || !authResult.credentialId) {
          setAuthError(authResult.error || "Biometric / Passkey prompt was cancelled.");
          setIsMfaVerifying(false);
          return;
        }
        credentialId = authResult.credentialId;
      } else if (!mfaLoginCode.trim()) {
        setAuthError("Please enter your 6-digit authenticator or backup code.");
        setIsMfaVerifying(false);
        return;
      }

      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_login_mfa",
          ticket: mfaChallenge.ticket,
          username: mfaChallenge.username,
          method: activeMethod,
          code: mfaLoginCode.trim() || undefined,
          credentialId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setAuthError(data.error || "MFA Verification failed.");
        setIsMfaVerifying(false);
        return;
      }

      // Success
      saveSessionToken(data.token, data.csrfToken);
      localStorage.setItem("damii-player-token", data.token);
      localStorage.setItem("damii-player-name", data.profile.username);
      localStorage.setItem(
        "damii-auth-user",
        JSON.stringify({
          token: data.token,
          username: data.profile.username,
          points: data.profile.points,
          role: data.profile.role,
        })
      );

      setAuthSuccess(`🛡️ MFA Verified! Welcome back, ${data.profile.username}!`);
      window.dispatchEvent(new Event("damii-auth-changed"));
      setTimeout(() => {
        setIsAuthOpen(false);
        setMfaChallenge(null);
        setMfaLoginCode("");
        setAuthSuccess("");
      }, 1000);
    } catch {
      setAuthError("Failed to verify MFA.");
    } finally {
      setIsMfaVerifying(false);
    }
  };

  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");

    const cleanUser = editUsername.trim();
    if (!cleanUser) {
      setEditError("Username cannot be empty.");
      return;
    }

    if (cleanUser.length < 3 || cleanUser.length > 25) {
      setEditError("Username must be between 3 and 25 characters.");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUser)) {
      setEditError("Username can only contain letters, numbers, underscores, and hyphens.");
      return;
    }

    if (!userToken) return;

    setIsEditLoading(true);

    try {
      const isExistingPhoneLocked = Boolean(phoneNumber || isPhoneVerified);
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "update_profile",
          token: userToken,
          username: cleanUser,
          fullName: editFullName.trim() || undefined,
          email: editEmail.trim() || undefined,
          avatarUrl: editAvatarUrl || undefined,
          phoneNumber: !isExistingPhoneLocked && editPhone.trim() ? editPhone.trim() : undefined,
          gender: editGender || undefined,
          dateOfBirth: editDob ? new Date(editDob).toISOString() : undefined,
          region: editRegion || undefined,
          city: editCity.trim() || undefined,
          address: editAddress.trim() || undefined,
          momoNetwork: editMomoNetwork || undefined,
          passcode: editPasscode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setEditError(data.error || "Failed to update profile.");
        setIsEditLoading(false);
        return;
      }

      setEditSuccess("Profile updated successfully!");

      if (data.profile?.username) {
        localStorage.setItem("damii-player-name", data.profile.username);
        setUsername(data.profile.username);
      }
      if (data.profile?.avatarUrl !== undefined) {
        setAvatarUrl(data.profile.avatarUrl);
      }
      if (data.user?.avatarUrl !== undefined) {
        setAvatarUrl(data.user.avatarUrl);
      }
      if (data.profile?.phoneNumber) {
        setPhoneNumber(data.profile.phoneNumber);
      }
      if (data.user) {
        setFullName(data.user.fullName || "");
        setEmail(data.user.email || "");
        setGender(data.user.gender || "male");
        setDateOfBirth(data.user.dateOfBirth || "");
        setRegion(data.user.region || "Greater Accra");
        setCity(data.user.city || "Accra");
        setAddress(data.user.address || "");
        setMomoNetwork(data.user.momoNetwork || "MTN");
        if (data.user.isPhoneVerified !== undefined) {
          setIsPhoneVerified(Boolean(data.user.isPhoneVerified));
        }
      }

      // Update cached user object in localStorage
      try {
        const currentAuth = localStorage.getItem("damii-auth-user");
        const parsed = currentAuth ? JSON.parse(currentAuth) : {};
        if (data.profile?.username) parsed.username = data.profile.username;
        if (data.user?.avatarUrl || data.profile?.avatarUrl) {
          parsed.avatarUrl = data.user?.avatarUrl || data.profile?.avatarUrl;
        }
        localStorage.setItem("damii-auth-user", JSON.stringify(parsed));
      } catch {
        // ignore
      }

      window.dispatchEvent(new Event("damii-auth-changed"));

      setTimeout(() => {
        setIsEditProfileOpen(false);
        setEditPasscode("");
        setEditSuccess("");
      }, 1000);
    } catch {
      setEditError("Server communication error. Please try again.");
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleRotateSession = async () => {
    setEditError("");
    setEditSuccess("");
    setIsEditLoading(true);

    const result = await rotateSessionToken();
    setIsEditLoading(false);

    if (result.success && result.token) {
      setUserToken(result.token);
      setEditSuccess("Session token rotated successfully! New secure session active.");
      window.dispatchEvent(new Event("damii-auth-changed"));
    } else {
      setEditError(result.error || "Failed to rotate session token.");
    }
  };

  const handleRevokeSessions = async (exceptCurrent = false) => {
    setEditError("");
    setEditSuccess("");
    setIsEditLoading(true);

    const result = await revokeAllSessions(exceptCurrent);
    setIsEditLoading(false);

    if (result.success) {
      if (exceptCurrent) {
        setEditSuccess(`Revoked ${result.count ?? 0} other active session(s).`);
      } else {
        clearAuth();
        setIsEditProfileOpen(false);
        alert("All sessions revoked. You have been signed out.");
      }
    } else {
      setEditError(result.error || "Failed to revoke sessions.");
    }
  };

  const clearAuth = () => {
    clearSessionToken();
    localStorage.removeItem("damii-player-token");
    localStorage.removeItem("damii-player-name");
    localStorage.removeItem("damii-auth-user");
    setUserToken(null);
    setUsername("");
    setRole("guest");
    setRoleTitle("");
    setIsSuperAdmin(false);
    setIsProfileDropdownOpen(false);
    window.dispatchEvent(new Event("damii-auth-changed"));
  };

  const handleLogout = () => {
    clearAuth();
  };

  const isAdmin =
    role === "admin" ||
    role === "super_admin" ||
    role === "treasurer" ||
    role === "facilitator" ||
    isSuperAdmin ||
    Boolean(roleTitle && !["player", "user", "organizer", "guest"].includes(roleTitle.toLowerCase()));
  const isOrganizer = role === "organizer" || organizerStatus === "approved";
  const isFacilitator = role === "facilitator" || role === "treasurer";
  const isOrganizerPending = organizerStatus === "pending";
  const isOrganizerOrApplied =
    isAdmin ||
    ["organizer", "facilitator", "admin", "super_admin"].includes(role) ||
    ["pending", "approved", "rejected"].includes(organizerStatus);

  return (
    <>
      <header className="topbar relative">
        <NavLink className="brand" href="/" onClick={(e) => handleNavClick(e, "/")}>
          <span className="brand-mark">D</span>
          <span>
            <strong>DAMII</strong>
            <small className="hidden sm:block">10×10 Strategy Arena</small>
          </span>
        </NavLink>

        {/* Desktop Navigation Menu */}
        <nav className="hidden md:flex topbar-desktop-nav items-center gap-5">
          {!isAdmin && (
            <NavLink
              className={`nav-link ${pathname === "/arena" ? "active" : ""}`}
              href="/arena"
              onClick={(e) => handleNavClick(e, "/arena")}
            >
              <Swords size={16} /> Arena
            </NavLink>
          )}
          <NavLink
            className={`nav-link ${pathname === "/leagues" ? "active" : ""}`}
            href="/leagues"
            onClick={(e) => handleNavClick(e, "/leagues")}
          >
            <Trophy size={16} /> Tournaments
          </NavLink>
          {isOrganizerOrApplied && (
            <NavLink
              className={`nav-link ${pathname === "/organizer" ? "active" : ""}`}
              href="/organizer"
              onClick={(e) => handleNavClick(e, "/organizer")}
            >
              <Crown size={16} className="text-amber-400" /> Organizer Hub
            </NavLink>
          )}
          {!isAdmin && (
            <NavLink
              className={`nav-link ${pathname === "/wallet" ? "active" : ""}`}
              href="/wallet"
              onClick={(e) => handleNavClick(e, "/wallet")}
            >
              <Wallet size={16} /> Wallet
            </NavLink>
          )}
          {isAdmin && (
            <NavLink
              className={`nav-link ${pathname === "/admin" ? "active" : ""}`}
              href="/admin"
              onClick={(e) => handleNavClick(e, "/admin")}
            >
              <ShieldAlert size={16} className="text-red-400" /> Admin
            </NavLink>
          )}
          {isFacilitator && !isAdmin && (
            <NavLink
              className={`nav-link ${pathname === "/admin" ? "active" : ""}`}
              href="/admin"
              onClick={(e) => handleNavClick(e, "/admin")}
            >
              <Scale size={16} className="text-cyan-400" /> Arbiter Hub
            </NavLink>
          )}

          <div className="topbar-user">
            {userToken ? (
              <>
                {/* Real-time In-App Notification Center Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen((prev) => !prev)}
                  aria-label={`Notifications ${effectiveUnreadCount > 0 ? `(${effectiveUnreadCount} unread)` : ""}`}
                  className={`relative p-2 rounded-xl border transition-colors flex items-center justify-center shadow-sm cursor-pointer ${
                    isNotificationsOpen
                      ? "bg-[#144435] text-[#d6a735] border-[#d6a735]"
                      : "bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] border-[#d6a735]/40"
                  }`}
                  title="Notifications & Game Alerts"
                >
                  <Bell size={16} />
                  {effectiveUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-gradient-to-br from-[#d6a735] to-amber-500 text-[#06261f] font-black text-[10px] rounded-full flex items-center justify-center shadow-md animate-pulse">
                      {effectiveUnreadCount}
                    </span>
                  )}
                </button>

                {/* Marbles Balance Tag - Hidden for Admin (Admins cannot own or wager marbles) */}
                {!isAdmin && (
                  <NavLink
                    href="/wallet"
                    onClick={(e) => handleNavClick(e, "/wallet")}
                    className="points-badge shrink-0 hover:scale-105 transition-transform flex items-center gap-1.5 font-black cursor-pointer shadow-sm"
                    title="Click to Open Marbles Treasury (1 Marble = 1 Cedi)"
                  >
                    <Coins size={14} className="text-[#d6a735]" />
                    <span>{typeof points === "number" ? points.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : points}</span>
                    <span className="text-[10px] text-[#d6a735] uppercase font-bold">Marbles</span>
                  </NavLink>
                )}

                {/* Desktop User Profile Button & Dropdown */}
                <div className="relative">
                  {(() => {
                    const userRank = getProfileRank({ rating, wins, losses, draws, winStreak, bestStreak, matchesLast7Days, opponentRatingAvg });

                    // Distinct button pill styling per role
                    let pillBorder = "border-[#d6a735]/40 hover:bg-[#0c3b2e]";
                    let avatarBg = "bg-[#d6a735]/20 text-[#d6a735] border-[#d6a735]/50";

                    if (isAdmin) {
                      pillBorder = "border-red-500/50 hover:bg-red-950/40";
                      avatarBg = "bg-red-500/20 text-red-400 border-red-500/50";
                    } else if (isOrganizer) {
                      pillBorder = "border-amber-500/50 hover:bg-amber-950/40";
                      avatarBg = "bg-amber-500/20 text-amber-400 border-amber-500/50";
                    } else if (isFacilitator) {
                      pillBorder = "border-cyan-500/50 hover:bg-cyan-950/40";
                      avatarBg = "bg-cyan-500/20 text-cyan-400 border-cyan-500/50";
                    }

                    const initialLetter = (username || "U")[0].toUpperCase();

                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen((prev) => !prev);
                            setIsNotificationsOpen(false);
                          }}
                          className={`shrink-0 flex items-center gap-1.5 border p-1 rounded-full hover:scale-105 transition-all cursor-pointer shadow-sm ${pillBorder}`}
                          title={username || "User Account & Settings Menu"}
                        >
                          <span className={`w-7 h-7 rounded-full font-black flex items-center justify-center text-xs border overflow-hidden shadow-inner ${avatarBg}`}>
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={username} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              initialLetter
                            )}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 pr-1 ${
                              isAdmin ? "text-red-400" : isOrganizer ? "text-amber-400" : isFacilitator ? "text-cyan-400" : "text-[#d6a735]"
                            } ${isProfileDropdownOpen ? "rotate-180" : ""}`}
                          />
                        </button>

                        {/* Profile Dropdown Popover */}
                        {isProfileDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-80 bg-[#06261f] border border-[#d6a735]/40 rounded-2xl shadow-2xl z-50 p-3 space-y-2.5 text-left text-[#f5efdf] animate-in fade-in slide-in-from-top-2 duration-150">

                            {/* 1. ADMIN PROFILE VIEW */}
                            {isAdmin && (
                              <>
                                <div className="p-3 bg-gradient-to-br from-red-950/90 to-[#081c15] rounded-xl border border-red-600/50 flex items-center gap-3 shadow-md">
                                  <div className="w-11 h-11 rounded-xl bg-red-600 text-white font-black flex items-center justify-center text-lg shadow-lg shrink-0 overflow-hidden">
                                    {avatarUrl ? (
                                      <img src={avatarUrl} alt={username} className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                      <ShieldAlert size={22} />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <strong className="block text-sm font-black text-[#f5efdf] truncate">
                                      {username}
                                    </strong>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="px-2 py-0.5 bg-red-500/30 text-red-200 border border-red-500/50 text-[9px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                                        <ShieldCheck size={10} /> {roleTitle || (isSuperAdmin || role === "super_admin" ? "Super Admin" : "Administrator")}
                                      </span>
                                      <span className="text-[10px] text-red-300/80 font-bold">
                                        {isSuperAdmin ? "Super Authority" : roleTitle ? `${roleTitle} Clearance` : "Administrative Authority"}
                                      </span>
                                    </div>
                                    {phoneNumber && (
                                      <span className="block text-[10px] text-red-200/80 mt-1 font-semibold truncate flex items-center gap-1">
                                        <Phone size={10} className="text-red-400" /> {phoneNumber}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="p-2.5 bg-red-950/40 border border-red-800/40 rounded-xl text-[10px] text-red-200/90 leading-relaxed space-y-1">
                                  <div className="flex items-center gap-1 text-red-300 font-extrabold uppercase tracking-wider text-[9px]">
                                    <ShieldAlert size={11} className="text-red-400" /> {isSuperAdmin ? "Super Admin Clearance" : roleTitle ? `${roleTitle} Clearance` : "System Regulator Clearance"}
                                  </div>
                                  <p>{isSuperAdmin ? "Full root administrative oversight across tournament brackets, referee disputes, financial reserves, and platform configurations." : roleTitle ? `Assigned administrative controls and permissions for ${roleTitle}.` : "Administrative oversight across tournament brackets, referee disputes, financial ledgers, and platform settings."}</p>
                                </div>

                                <div className="space-y-1.5 pt-1">
                                  <NavLink
                                    href="/admin"
                                    onClick={(e) => {
                                      handleNavClick(e, "/admin");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-red-950/50 hover:bg-red-900/60 text-red-100 border border-red-800/60 flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Shield size={15} className="text-red-400" /> Admin Control Dashboard
                                    </span>
                                    <ChevronRight size={14} className="text-red-300" />
                                  </NavLink>

                                  <NavLink
                                    href="/admin?tab=tournaments"
                                    onClick={(e) => {
                                      handleNavClick(e, "/admin?tab=tournaments");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Trophy size={15} className="text-[#d6a735]" /> Tournament & Dispute Resolver
                                    </span>
                                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                                  </NavLink>

                                  <NavLink
                                    href="/admin?tab=ledger"
                                    onClick={(e) => {
                                      handleNavClick(e, "/admin?tab=ledger");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Wallet size={15} className="text-emerald-400" /> Financial Reserves & Ledger
                                    </span>
                                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                                  </NavLink>

                                  <NavLink
                                    href="/admin?tab=users"
                                    onClick={(e) => {
                                      handleNavClick(e, "/admin?tab=users");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Users size={15} className="text-sky-400" /> User & Organizer Accounts
                                    </span>
                                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                                  </NavLink>

                                  <button
                                    type="button"
                                    onClick={openEditProfileModal}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors cursor-pointer"
                                  >
                                    <span className="flex items-center gap-2">
                                      <UserCog size={15} className="text-red-400" /> Edit Admin Profile & Credentials
                                    </span>
                                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                                  </button>
                                </div>
                              </>
                            )}

                            {/* 2. ORGANIZER PROFILE VIEW */}
                            {!isAdmin && isOrganizer && (
                              <>
                                <div className="p-3 bg-gradient-to-br from-amber-950/90 to-[#081c15] rounded-xl border border-amber-500/50 flex items-center gap-3 shadow-md">
                                  <div className="w-11 h-11 rounded-xl bg-[#d6a735] text-[#06261f] font-black flex items-center justify-center text-lg shadow-lg shrink-0 overflow-hidden">
                                    {avatarUrl ? (
                                      <img src={avatarUrl} alt={username} className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                      <Crown size={22} />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <strong className="block text-sm font-black text-[#f5efdf] truncate">
                                      {username}
                                    </strong>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                                        <Crown size={10} /> Certified Organizer
                                      </span>
                                    </div>
                                    {organizationName ? (
                                      <span className="block text-[10px] text-amber-200 mt-1 font-bold truncate flex items-center gap-1">
                                        <Building2 size={10} className="text-amber-400" /> {organizationName}
                                      </span>
                                    ) : (
                                      <span className="block text-[10px] text-amber-200/80 mt-1 font-semibold">
                                        Official League Host
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="p-2.5 bg-amber-950/40 border border-amber-700/40 rounded-xl text-[10px] text-amber-100/90 leading-relaxed space-y-1">
                                  <div className="flex items-center gap-1 text-amber-300 font-extrabold uppercase tracking-wider text-[9px]">
                                    <Crown size={11} className="text-amber-400" /> Accredited Tournament Host
                                  </div>
                                  <p>Authorized to host tournament leagues, manage check-in rosters, launch round brackets, and coordinate prize payouts.</p>
                                </div>

                                <div className="space-y-1.5 pt-1">
                                  <NavLink
                                    href="/organizer"
                                    onClick={(e) => {
                                      handleNavClick(e, "/organizer");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-amber-950/50 hover:bg-amber-900/60 text-amber-100 border border-amber-600/60 flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Crown size={15} className="text-amber-400" /> Organizer Studio & Command Hub
                                    </span>
                                    <ChevronRight size={14} className="text-amber-300" />
                                  </NavLink>

                                  <NavLink
                                    href="/organizer?action=create"
                                    onClick={(e) => {
                                      handleNavClick(e, "/organizer?action=create");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Trophy size={15} className="text-[#d6a735]" /> Create Tournament League
                                    </span>
                                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                                  </NavLink>

                                  <NavLink
                                    href="/leagues"
                                    onClick={(e) => {
                                      handleNavClick(e, "/leagues");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <FileText size={15} className="text-[#d6a735]" /> View Public Brackets
                                    </span>
                                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                                  </NavLink>

                                  <NavLink
                                    href="/wallet"
                                    onClick={(e) => {
                                      handleNavClick(e, "/wallet");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Wallet size={15} className="text-emerald-400" /> Organizer Wallet & Escrow
                                    </span>
                                    <span className="text-[10px] font-black text-[#d6a735]">GH₵ {typeof points === "number" ? points.toFixed(2) : points}</span>
                                  </NavLink>

                                  <button
                                    type="button"
                                    onClick={openEditProfileModal}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors cursor-pointer"
                                  >
                                    <span className="flex items-center gap-2">
                                      <UserCog size={15} className="text-amber-400" /> Edit Organizer Profile & MoMo
                                    </span>
                                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                                  </button>
                                </div>
                              </>
                            )}

                            {/* 3. FACILITATOR / ARBITER PROFILE VIEW */}
                            {!isAdmin && !isOrganizer && isFacilitator && (
                              <>
                                <div className="p-3 bg-gradient-to-br from-cyan-950/90 to-[#081c15] rounded-xl border border-cyan-500/50 flex items-center gap-3 shadow-md">
                                  <div className="w-11 h-11 rounded-xl bg-cyan-600 text-white font-black flex items-center justify-center text-lg shadow-lg shrink-0 overflow-hidden">
                                    {avatarUrl ? (
                                      <img src={avatarUrl} alt={username} className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                      <Scale size={22} />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <strong className="block text-sm font-black text-[#f5efdf] truncate">
                                      {username}
                                    </strong>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                                        <Scale size={10} /> Match Facilitator
                                      </span>
                                      <span className="text-[10px] text-cyan-200/80 font-bold">Official Arbiter</span>
                                    </div>
                                    {phoneNumber && (
                                      <span className="block text-[10px] text-cyan-200/80 mt-1 font-semibold truncate flex items-center gap-1">
                                        <Phone size={10} className="text-cyan-400" /> {phoneNumber}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="p-2.5 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-[10px] text-cyan-100/90 leading-relaxed space-y-1">
                                  <div className="flex items-center gap-1 text-cyan-300 font-extrabold uppercase tracking-wider text-[9px]">
                                    <Scale size={11} className="text-cyan-400" /> Match Arbiter Clearance
                                  </div>
                                  <p>Authorized to supervise official tournament matches, validate player check-ins, and record approved match scores.</p>
                                </div>

                                <div className="space-y-1.5 pt-1">
                                  <NavLink
                                    href="/admin"
                                    onClick={(e) => {
                                      handleNavClick(e, "/admin");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-100 border border-cyan-600/60 flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Scale size={15} className="text-cyan-400" /> Arbiter Hub & Oversight
                                    </span>
                                    <ChevronRight size={14} className="text-cyan-300" />
                                  </NavLink>

                                  <NavLink
                                    href="/arena"
                                    onClick={(e) => {
                                      handleNavClick(e, "/arena");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Swords size={15} className="text-[#d6a735]" /> Match Spectator Arena
                                    </span>
                                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                                  </NavLink>

                                  <NavLink
                                    href="/leagues"
                                    onClick={(e) => {
                                      handleNavClick(e, "/leagues");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Trophy size={15} className="text-[#d6a735]" /> Tournament & League Brackets
                                    </span>
                                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                                  </NavLink>

                                  <NavLink
                                    href="/wallet"
                                    onClick={(e) => {
                                      handleNavClick(e, "/wallet");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Wallet size={15} className="text-emerald-400" /> Facilitator Wallet
                                    </span>
                                    <span className="text-[10px] font-black text-[#d6a735]">GH₵ {typeof points === "number" ? points.toFixed(2) : points}</span>
                                  </NavLink>

                                  <button
                                    type="button"
                                    onClick={openEditProfileModal}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors cursor-pointer"
                                  >
                                    <span className="flex items-center gap-2">
                                      <UserCog size={15} className="text-cyan-400" /> Edit Profile & Phone
                                    </span>
                                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                                  </button>
                                </div>
                              </>
                            )}

                            {/* 4. COMPETITIVE PLAYER PROFILE VIEW */}
                            {!isAdmin && !isOrganizer && !isFacilitator && (
                              <>
                                {/* Profile Card Header */}
                                <div className="p-3 bg-[#0c3b2e] rounded-xl border border-[#d6a735]/30 flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-[#d6a735] text-[#06261f] font-black flex items-center justify-center text-base shadow-md shrink-0 overflow-hidden">
                                    {avatarUrl ? (
                                      <img src={avatarUrl} alt={username} className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                      username ? username[0].toUpperCase() : "U"
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <strong className="block text-sm font-black text-[#f5efdf] truncate">
                                      {username}
                                    </strong>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="px-1.5 py-0.5 bg-[#d6a735]/20 text-[#d6a735] text-[9px] font-black rounded uppercase">
                                        {userRank.badgeEmoji} {userRank.title}
                                      </span>
                                      <span className="text-[10px] text-slate-300 font-bold">{userRank.dpi} DPI ({rating} ELO)</span>
                                    </div>
                                    {phoneNumber ? (
                                      <span className="block text-[10px] text-[#cbd5e1] mt-1 font-semibold truncate flex items-center gap-1">
                                        <Phone size={10} className="text-[#d6a735]" /> {phoneNumber}
                                      </span>
                                    ) : (
                                      <span className="block text-[10px] text-amber-400/90 mt-1 font-semibold italic flex items-center gap-1">
                                        <Phone size={10} /> Add phone number
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {isOrganizerPending && (
                                  <div className="p-2 bg-amber-950/50 border border-amber-500/40 rounded-xl text-[10px] text-amber-200 flex items-center gap-2 shadow-sm">
                                    <Clock size={13} className="text-amber-400 shrink-0" />
                                    <span>Organizer License: <strong>Under Review</strong></span>
                                  </div>
                                )}

                                {/* Rank Progress Bar & Dynamic Formula Breakdown */}
                                <div className="p-2.5 bg-[#0c3b2e]/90 rounded-xl border border-[#d6a735]/30 space-y-1.5">
                                  <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span className="text-[#d6a735] uppercase tracking-wider">{userRank.aka}</span>
                                    <span className="text-slate-300">{userRank.progressPercent}% to Next Rank</span>
                                  </div>
                                  <div className="w-full bg-[#06261f] h-2 rounded-full overflow-hidden border border-[#184d3c]">
                                    <div
                                      className="bg-gradient-to-r from-amber-500 to-[#d6a735] h-full rounded-full transition-all duration-300"
                                      style={{ width: `${userRank.progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="block text-[9px] text-slate-400 italic">
                                    {userRank.description}
                                  </span>

                                  {/* Dynamic Factors Breakdown */}
                                  <div className="pt-1.5 border-t border-[#184d3c]/80 grid grid-cols-2 gap-1 text-[9px] font-semibold text-slate-300">
                                    <div className="bg-[#06261f]/70 p-1 rounded border border-[#184d3c] flex items-center justify-between">
                                      <span>🔥 Win Streak:</span>
                                      <span className="text-amber-400 font-bold">+{userRank.streakBonus} DPI</span>
                                    </div>
                                    <div className="bg-[#06261f]/70 p-1 rounded border border-[#184d3c] flex items-center justify-between">
                                      <span>⚡ Activity:</span>
                                      <span className="text-emerald-400 font-bold">+{userRank.frequencyBonus} DPI</span>
                                    </div>
                                    <div className="bg-[#06261f]/70 p-1 rounded border border-[#184d3c] flex items-center justify-between col-span-2">
                                      <span>🎯 Opponent Gap Bonus:</span>
                                      <span className="text-[#d6a735] font-bold">+{userRank.gapBonus} DPI ({opponentRatingAvg} Avg ELO)</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Quick Stats Grid */}
                                <div className="grid grid-cols-3 gap-1 text-center p-2 bg-[#0c3b2e]/60 rounded-xl border border-[#184d3c] text-[10px]">
                                  <div>
                                    <span className="block text-emerald-400 font-black text-xs">{wins}</span>
                                    <span className="text-slate-400 font-bold uppercase">Wins</span>
                                  </div>
                                  <div>
                                    <span className="block text-red-400 font-black text-xs">{losses}</span>
                                    <span className="text-slate-400 font-bold uppercase">Losses</span>
                                  </div>
                                  <div>
                                    <span className="block text-amber-400 font-black text-xs">{draws}</span>
                                    <span className="text-slate-400 font-bold uppercase">Draws</span>
                                  </div>
                                </div>

                                {/* Actions List */}
                                <div className="space-y-1.5 pt-1">
                                  <NavLink
                                    href="/arena"
                                    onClick={(e) => {
                                      handleNavClick(e, "/arena");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Swords size={15} className="text-[#d6a735]" /> Strategy Game Arena
                                    </span>
                                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                                  </NavLink>

                                  <NavLink
                                    href="/wallet"
                                    onClick={(e) => {
                                      handleNavClick(e, "/wallet");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Wallet size={15} className="text-[#d6a735]" /> Wallet & Ledger
                                    </span>
                                    <span className="text-[10px] font-black text-[#d6a735]">GH₵ {typeof points === "number" ? points.toFixed(2) : points}</span>
                                  </NavLink>

                                  <NavLink
                                    href="/leagues"
                                    onClick={(e) => {
                                      handleNavClick(e, "/leagues");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Trophy size={15} className="text-[#d6a735]" /> Tournaments & Leagues
                                    </span>
                                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                                  </NavLink>

                                  <NavLink
                                    href="/organizer/apply"
                                    onClick={(e) => {
                                      handleNavClick(e, "/organizer/apply");
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Crown size={15} className="text-amber-400" /> {isOrganizerPending ? "Organizer Application Status" : "Apply for Organizer License"}
                                    </span>
                                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                                  </NavLink>

                                  <button
                                    type="button"
                                    onClick={openEditProfileModal}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors cursor-pointer"
                                  >
                                    <span className="flex items-center gap-2">
                                      <UserCog size={15} className="text-[#d6a735]" /> Edit Profile & Phone
                                    </span>
                                    <ChevronRight size={14} className="text-[#cbd5e1]" />
                                  </button>
                                </div>
                              </>
                            )}

                            {/* Logout Button */}
                            <div className="pt-2 border-t border-[#0c3b2e]">
                              <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                              >
                                <LogOut size={15} /> Logout Account
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                  setAuthSuccess("");
                  setIsAuthOpen(true);
                }}
                className="px-4 py-1.5 text-xs font-black text-[#06261f] bg-[#d6a735] hover:bg-[#e2b542] active:scale-95 rounded-full flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer tracking-wide"
              >
                <LogIn size={13} />
                <span>Login</span>
              </button>
            )}
          </div>
        </nav>

        {/* Mobile Header Right Actions & Menu Toggle */}
        <div className="flex md:hidden items-center gap-1.5 sm:gap-2">
          {userToken ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={openEditProfileModal}
                className={`w-7 h-7 rounded-full font-black flex items-center justify-center text-xs border shadow-sm shrink-0 transition-transform active:scale-95 cursor-pointer overflow-hidden ${
                  isAdmin 
                    ? "bg-red-500/20 text-red-400 border-red-500/50" 
                    : isOrganizer
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                    : isFacilitator
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                    : "bg-[#d6a735]/20 text-[#d6a735] border-[#d6a735]/50"
                }`}
                title={username || "Click to Edit Profile"}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={username} className="w-full h-full object-cover rounded-full" />
                ) : (
                  (username || "U")[0].toUpperCase()
                )}
              </button>
              {!isAdmin && (
                <span className="points-badge text-[11px] py-1 px-2 font-black shrink-0 flex items-center gap-1">
                  <Coins size={11} className="text-[#d6a735]" /> {typeof points === "number" ? points.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : points} ⚪
                </span>
              )}
              {/* Mobile Top Header Notification Bell */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsNotificationsOpen((prev) => !prev);
                }}
                aria-label={`Notifications ${effectiveUnreadCount > 0 ? `(${effectiveUnreadCount} unread)` : ""}`}
                className={`relative p-1.5 rounded-xl border transition-colors flex items-center justify-center shadow-sm cursor-pointer ${
                  isNotificationsOpen
                    ? "bg-[#144435] text-[#d6a735] border-[#d6a735]"
                    : "bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] border-[#d6a735]/40"
                }`}
                title="Notifications"
              >
                <Bell size={15} />
                {effectiveUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 bg-[#d6a735] text-[#06261f] font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
                    {effectiveUnreadCount}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
                setAuthSuccess("");
                setIsAuthOpen(true);
              }}
              className="px-3 py-1 text-xs font-bold text-[#06261f] bg-[#d6a735] hover:bg-[#e2b542] rounded-full flex items-center gap-1 shadow-sm transition-all cursor-pointer"
            >
              <LogIn size={12} />
              <span>Login</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="p-1.5 sm:p-2 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] rounded-xl border border-[#d6a735]/40 focus:outline-none transition-colors shadow-sm"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Slide-In Sidebar Drawer in Forest Theme */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs md:hidden transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Slide-In Sidebar in Forest Theme */}
            <div className="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[88vw] bg-[#06261f] border-l border-[#d6a735]/30 shadow-2xl p-5 md:hidden flex flex-col justify-between animate-in slide-in-from-right duration-200 text-[#f5efdf]">
              <div className="space-y-4">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-[#0c3b2e]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/50 flex items-center justify-center font-black font-serif text-sm shadow-inner">
                      D
                    </span>
                    <div>
                      <strong className="block text-sm font-black text-[#f5efdf] font-serif tracking-wider">
                        DAMII ARENA
                      </strong>
                      <span className="block text-[9px] text-[#d6a735] uppercase font-bold tracking-widest">
                        Emerald Forest Theme
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-label="Close navigation menu"
                    className="p-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] rounded-xl border border-[#d6a735]/30 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* User Profile Card inside Sidebar */}
                {userToken ? (
                  (() => {
                    const userRank = getProfileRank({ rating, wins, losses, draws, winStreak, bestStreak, matchesLast7Days, opponentRatingAvg });

                    let cardBg = "bg-[#0c3b2e] border-[#d6a735]/30";
                    let avatarStyle = "bg-[#d6a735]/20 text-[#d6a735] border-[#d6a735]/40";
                    let roleTag = `${userRank.badgeEmoji} ${userRank.title}`;
                    let roleIcon = null;

                    if (isAdmin) {
                      cardBg = "bg-gradient-to-br from-red-950 to-[#081c15] border-red-600/50";
                      avatarStyle = "bg-red-600 text-white border-red-400";
                      roleTag = roleTitle || (isSuperAdmin || role === "super_admin" ? "Super Admin" : "Administrator");
                      roleIcon = <ShieldAlert size={10} className="text-red-300" />;
                    } else if (isOrganizer) {
                      cardBg = "bg-gradient-to-br from-amber-950 to-[#081c15] border-amber-500/50";
                      avatarStyle = "bg-[#d6a735] text-[#06261f] border-amber-400";
                      roleTag = "Organizer";
                      roleIcon = <Crown size={10} className="text-amber-300" />;
                    } else if (isFacilitator) {
                      cardBg = "bg-gradient-to-br from-cyan-950 to-[#081c15] border-cyan-500/50";
                      avatarStyle = "bg-cyan-600 text-white border-cyan-400";
                      roleTag = "Match Arbiter";
                      roleIcon = <Scale size={10} className="text-cyan-300" />;
                    }

                    return (
                      <div className={`p-3.5 rounded-2xl border shadow-md space-y-2.5 ${cardBg}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-sm border shrink-0 shadow-sm overflow-hidden ${avatarStyle}`}>
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={username} className="w-full h-full object-cover rounded-xl" />
                              ) : isAdmin ? (
                                <ShieldAlert size={18} />
                              ) : isOrganizer ? (
                                <Crown size={18} />
                              ) : isFacilitator ? (
                                <Scale size={18} />
                              ) : (
                                username ? username[0].toUpperCase() : "P"
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <strong className="block text-sm font-black text-[#f5efdf] truncate">
                                {username}
                              </strong>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                                {roleIcon}
                                <span className={isAdmin ? "text-red-300" : isOrganizer ? "text-amber-300" : isFacilitator ? "text-cyan-300" : "text-[#d6a735]"}>
                                  {roleTag}
                                </span>
                              </span>
                            </div>
                          </div>
                          {!isAdmin ? (
                            <span className="px-2.5 py-1 rounded-full bg-[#d6a735] text-[#06261f] font-black text-xs shrink-0 shadow-md">
                              GH₵ {typeof points === "number" ? points.toFixed(2) : points}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/50 font-black text-[10px] uppercase tracking-wider shrink-0">
                              Admin Access
                            </span>
                          )}
                        </div>

                        {/* Extra Context info per role */}
                        {isOrganizer && organizationName && (
                          <div className="text-[10px] text-amber-200 font-bold flex items-center gap-1 bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-500/30">
                            <Building2 size={11} className="text-amber-400 shrink-0" />
                            <span className="truncate">{organizationName}</span>
                          </div>
                        )}

                        {!isAdmin && !isOrganizer && !isFacilitator && (
                          <div className="flex items-center justify-between text-[10px] bg-[#06261f]/60 px-2 py-1 rounded-lg border border-[#184d3c]">
                            <span className="text-slate-300">{userRank.dpi} DPI ({rating} ELO)</span>
                            <span className="text-emerald-400 font-bold">{wins}W - {losses}L</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                          <span className="text-[#cbd5e1] font-medium truncate flex items-center gap-1">
                            <Phone size={12} className={isAdmin ? "text-red-400" : isOrganizer ? "text-amber-400" : isFacilitator ? "text-cyan-400" : "text-[#d6a735]"} /> {phoneNumber || "No phone added"}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              openEditProfileModal();
                            }}
                            className={`hover:underline font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer ${isAdmin ? "text-red-300" : isOrganizer ? "text-amber-300" : isFacilitator ? "text-cyan-300" : "text-[#d6a735]"}`}
                          >
                            <UserCog size={12} /> Edit Profile
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-3 bg-[#081c15] rounded-xl border border-[#114232] text-center space-y-2">
                    <p className="text-xs text-[#cbd5e1] font-medium">
                      Welcome to DAMII Draughts
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthError("");
                        setAuthSuccess("");
                        setIsAuthOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full py-2.5 bg-[#d6a735] hover:bg-[#e2b542] text-[#06261f] font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer tracking-wide"
                    >
                      <LogIn size={14} /> Login
                    </button>
                  </div>
                )}

                {/* Navigation Links */}
                <nav className="flex flex-col gap-2 pt-1">
                  <small className="block text-[10px] font-extrabold text-[#d6a735]/80 uppercase tracking-widest px-1 mb-0.5">
                    {isAdmin ? "Admin Navigation" : "Arena Navigation"}
                  </small>
                  {!isAdmin && (
                    <NavLink
                      href="/arena"
                      onClick={(e) => {
                        handleNavClick(e, "/arena");
                        setIsMobileMenuOpen(false);
                      }}
                      className={`p-3 rounded-2xl text-xs font-black flex items-center gap-3 transition-all ${
                        pathname === "/arena"
                          ? "bg-[#d6a735] text-[#06261f] shadow-lg shadow-[#d6a735]/20"
                          : "bg-[#0c3b2e]/80 text-[#f5efdf] hover:bg-[#144435] border border-[#184d3c]"
                      }`}
                    >
                      <Swords size={18} className={pathname === "/arena" ? "text-[#06261f]" : "text-[#d6a735]"} />
                      <span>Strategy Game Arena</span>
                    </NavLink>
                  )}

                  <NavLink
                    href="/leagues"
                    onClick={(e) => {
                      handleNavClick(e, "/leagues");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`p-3 rounded-2xl text-xs font-black flex items-center gap-3 transition-all ${
                      pathname === "/leagues"
                        ? "bg-[#d6a735] text-[#06261f] shadow-lg shadow-[#d6a735]/20"
                        : "bg-[#0c3b2e]/80 text-[#f5efdf] hover:bg-[#144435] border border-[#184d3c]"
                    }`}
                  >
                    <Trophy size={18} className={pathname === "/leagues" ? "text-[#06261f]" : "text-[#d6a735]"} />
                    <span>Tournaments & Leagues</span>
                  </NavLink>

                  {!isAdmin && (
                    <NavLink
                      href="/wallet"
                      onClick={(e) => {
                        handleNavClick(e, "/wallet");
                        setIsMobileMenuOpen(false);
                      }}
                      className={`p-3 rounded-2xl text-xs font-black flex items-center gap-3 transition-all ${
                        pathname === "/wallet"
                          ? "bg-[#d6a735] text-[#06261f] shadow-lg shadow-[#d6a735]/20"
                          : "bg-[#0c3b2e]/80 text-[#f5efdf] hover:bg-[#144435] border border-[#184d3c]"
                      }`}
                    >
                      <Wallet size={18} className={pathname === "/wallet" ? "text-[#06261f]" : "text-[#d6a735]"} />
                      <span>Wallet & Ledger</span>
                    </NavLink>
                  )}

                  {/* Alerts & Notifications item in Mobile Menu */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsNotificationsOpen(true);
                    }}
                    className="w-full p-3 rounded-2xl text-xs font-black flex items-center justify-between transition-all bg-[#0c3b2e]/80 text-[#f5efdf] hover:bg-[#144435] border border-[#184d3c] cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <Bell size={18} className="text-[#d6a735]" />
                      <span>Alerts & Notifications</span>
                    </span>
                    {effectiveUnreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#d6a735] text-[#06261f] text-[10px] font-black">
                        {effectiveUnreadCount} New
                      </span>
                    )}
                  </button>

                  {isOrganizerOrApplied && (
                    <NavLink
                      href="/organizer"
                      onClick={(e) => {
                        handleNavClick(e, "/organizer");
                        setIsMobileMenuOpen(false);
                      }}
                      className={`p-3 rounded-2xl text-xs font-black flex items-center gap-3 transition-all ${
                        pathname === "/organizer"
                          ? "bg-amber-500 text-[#06261f] shadow-lg shadow-amber-500/20"
                          : "bg-amber-950/40 text-amber-100 hover:bg-amber-900/50 border border-amber-600/50"
                      }`}
                    >
                      <Crown size={18} className={pathname === "/organizer" ? "text-[#06261f]" : "text-amber-400"} />
                      <span>Organizer Studio & Hub</span>
                    </NavLink>
                  )}

                  {!isAdmin && !isOrganizer && (
                    <NavLink
                      href="/organizer/apply"
                      onClick={(e) => {
                        handleNavClick(e, "/organizer/apply");
                        setIsMobileMenuOpen(false);
                      }}
                      className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-3 transition-all ${
                        pathname === "/organizer/apply"
                          ? "bg-amber-500 text-[#06261f] shadow-lg shadow-amber-500/20"
                          : "bg-[#0c3b2e]/80 text-[#f5efdf] hover:bg-[#144435] border border-[#184d3c]"
                      }`}
                    >
                      <Crown size={18} className={pathname === "/organizer/apply" ? "text-[#06261f]" : "text-amber-400"} />
                      <span>{isOrganizerPending ? "Organizer Application: Under Review" : "Apply for Organizer License"}</span>
                    </NavLink>
                  )}

                  {isAdmin && (
                    <NavLink
                      href="/admin"
                      onClick={(e) => {
                        handleNavClick(e, "/admin");
                        setIsMobileMenuOpen(false);
                      }}
                      className={`p-3 rounded-2xl text-xs font-black flex items-center gap-3 transition-all ${
                        pathname === "/admin"
                          ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                          : "bg-red-950/40 text-red-100 hover:bg-red-900/50 border border-red-700/50"
                      }`}
                    >
                      <ShieldAlert size={18} className={pathname === "/admin" ? "text-white" : "text-red-400"} />
                      <span>Admin Control Center</span>
                    </NavLink>
                  )}

                  {isFacilitator && !isAdmin && (
                    <NavLink
                      href="/admin"
                      onClick={(e) => {
                        handleNavClick(e, "/admin");
                        setIsMobileMenuOpen(false);
                      }}
                      className={`p-3 rounded-2xl text-xs font-black flex items-center gap-3 transition-all ${
                        pathname === "/admin"
                          ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                          : "bg-cyan-950/40 text-cyan-100 hover:bg-cyan-900/50 border border-cyan-700/50"
                      }`}
                    >
                      <Scale size={18} className={pathname === "/admin" ? "text-white" : "text-cyan-400"} />
                      <span>Arbiter Hub & Disputes</span>
                    </NavLink>
                  )}
                </nav>
              </div>

              {/* Sidebar Footer Actions */}
              <div className="pt-4 border-t border-[#0c3b2e] space-y-2">
                <div className="p-3 bg-[#0c3b2e]/60 rounded-xl border border-[#d6a735]/20 text-[11px] text-[#cbd5e1] flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-[#f5efdf]">
                    <Sparkles size={14} className="text-[#d6a735]" /> 10×10 Draughts Rules
                  </span>
                  <span className="text-[9px] bg-[#d6a735]/20 text-[#d6a735] px-1.5 py-0.5 rounded font-extrabold uppercase">
                    Official
                  </span>
                </div>

                {userToken ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    <LogOut size={15} /> Logout Account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError("");
                      setAuthSuccess("");
                      setIsAuthOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    <LogIn size={15} /> Sign In / Create Account
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </header>

      {/* Real-time In-App Notification Center Drawer & Popover (Universal for Mobile & Desktop) */}
      <NotificationCenter
        userToken={userToken}
        username={username}
        isOpen={isNotificationsOpen}
        onOpenChange={setIsNotificationsOpen}
        onUnreadCountChange={setUnreadCountFromCenter}
        showDesktopTrigger={false}
      />

      {/* Mobile Bottom Navigation Bar (App Footer Menu) - Hidden on Admin Page */}
      {pathname !== "/admin" && (
        <nav
          aria-label="Mobile Navigation Bar"
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#06261f]/95 border-t border-[#d6a735]/30 backdrop-blur-md px-3 py-2 shadow-2xl flex items-center justify-around"
        >
        {isFocusMode && pathname === "/arena" ? (
          <div className="w-full flex items-center justify-between px-2 py-1 bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5">
              <Eye size={16} />
              <span className="uppercase tracking-wide text-[11px]">Arena Focus Mode Active</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("damii-focus-mode", "false");
                  window.dispatchEvent(new CustomEvent("damii-focus-mode-change", { detail: false }));
                }
              }}
              className="px-2.5 py-1 bg-slate-950 text-amber-300 rounded-lg text-[10px] font-bold border border-amber-400/40 hover:bg-slate-900 transition-colors"
            >
              Exit Focus
            </button>
          </div>
        ) : (
          <>
            {!isAdmin ? (
              <NavLink
                href="/arena"
                onClick={(e) => handleNavClick(e, "/arena")}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  pathname === "/arena"
                    ? "text-[#d6a735] bg-[#0c3b2e] border border-[#d6a735]/40 font-black shadow-md"
                    : "text-[#cbd5e1] hover:text-[#f5efdf]"
                }`}
              >
                <Swords size={18} className={pathname === "/arena" ? "text-[#d6a735]" : "text-[#94a3b8]"} />
                <span className="text-[10px] font-extrabold tracking-tight">Arena</span>
              </NavLink>
            ) : (
              <NavLink
                href="/admin"
                onClick={(e) => handleNavClick(e, "/admin")}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  pathname === "/admin"
                    ? "text-red-300 bg-red-950/60 border border-red-500/50 font-black shadow-md"
                    : "text-[#cbd5e1] hover:text-[#f5efdf]"
                }`}
              >
                <ShieldAlert size={18} className={pathname === "/admin" ? "text-red-300" : "text-[#94a3b8]"} />
                <span className="text-[10px] font-extrabold tracking-tight">Admin</span>
              </NavLink>
            )}

            <NavLink
              href="/leagues"
              onClick={(e) => handleNavClick(e, "/leagues")}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all ${
                pathname === "/leagues"
                  ? "text-[#d6a735] bg-[#0c3b2e] border border-[#d6a735]/40 font-black shadow-md"
                  : "text-[#cbd5e1] hover:text-[#f5efdf]"
              }`}
            >
              <Trophy size={18} className={pathname === "/leagues" ? "text-[#d6a735]" : "text-[#94a3b8]"} />
              <span className="text-[10px] font-extrabold tracking-tight">Leagues</span>
            </NavLink>

            {!isAdmin && (
              <NavLink
                href="/wallet"
                onClick={(e) => handleNavClick(e, "/wallet")}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  pathname === "/wallet"
                    ? "text-[#d6a735] bg-[#0c3b2e] border border-[#d6a735]/40 font-black shadow-md"
                    : "text-[#cbd5e1] hover:text-[#f5efdf]"
                }`}
              >
                <Wallet size={18} className={pathname === "/wallet" ? "text-[#d6a735]" : "text-[#94a3b8]"} />
                <span className="text-[10px] font-extrabold tracking-tight">Wallet</span>
              </NavLink>
            )}

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsNotificationsOpen((prev) => !prev);
              }}
              className={`relative flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all cursor-pointer ${
                isNotificationsOpen
                  ? "text-[#d6a735] bg-[#0c3b2e] border border-[#d6a735]/40 font-black shadow-md"
                  : "text-[#cbd5e1] hover:text-[#f5efdf]"
              }`}
            >
              <div className="relative">
                <Bell size={18} className={effectiveUnreadCount > 0 ? "text-[#d6a735]" : "text-[#94a3b8]"} />
                {effectiveUnreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-0.5 bg-[#d6a735] text-[#06261f] font-black text-[9px] rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {effectiveUnreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-extrabold tracking-tight">Updates</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen(false);
                setIsMobileMenuOpen((prev) => !prev);
              }}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all ${
                isMobileMenuOpen
                  ? "text-[#d6a735] bg-[#0c3b2e] border border-[#d6a735]/40 font-black shadow-md"
                  : "text-[#cbd5e1] hover:text-[#f5efdf]"
              }`}
            >
              <Menu size={18} className={isMobileMenuOpen ? "text-[#d6a735]" : "text-[#94a3b8]"} />
              <span className="text-[10px] font-extrabold tracking-tight">Menu</span>
            </button>
          </>
        )}
      </nav>
      )}

      {/* Auth Modal Overlay */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#06261f] border border-[#d6a735]/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#f5efdf] my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#0c3b2e] bg-[#0c3b2e]/70">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-[#d6a735]" size={22} />
                <div>
                  <h3 className="text-base sm:text-lg font-black font-serif text-[#f5efdf]">
                    {createdUsername
                      ? "Account Created Successfully!"
                      : authMode === "login"
                      ? "Sign In"
                      : authMode === "complete_profile"
                      ? "Complete Profile"
                      : regStep === 1
                      ? "Create Account"
                      : regStep === 2
                      ? "Verify Phone via SMS OTP"
                      : (regAccountType === "organizer" ? "Complete Organizer Profile" : "Complete Player Profile")}
                  </h3>
                  <p className="text-[11px] text-[#d6a735]">
                    {createdUsername
                      ? "Your Gamer Tag has been assigned"
                      : authMode === "login"
                      ? "Sign in to access your account"
                      : authMode === "complete_profile" || regStep === 3
                      ? (regAccountType === "organizer" ? "Step 3 of 3: Organization & Details" : "Step 3 of 3: Gamer Tag & Password")
                      : regStep === 2
                      ? "Step 2 of 3: Enter 6-digit SMS verification code"
                      : "Step 1 of 3: Select account type & verify mobile number"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAuthOpen(false);
                  window.dispatchEvent(new CustomEvent("damii-auth-closed"));
                }}
                className="text-slate-400 hover:text-slate-100 transition-colors p-1 rounded-lg hover:bg-[#0c3b2e]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            {authMode !== "complete_profile" && (
              <div className="grid grid-cols-2 bg-[#06261f] border-b border-[#0c3b2e] p-1.5 gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    authMode === "login"
                      ? "bg-[#d6a735] text-[#06261f] font-black shadow-md"
                      : "text-slate-300 hover:text-white hover:bg-[#0c3b2e]"
                  }`}
                >
                  <LogIn size={14} /> Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    authMode === "register"
                      ? "bg-[#d6a735] text-[#06261f] font-black shadow-md"
                      : "text-slate-300 hover:text-white hover:bg-[#0c3b2e]"
                  }`}
                >
                  <UserPlus size={14} /> Register
                </button>
              </div>
            )}

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {authError && (
                <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                  <span>{authSuccess}</span>
                </div>
              )}

              {/* Registration Step 1: Account Type Selection & Phone Request OTP */}
              {authMode === "register" && regStep === 1 && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  {/* Account Type Selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#f5efdf]">
                      Select Account Type:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setRegAccountType("player")}
                        className={`p-3 rounded-xl text-left border transition-all relative ${
                          regAccountType === "player"
                            ? "bg-[#0c3b2e] border-[#d6a735] shadow-md ring-1 ring-[#d6a735]"
                            : "bg-[#06261f] border-[#184d3c] hover:border-[#d6a735]/40 opacity-80"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-[#f5efdf] flex items-center gap-1.5">
                            <Users size={14} className="text-[#d6a735]" /> Player Account
                          </span>
                          <span className="text-[9px] bg-[#d6a735]/20 text-[#d6a735] px-1.5 py-0.5 rounded font-bold">
                            Default
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Play 1v1 wagers, casual draughts, climb ranks &amp; join tournaments.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegAccountType("organizer")}
                        className={`p-3 rounded-xl text-left border transition-all relative ${
                          regAccountType === "organizer"
                            ? "bg-[#0c3b2e] border-[#d6a735] shadow-md ring-1 ring-[#d6a735]"
                            : "bg-[#06261f] border-[#184d3c] hover:border-[#d6a735]/40 opacity-80"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-[#f5efdf] flex items-center gap-1.5">
                            <Trophy size={14} className="text-[#d6a735]" /> Tournament Organizer
                          </span>
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                            Host Leagues
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Host tournaments, manage brackets, register gaming venues &amp; clubs.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1">
                      <Phone size={13} className="text-[#d6a735]" /> Mobile Phone Number (Verification &amp; MoMo Payouts)
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="e.g. 0241234567 or +233241234567"
                        className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
                      />
                    </div>
                    <small className="block text-[10px] text-slate-400 mt-1">
                      Supports MTN, Telecel, and AT networks. A 6-digit SMS verification code will be sent to this number.
                    </small>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      "Sending OTP Code..."
                    ) : (
                      <>
                        <Smartphone size={16} /> Send 6-Digit OTP Code
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Registration Step 2: OTP Verification */}
              {authMode === "register" && regStep === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 bg-[#0c3b2e]/70 border border-[#d6a735]/30 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#d6a735] flex items-center gap-1">
                        <Clock size={14} /> Enter Verification Code
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setRegStep(1);
                          setAuthError("");
                        }}
                        className="text-[11px] text-[#d6a735] hover:underline font-bold"
                      >
                        Change Number
                      </button>
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      A 6-digit verification code was sent to <strong className="text-white">{regPhone}</strong> ({regAccountType === "organizer" ? "Organizer Setup" : "Player Setup"}).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1">
                      <KeyRound size={13} className="text-[#d6a735]" /> 6-Digit SMS Code *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={regOtpCode}
                      onChange={(e) => setRegOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 123456"
                      className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-center text-xl font-mono tracking-widest focus:outline-none focus:border-[#d6a735] transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {resendCooldown > 0 ? (
                        <span>Resend code in <strong className="text-[#d6a735]">{resendCooldown}s</strong></span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRequestOtp()}
                          className="text-[#d6a735] hover:underline font-bold flex items-center gap-1"
                        >
                          <RefreshCw size={12} /> Resend OTP Code
                        </button>
                      )}
                    </span>
                    <span>Expires in 4 mins</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || regOtpCode.length < 4}
                    className="w-full py-3 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? "Verifying Code..." : (
                      <>
                        <CheckCircle2 size={16} /> Verify Code &amp; Continue
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Registration Step 3 / Complete Profile */}
              {((authMode === "register" && regStep === 3) || authMode === "complete_profile") && (
                <form onSubmit={handleCompleteProfile} className="space-y-3.5">
                  <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                      <CheckCircle2 size={15} className="text-emerald-400" /> Phone verified successfully! Complete your {regAccountType === "organizer" ? "Organizer" : "Player"} profile below.
                    </span>
                  </div>

                  <div className="p-3 bg-[#0c3b2e]/70 border border-[#d6a735]/30 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-[#d6a735] flex items-center gap-1">
                      {regAccountType === "organizer" ? <Trophy size={14} /> : <UserCheck size={14} />}
                      {regAccountType === "organizer" ? "Tournament Organizer Credentials" : "Player Registration Details"}
                    </span>
                    <p className="text-slate-300 text-[11px]">
                      {regAccountType === "organizer"
                        ? "Enter your organization/club details to set up your organizer studio. Organizers must be at least 18 years old."
                        : "Enter your official player details to complete registration. Players must be at least 18 years of age."}
                    </p>
                  </div>

                  {/* Organizer specific fields */}
                  {regAccountType === "organizer" && (
                    <div className="p-3 bg-[#06261f] border border-[#184d3c] rounded-xl space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-[#d6a735] mb-1 flex items-center gap-1">
                          <Building2 size={12} /> Organization / Draughts Club Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={regOrgName}
                          onChange={(e) => setRegOrgName(e.target.value)}
                          placeholder="e.g. Greater Accra Draughts Guild or Tema Masters"
                          className="w-full px-3 py-2 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                          <FileText size={12} className="text-[#d6a735]" /> Organizer Bio / Experience (Optional)
                        </label>
                        <textarea
                          rows={2}
                          value={regOrgBio}
                          onChange={(e) => setRegOrgBio(e.target.value)}
                          placeholder="e.g. 5+ years organizing regional draughts tournaments in Accra &amp; Kumasi"
                          className="w-full px-3 py-2 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#f5efdf] mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Sparkles size={12} className="text-[#d6a735]" /> Gamer Tag / Username *
                        </span>
                        <span className="text-[10px] text-[#d6a735] font-mono font-bold">
                          3–25 chars
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          minLength={3}
                          maxLength={25}
                          value={profUsername}
                          onChange={(e) => setProfUsername(e.target.value)}
                          placeholder={regAccountType === "organizer" ? "e.g. org_mensah" : "e.g. lemon264"}
                          className="w-full px-3 py-2 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#d6a735] font-mono font-bold text-xs focus:outline-none focus:border-[#d6a735]"
                        />
                      </div>
                      <small className="block text-[10px] text-slate-400 mt-1">
                        Unique handle for identification on matches and leaderboards.
                      </small>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#f5efdf] mb-1">
                        Full Legal Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={profFullName}
                        onChange={(e) => setProfFullName(e.target.value)}
                        placeholder="e.g. Kwame Mensah"
                        className="w-full px-3 py-2 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#f5efdf] mb-1 flex items-center gap-1">
                        <Calendar size={11} className="text-[#d6a735]" /> Date of Birth * <span className="text-[10px] text-amber-400 font-bold">(18+ Only)</span>
                      </label>
                      <input
                        type="date"
                        required
                        max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                        value={profDob}
                        onChange={(e) => setProfDob(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                      />
                      <small className="block text-[10px] text-slate-400 mt-1">
                        Must be at least 18 years old. Underage registration is not allowed.
                      </small>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#f5efdf] mb-1 flex items-center gap-1">
                        <Mail size={11} className="text-[#d6a735]" /> Email Address <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        value={profEmail}
                        onChange={(e) => setProfEmail(e.target.value)}
                        placeholder="user@example.com (optional)"
                        className="w-full px-3 py-2 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                      />
                      <small className="block text-[10px] text-slate-400 mt-1">
                        Optional for match &amp; tournament notifications.
                      </small>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#f5efdf] mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Lock size={12} className="text-[#d6a735]" /> Create Password *
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                        >
                          {showRegPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                          {showRegPassword ? "Hide" : "Show"}
                        </button>
                      </label>
                      <input
                        type={showRegPassword ? "text" : "password"}
                        required
                        minLength={4}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create password (min 4 characters)"
                        className="w-full px-3 py-2 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-xs focus:outline-none focus:border-[#d6a735] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#f5efdf] mb-1 flex items-center gap-1">
                        <Lock size={12} className="text-[#d6a735]" /> Confirm Password *
                      </label>
                      <input
                        type={showRegPassword ? "text" : "password"}
                        required
                        minLength={4}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full px-3 py-2 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-xs focus:outline-none focus:border-[#d6a735] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Verified Phone Information */}
                  <div className="p-2.5 bg-[#06261f] border border-[#184d3c] rounded-xl flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Phone size={12} className="text-[#d6a735]" /> Verified Phone: <strong className="text-white font-mono">{regPhone || phoneNumber || "0553340120"}</strong>
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/30 flex items-center gap-1">
                      <Lock size={10} /> Verified
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      "Completing Profile..."
                    ) : regAccountType === "organizer" ? (
                      <>
                        <Trophy size={16} /> Complete Organizer Profile &amp; Open Studio
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Complete Profile &amp; Enter Arena
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Sign In Mode / MFA Challenge */}
              {authMode === "login" && mfaChallenge && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#0c3b2e]/70 border border-[#d6a735]/40 rounded-2xl text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-[#d6a735]/20 border border-[#d6a735]/50 flex items-center justify-center mx-auto text-[#d6a735]">
                      <ShieldCheck size={26} />
                    </div>
                    <h4 className="text-sm font-black text-[#f5efdf]">
                      Multi-Factor Authentication Required
                    </h4>
                    <p className="text-xs text-slate-300">
                      Sign in security challenge for <strong className="text-[#d6a735]">@{mfaChallenge.username}</strong>
                    </p>
                  </div>

                  {/* Method Selector Tabs if multiple methods available */}
                  {(mfaChallenge.hasPasskeys || mfaChallenge.hasTotp) && (
                    <div className="flex gap-2 p-1 bg-[#06261f] rounded-xl border border-[#184d3c] text-xs font-bold">
                      {mfaChallenge.hasPasskeys && (
                        <button
                          type="button"
                          onClick={() => {
                            setMfaLoginMethod("passkey");
                            setAuthError("");
                          }}
                          className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            mfaLoginMethod === "passkey" || mfaLoginMethod === "biometric"
                              ? "bg-[#d6a735] text-[#06261f]"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <KeyRound size={14} /> Passkey / Biometrics
                        </button>
                      )}
                      {mfaChallenge.hasTotp && (
                        <button
                          type="button"
                          onClick={() => {
                            setMfaLoginMethod("totp");
                            setAuthError("");
                          }}
                          className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            mfaLoginMethod === "totp"
                              ? "bg-[#d6a735] text-[#06261f]"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Smartphone size={14} /> Authenticator App
                        </button>
                      )}
                      {mfaChallenge.hasBackupCodes && (
                        <button
                          type="button"
                          onClick={() => {
                            setMfaLoginMethod("backup");
                            setAuthError("");
                          }}
                          className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            mfaLoginMethod === "backup"
                              ? "bg-[#d6a735] text-[#06261f]"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Lock size={14} /> Backup Code
                        </button>
                      )}
                    </div>
                  )}

                  {/* Passkey / Biometric Option */}
                  {(mfaLoginMethod === "passkey" || mfaLoginMethod === "biometric") && (
                    <div className="p-4 bg-[#0c3b2e]/40 border border-[#184d3c] rounded-2xl text-center space-y-3">
                      <p className="text-xs text-slate-300">
                        Use your device Face ID, Touch ID, or security passkey to confirm your identity instantly without waiting for an SMS.
                      </p>
                      <button
                        type="button"
                        disabled={isMfaVerifying}
                        onClick={() => handleVerifyLoginMfa("passkey")}
                        className="w-full py-3 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isMfaVerifying ? (
                          "Verifying Biometric / Passkey..."
                        ) : (
                          <>
                            <Zap size={16} /> Tap to Authenticate with Device
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* TOTP or Backup Code Option */}
                  {(mfaLoginMethod === "totp" || mfaLoginMethod === "backup") && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center justify-between">
                          <span>
                            {mfaLoginMethod === "totp"
                              ? "6-Digit Authenticator Code"
                              : "Emergency 8-Character Backup Code"}
                          </span>
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={mfaLoginMethod === "totp" ? 6 : 10}
                          value={mfaLoginCode}
                          onChange={(e) => setMfaLoginCode(e.target.value.trim().toUpperCase())}
                          placeholder={mfaLoginMethod === "totp" ? "123456" : "A1B2C3D4"}
                          className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#d6a735] placeholder-slate-500 font-mono font-bold tracking-widest text-center text-lg focus:outline-none focus:border-[#d6a735] transition-colors"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isMfaVerifying}
                        onClick={() => handleVerifyLoginMfa()}
                        className="w-full py-3 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isMfaVerifying ? "Verifying Code..." : "Verify & Complete Sign In"}
                      </button>
                    </div>
                  )}

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMfaChallenge(null);
                        setAuthError("");
                      }}
                      className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      ← Back to username and password
                    </button>
                  </div>
                </div>
              )}

              {/* Sign In Mode (Initial Credentials) */}
              {authMode === "login" && !mfaChallenge && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1">
                      <User size={13} className="text-[#d6a735]" /> Username or Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="e.g. lemon264 or 0241234567"
                      className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1">
                      <Lock size={13} className="text-[#d6a735]" /> Password
                    </label>
                    <input
                      type="password"
                      required
                      value={formPasscode}
                      onChange={(e) => setFormPasscode(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      "Signing in..."
                    ) : (
                      <>
                        <LogIn size={16} /> Sign In
                      </>
                    )}
                  </button>

                  {/* 1-Tap Passkey / Biometrics Login */}
                  <div className="pt-2">
                    <div className="relative flex items-center justify-center mb-3">
                      <div className="border-t border-[#184d3c] w-full" />
                      <span className="bg-[#06261f] px-3 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        Or passwordless
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handlePasskeyDirectLogin}
                      className="w-full py-2.5 px-3 bg-[#0c3b2e] hover:bg-[#114232] border border-[#184d3c] hover:border-[#d6a735]/50 text-[#f5efdf] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Zap size={14} className="text-[#d6a735]" />
                      <span>Sign in with Passkey / Phone Biometrics</span>
                    </button>
                  </div>

                  <div className="pt-2 text-center text-xs text-slate-400">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setRegStep(1);
                        setAuthError("");
                      }}
                      className="text-[#d6a735] hover:underline font-bold cursor-pointer"
                    >
                      Register
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#06261f] border border-[#d6a735]/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#f5efdf] my-auto flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#0c3b2e] bg-[#0c3b2e]/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40">
                  <UserCog size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-serif text-[#f5efdf]">
                    Edit Player Profile
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Manage your player avatar, gaming tag, MoMo details, and account security.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#0c3b2e] transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-[#0c3b2e] bg-[#041a15] px-4 sm:px-6 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditActiveTab("identity")}
                className={`py-3 px-3 sm:px-4 text-xs font-black border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  editActiveTab === "identity"
                    ? "border-[#d6a735] text-[#d6a735] bg-[#0c3b2e]/40"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#0c3b2e]/20"
                }`}
              >
                <Sparkles size={14} /> Avatar &amp; Identity
              </button>
              <button
                type="button"
                onClick={() => setEditActiveTab("personal")}
                className={`py-3 px-3 sm:px-4 text-xs font-black border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  editActiveTab === "personal"
                    ? "border-[#d6a735] text-[#d6a735] bg-[#0c3b2e]/40"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#0c3b2e]/20"
                }`}
              >
                <Phone size={14} /> Personal &amp; MoMo
              </button>
              <button
                type="button"
                onClick={() => setEditActiveTab("security")}
                className={`py-3 px-3 sm:px-4 text-xs font-black border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  editActiveTab === "security"
                    ? "border-[#d6a735] text-[#d6a735] bg-[#0c3b2e]/40"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#0c3b2e]/20"
                }`}
              >
                <Shield size={14} /> Security &amp; Sessions
              </button>
            </div>

            <form onSubmit={handleEditProfileSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Feedback messages */}
              {editError && (
                <div className="p-3 bg-red-950/90 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{editError}</span>
                </div>
              )}

              {editSuccess && (
                <div className="p-3 bg-emerald-950/90 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                  <span>{editSuccess}</span>
                </div>
              )}

              {/* TAB 1: IDENTITY & AVATAR */}
              {editActiveTab === "identity" && (
                <div className="space-y-4">
                  {/* Avatar Picker Section */}
                  <div className="p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-2xl space-y-3.5">
                    <label className="block text-xs font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={14} /> Player Avatar &amp; Profile Picture
                    </label>

                    {avatarUploadError && (
                      <div className="p-2.5 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2">
                        <AlertCircle size={14} className="text-red-400 shrink-0" />
                        <span>{avatarUploadError}</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Avatar Preview */}
                      <div className="relative group shrink-0">
                        <div className="w-20 h-20 rounded-2xl bg-[#06261f] border-2 border-[#d6a735] flex items-center justify-center text-2xl font-black text-[#d6a735] overflow-hidden shadow-xl">
                          {editAvatarUrl ? (
                            <img src={editAvatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                          ) : (
                            (editUsername || username || "U")[0].toUpperCase()
                          )}
                        </div>
                        {editAvatarUrl && (
                          <button
                            type="button"
                            onClick={() => setEditAvatarUrl(null)}
                            title="Remove avatar"
                            className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-md transition-transform hover:scale-110 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 flex-1 text-center sm:text-left">
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                            onChange={handleAvatarFileUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            disabled={isUploadingAvatar}
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3.5 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] text-xs font-black rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Upload size={13} /> {isUploadingAvatar ? "Processing..." : "Upload Custom Image"}
                          </button>
                          {editAvatarUrl && (
                            <button
                              type="button"
                              onClick={() => setEditAvatarUrl(null)}
                              className="px-3 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={12} /> Clear Avatar
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Supported formats: JPG, PNG, WebP, GIF (Max 2MB). Images are cropped into a crisp square automatically.
                        </p>
                      </div>
                    </div>

                    {/* Preset Avatars Carousel / Grid */}
                    <div className="pt-2 border-t border-[#184d3c]/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-bold">Or pick a Default Grandmaster Avatar:</span>
                        <span className="text-[10px] text-[#d6a735] font-mono">{SYSTEM_AVATARS.length} Available</span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {SYSTEM_AVATARS.map((item) => {
                          const isSelected = editAvatarUrl === item.url;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setEditAvatarUrl(item.url);
                                setAvatarUploadError("");
                              }}
                              className={`group relative p-1 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                                isSelected
                                  ? "bg-[#d6a735]/20 border-[#d6a735] scale-105 shadow-md shadow-[#d6a735]/10"
                                  : "bg-[#06261f] border-[#184d3c] hover:border-slate-400 hover:bg-[#0c3b2e]"
                              }`}
                              title={item.name}
                            >
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#184d3c] shadow-inner bg-[#06261f]">
                                <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              </div>
                              <span className="text-[8px] font-bold text-slate-300 truncate w-full text-center">
                                {item.name.split(" ")[0]}
                              </span>
                              {isSelected && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#d6a735] text-[#06261f] flex items-center justify-center shadow-sm">
                                  <CheckCircle2 size={10} />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Gamer Tag & Full Legal Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Sparkles size={13} className="text-[#d6a735]" /> Gamer Tag / Username *
                        </span>
                        <span className="text-[10px] text-[#d6a735] font-mono font-bold">
                          3–25 chars
                        </span>
                      </label>
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={25}
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        placeholder="e.g. Kwame_Grandmaster"
                        className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-[#d6a735] transition-colors"
                      />
                      <small className="block text-[10px] text-slate-400 mt-1">
                        Unique handle visible in tournament matches, chat, and leaderboards.
                      </small>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1">
                        <UserCheck size={13} className="text-[#d6a735]" /> Full Legal Name
                      </label>
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        placeholder="e.g. Kwame Mensah"
                        className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
                      />
                      <small className="block text-[10px] text-slate-400 mt-1">
                        Used for identity verification on prize cashouts.
                      </small>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PERSONAL & MOMO */}
              {editActiveTab === "personal" && (
                <div className="space-y-4">
                  {/* Phone & MoMo Network Section with Immutable MoMo Line Policy */}
                  {(() => {
                    const isPhoneLocked = Boolean(isPhoneVerified || phoneNumber || (editPhone && editPhone.trim().length > 0));
                    return (
                      <div className="p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-1.5">
                            <Phone size={14} /> Mobile Money &amp; Withdrawal Account
                          </label>
                          {isPhoneLocked ? (
                            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black rounded-full flex items-center gap-1">
                              <Lock size={11} className="text-emerald-400" /> MoMo Line (Locked &amp; Permanent)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black rounded-full flex items-center gap-1">
                              <AlertCircle size={11} className="text-amber-400" /> Unverified
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center justify-between">
                              <span>Phone Number *</span>
                              {isPhoneLocked && (
                                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-bold">
                                  <Lock size={10} /> Immutable
                                </span>
                              )}
                            </label>
                            <div className="relative">
                              <input
                                type="tel"
                                readOnly={isPhoneLocked}
                                disabled={isPhoneLocked}
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                placeholder="e.g. 0241234567"
                                className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                                  isPhoneLocked
                                    ? "bg-[#06261f] border border-[#184d3c] text-emerald-300 font-mono font-bold cursor-not-allowed select-none opacity-90"
                                    : "bg-[#0c3b2e] border border-[#184d3c] text-[#f5efdf] placeholder-slate-500 focus:outline-none focus:border-[#d6a735]"
                                }`}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[#f5efdf] mb-1.5">
                              MoMo Network Provider
                            </label>
                            <select
                              value={editMomoNetwork}
                              onChange={(e) => setEditMomoNetwork(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
                            >
                              <option value="MTN">MTN Mobile Money</option>
                              <option value="Telecel">Telecel Cash (Vodafone)</option>
                              <option value="AT">AT Money (AirtelTigo)</option>
                            </select>
                          </div>
                        </div>

                        {isPhoneLocked ? (
                          <div className="p-3 bg-emerald-950/70 border border-emerald-800/80 rounded-xl text-[11px] text-emerald-200/90 leading-relaxed flex items-start gap-2.5">
                            <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                            <span>
                              <strong>MoMo Binding Security:</strong> Your registered phone number ({editPhone || phoneNumber}) is permanently linked as your Mobile Money account for deposits and instant tournament payouts. For financial security and anti-fraud integrity, the registered phone number cannot be modified.
                            </span>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-amber-950/60 border border-amber-800/60 rounded-xl text-[11px] text-amber-200/90 leading-relaxed flex items-start gap-2">
                            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                            <span>
                              Your phone number is currently unverified. Enter your accurate 10-digit Ghana MoMo number so it can be verified for seamless cashouts.
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Email & Date of Birth & Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1">
                        <Mail size={13} className="text-[#d6a735]" /> Email Address
                      </label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="player@damii.com"
                        className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1">
                        <Calendar size={13} className="text-[#d6a735]" /> Date of Birth <span className="text-[10px] text-amber-400">(18+)</span>
                      </label>
                      <input
                        type="date"
                        max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                        value={editDob}
                        onChange={(e) => setEditDob(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#f5efdf] mb-1.5">
                        Gender
                      </label>
                      <select
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other / Rather not say</option>
                      </select>
                    </div>
                  </div>

                  {/* Region, City & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1">
                        <MapPin size={13} className="text-[#d6a735]" /> Region (Ghana)
                      </label>
                      <select
                        value={editRegion}
                        onChange={(e) => setEditRegion(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
                      >
                        {regionsList.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name} Region
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#f5efdf] mb-1.5">
                        City / Town
                      </label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="e.g. Accra / Kumasi"
                        className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#f5efdf] mb-1.5">
                      Residential Address / Landmark
                    </label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="e.g. House 42, Spintex Road, Accra"
                      className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735]"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: SECURITY & SESSIONS */}
              {editActiveTab === "security" && (
                <div className="space-y-4">
                  {/* Multi-Factor Authentication (MFA), Passkeys & Biometrics */}
                  <MfaSecurityManager
                    userToken={userToken}
                    username={username}
                    getAuthHeaders={getAuthHeaders}
                    onMfaUpdated={() => {
                      fetchNotifications(userToken);
                    }}
                  />

                  {/* Change Passcode */}
                  <div className="p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-2xl space-y-2.5">
                    <label className="block text-xs font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound size={14} /> Change Security Passcode / PIN
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Leave blank to keep your current secret credentials. Enter at least 6 characters to update.
                    </p>
                    <input
                      type="password"
                      value={editPasscode}
                      onChange={(e) => setEditPasscode(e.target.value)}
                      placeholder="Enter new secure passcode or PIN"
                      className="w-full px-3.5 py-2.5 bg-[#06261f] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
                    />
                  </div>

                  {/* Session Security Section */}
                  <div className="p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#d6a735] flex items-center gap-1.5 uppercase tracking-wider">
                        <Shield size={14} /> Session Security &amp; Token Rotation
                      </span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800 font-mono font-bold">
                        CSRF Protected
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Rotate active session tokens if you suspect compromised credentials, or revoke all active sessions across other devices.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        disabled={isEditLoading}
                        onClick={handleRotateSession}
                        className="py-2.5 px-3.5 bg-[#06261f] hover:bg-[#114232] border border-[#184d3c] text-[#f5efdf] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Zap size={13} className="text-[#d6a735]" /> Rotate Session Token
                      </button>

                      <button
                        type="button"
                        disabled={isEditLoading}
                        onClick={() => handleRevokeSessions(true)}
                        className="py-2.5 px-3.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 text-amber-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <LogOut size={13} className="text-amber-400" /> Revoke Other Devices
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isEditLoading}
                      onClick={() => handleRevokeSessions(false)}
                      className="w-full py-2.5 px-3.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <X size={13} className="text-red-400" /> Revoke All Sessions &amp; Sign Out
                    </button>
                  </div>
                </div>
              )}

              {/* Sticky Bottom Actions */}
              <div className="pt-4 border-t border-[#0c3b2e] flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#0c3b2e] hover:bg-[#144435] text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditLoading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] font-black rounded-xl text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isEditLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} /> Save Profile Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Match Confirm Leave Modal */}
      {pendingNavUrl && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#06261f] border-2 border-[#d6a735] rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl text-[#f5efdf] space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#0c3b2e]">
              <span className="p-2.5 bg-amber-500/20 text-[#d6a735] rounded-xl border border-[#d6a735]/40 shrink-0">
                <Swords size={22} />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#d6a735] font-serif">
                  Active Match in Progress!
                </h3>
                <p className="text-[11px] sm:text-xs text-[#cbd5e1] font-medium">
                  1-on-1 strategy match currently live.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#cbd5e1] leading-relaxed">
              Navigating to another page now will exit your active match in the Arena. Are you sure you want to leave?
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingNavUrl(null)}
                className="w-full sm:flex-1 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-1.5"
              >
                <Swords size={14} /> Stay & Resume Match
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingNavUrl;
                  setPendingNavUrl(null);
                  setIsMatchActive(false);
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem("damii-active-match", "false");
                    sessionStorage.setItem("damii-focus-mode", "false");
                  }
                  if (target) {
                    safeNavigate(router, target);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1"
              >
                Leave Match
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const SharedHeader = Header;
export default Header;

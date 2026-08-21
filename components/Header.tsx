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
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { getProfileRank } from "@/lib/rank-service";
import { NotificationCenter } from "@/components/NotificationCenter";
import {
  saveSessionToken,
  rotateSessionToken,
  revokeAllSessions,
  getAuthHeaders,
  clearSessionToken,
} from "@/lib/client-auth";

type NotificationItem = {
  id: string;
  type: "league_invite" | "wager_settlement" | "system";
  title: string;
  message: string;
  timestamp: string;
  link: string;
};

// vinext's current next/link shim has a broken internal click/navigate
// handler (throws "e is not a function" and swallows the click, so nav
// links stop working). This is a drop-in replacement that renders a plain
// <a> and drives navigation through useRouter().push instead, which is
// unaffected by that bug. Modifier-key clicks (cmd/ctrl/shift/middle-click)
// are left alone so "open in new tab" still works normally.
function NavLink({
  href,
  onClick,
  className,
  children,
  title,
}: {
  href: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    try {
      const result = router.push(href) as unknown;
      if (result && typeof (result as Promise<unknown>).catch === "function") {
        (result as Promise<unknown>).catch(() => {
          if (typeof window !== "undefined") {
            window.location.assign(href);
          }
        });
      }
    } catch {
      if (typeof window !== "undefined") {
        window.location.assign(href);
      }
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className} title={title}>
      {children}
    </a>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [userToken, setUserToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [points, setPoints] = useState(0);
  const [role, setRole] = useState("user");
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
  const [regDebugCode, setRegDebugCode] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

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
  const [dbRegions, setDbRegions] = useState<{ id: string; name: string; code?: string }[]>([]);

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
        setDbRegions([
          { id: "1", name: "Greater Accra" },
          { id: "2", name: "Ashanti" },
          { id: "3", name: "Western" },
          { id: "4", name: "Eastern" },
          { id: "5", name: "Central" },
          { id: "6", name: "Northern" },
          { id: "7", name: "Volta" },
          { id: "8", name: "Upper East" },
          { id: "9", name: "Upper West" },
          { id: "10", name: "Bono" },
        ]);
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

  // Profile Edit modal state
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPasscode, setEditPasscode] = useState("");
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [isEditLoading, setIsEditLoading] = useState(false);

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
          if (parsed.username) setUsername(parsed.username);
          if (parsed.points !== undefined) setPoints(parsed.points);
        } catch {
          // ignore parsing error
        }
      }

      fetch(`/api/wallet?token=${encodeURIComponent(token)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.balance) {
            setPoints(data.balance.points ?? 0);
            if (data.balance.username) setUsername(data.balance.username);
            if (data.balance.role) setRole(data.balance.role);
            if (data.balance.rating !== undefined) setRating(data.balance.rating);
            if (data.balance.phoneNumber !== undefined) setPhoneNumber(data.balance.phoneNumber);
            if (data.balance.wins !== undefined) setWins(data.balance.wins);
            if (data.balance.losses !== undefined) setLosses(data.balance.losses);
            if (data.balance.draws !== undefined) setDraws(data.balance.draws);
            if (data.balance.winStreak !== undefined) setWinStreak(data.balance.winStreak);
            if (data.balance.bestStreak !== undefined) setBestStreak(data.balance.bestStreak);
            if (data.balance.matchesLast7Days !== undefined) setMatchesLast7Days(data.balance.matchesLast7Days);
            if (data.balance.opponentRatingAvg !== undefined) setOpponentRatingAvg(data.balance.opponentRatingAvg);
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
      setWins(0);
      setLosses(0);
      setDraws(0);
      setNotifications([]);
      setOrganizerStatus("none");
      setOrganizationName("");
    }
  }, [fetchNotifications]);

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
    const handleOpenAuth = (e: Event) => {
      setAuthError("");
      setAuthSuccess("");
      const customEvent = e as CustomEvent<{ mode?: "login" | "register" }>;
      if (customEvent.detail?.mode) {
        setAuthMode(customEvent.detail.mode);
      }
      setIsAuthOpen(true);
    };

    window.addEventListener("damii-auth-changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("damii-open-auth", handleOpenAuth);

    return () => {
      window.removeEventListener("damii-auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("damii-open-auth", handleOpenAuth);
    };
  }, [pathname, syncAuth]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

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
      setRegDebugCode(data.debugCode || null);
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
        localStorage.setItem("damii-player-token", data.token);
        localStorage.setItem("damii-player-name", uname);
        localStorage.setItem(
          "damii-auth-user",
          JSON.stringify({
            token: data.token,
            username: uname,
            points: 500,
            role: data.user?.role || "player",
          })
        );
        setUsername(uname);
        setAuthSuccess(`🎉 Welcome back, ${uname}!`);
        window.dispatchEvent(new Event("damii-auth-changed"));
        setTimeout(() => {
          setIsAuthOpen(false);
          setRegStep(1);
          setRegOtpCode("");
          setAuthSuccess("");
        }, 1200);
      } else {
        // Move to Step 3: Complete Player Registration Details
        if (data.user?.fullName) setProfFullName(data.user.fullName);
        if (data.user?.email) setProfEmail(data.user.email);
        const assignedGamerTag = data.username || data.user?.username || "";
        if (assignedGamerTag) {
          setProfUsername(assignedGamerTag);
        }
        setRegStep(3);
        setAuthSuccess("Phone verified successfully! Complete your player profile below.");
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

    if (!profDob) {
      setAuthError("Date of birth is required to verify player eligibility.");
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
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setAuthError(data.error || "Failed to complete profile.");
        setIsLoading(false);
        return;
      }

      const finalName = data.user?.username || profUsername.trim();
      setAuthSuccess(`🎉 Welcome to DAMII Arena, ${finalName}! Your player profile is registered & verified.`);
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
            role: data.user?.role || "player",
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
      }, 1400);
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
      setAuthError("Username and passcode are required.");
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

      setAuthSuccess(`Welcome back, ${data.profile.username}!`);
      window.dispatchEvent(new Event("damii-auth-changed"));

      setTimeout(() => {
        setIsAuthOpen(false);
        setFormPasscode("");
        setAuthSuccess("");
      }, 1000);
    } catch {
      setAuthError("Server communication error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");

    if (!editUsername.trim()) {
      setEditError("Username cannot be empty.");
      return;
    }

    if (!userToken) return;

    setIsEditLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "update_profile",
          token: userToken,
          username: editUsername.trim(),
          phoneNumber: editPhone.trim(),
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
      localStorage.setItem("damii-player-name", data.profile.username);
      setUsername(data.profile.username);
      setPhoneNumber(data.profile.phoneNumber || "");

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
    setIsProfileDropdownOpen(false);
    window.dispatchEvent(new Event("damii-auth-changed"));
  };

  const handleLogout = () => {
    clearAuth();
  };

  const isAdmin = role === "admin" || role === "super_admin";
  const isOrganizer = role === "organizer" || organizerStatus === "approved";
  const isFacilitator = role === "facilitator" || role === "treasurer";
  const isOrganizerPending = organizerStatus === "pending";
  const isOrganizerOrApplied =
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
                {/* Real-time In-App Notification Center with Web Audio & Multi-Channel */}
                <NotificationCenter userToken={userToken} username={username} />

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
                          <span className={`w-7 h-7 rounded-full font-black flex items-center justify-center text-xs border shadow-inner ${avatarBg}`}>
                            {initialLetter}
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
                                  <div className="w-11 h-11 rounded-xl bg-red-600 text-white font-black flex items-center justify-center text-lg shadow-lg shrink-0">
                                    <ShieldAlert size={22} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <strong className="block text-sm font-black text-[#f5efdf] truncate">
                                      {username}
                                    </strong>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="px-2 py-0.5 bg-red-500/30 text-red-200 border border-red-500/50 text-[9px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                                        <ShieldCheck size={10} /> {role === "super_admin" ? "Super Admin" : "Administrator"}
                                      </span>
                                      <span className="text-[10px] text-red-300/80 font-bold">Level 5 Authority</span>
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
                                    <ShieldAlert size={11} className="text-red-400" /> System Regulator Clearance
                                  </div>
                                  <p>Full administrative oversight across tournament brackets, referee disputes, financial ledgers, and platform settings.</p>
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
                                    onClick={() => {
                                      setEditUsername(username);
                                      setEditPhone(phoneNumber || "");
                                      setEditPasscode("");
                                      setEditError("");
                                      setEditSuccess("");
                                      setIsProfileDropdownOpen(false);
                                      setIsEditProfileOpen(true);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
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
                                  <div className="w-11 h-11 rounded-xl bg-[#d6a735] text-[#06261f] font-black flex items-center justify-center text-lg shadow-lg shrink-0">
                                    <Crown size={22} />
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
                                    onClick={() => {
                                      setEditUsername(username);
                                      setEditPhone(phoneNumber || "");
                                      setEditPasscode("");
                                      setEditError("");
                                      setEditSuccess("");
                                      setIsProfileDropdownOpen(false);
                                      setIsEditProfileOpen(true);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
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
                                  <div className="w-11 h-11 rounded-xl bg-cyan-600 text-white font-black flex items-center justify-center text-lg shadow-lg shrink-0">
                                    <Scale size={22} />
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
                                    onClick={() => {
                                      setEditUsername(username);
                                      setEditPhone(phoneNumber || "");
                                      setEditPasscode("");
                                      setEditError("");
                                      setEditSuccess("");
                                      setIsProfileDropdownOpen(false);
                                      setIsEditProfileOpen(true);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
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
                                  <div className="w-10 h-10 rounded-full bg-[#d6a735] text-[#06261f] font-black flex items-center justify-center text-base shadow-md shrink-0">
                                    {username ? username[0].toUpperCase() : "U"}
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
                                    onClick={() => {
                                      setEditUsername(username);
                                      setEditPhone(phoneNumber || "");
                                      setEditPasscode("");
                                      setEditError("");
                                      setEditSuccess("");
                                      setIsProfileDropdownOpen(false);
                                      setIsEditProfileOpen(true);
                                    }}
                                    className="w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors"
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
                onClick={() => {
                  setEditUsername(username);
                  setEditPhone(phoneNumber || "");
                  setEditPasscode("");
                  setEditError("");
                  setEditSuccess("");
                  setIsEditProfileOpen(true);
                }}
                className={`w-7 h-7 rounded-full font-black flex items-center justify-center text-xs border shadow-sm shrink-0 transition-transform active:scale-95 cursor-pointer ${
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
                {(username || "U")[0].toUpperCase()}
              </button>
              {!isAdmin && (
                <span className="points-badge text-[11px] py-1 px-2 font-black shrink-0 flex items-center gap-1">
                  <Coins size={11} className="text-[#d6a735]" /> {typeof points === "number" ? points.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : points} ⚪
                </span>
              )}
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
                      roleTag = role === "super_admin" ? "Super Admin" : "Administrator";
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
                            <span className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-sm border shrink-0 shadow-sm ${avatarStyle}`}>
                              {isAdmin ? <ShieldAlert size={18} /> : isOrganizer ? <Crown size={18} /> : isFacilitator ? <Scale size={18} /> : (username ? username[0].toUpperCase() : "P")}
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
                              setEditUsername(username);
                              setEditPhone(phoneNumber || "");
                              setEditPasscode("");
                              setEditError("");
                              setEditSuccess("");
                              setIsMobileMenuOpen(false);
                              setIsEditProfileOpen(true);
                            }}
                            className={`hover:underline font-bold text-[10px] uppercase ${isAdmin ? "text-red-300" : isOrganizer ? "text-amber-300" : isFacilitator ? "text-cyan-300" : "text-[#d6a735]"}`}
                          >
                            Edit Profile
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

            {userToken && (
              <button
                type="button"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className={`relative flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  isNotificationsOpen
                    ? "text-[#d6a735] bg-[#0c3b2e] border border-[#d6a735]/40 font-black"
                    : "text-[#cbd5e1] hover:text-[#f5efdf]"
                }`}
              >
                <div className="relative">
                  <Bell size={18} className={unreadCount > 0 ? "text-[#d6a735]" : "text-[#94a3b8]"} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-0.5 bg-[#d6a735] text-[#06261f] font-black text-[9px] rounded-full flex items-center justify-center animate-pulse shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-extrabold tracking-tight">Updates</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
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
                      ? "Player Account Sign In"
                      : authMode === "complete_profile"
                      ? "Complete Player Profile"
                      : regStep === 1
                      ? "Register with Phone & OTP"
                      : regStep === 2
                      ? "Verify Phone & Set Password"
                      : "Complete Player Profile"}
                  </h3>
                  <p className="text-[11px] text-[#d6a735]">
                    {createdUsername
                      ? "Your unique 6-character Gamer Tag has been generated"
                      : authMode === "login"
                      ? "Sign in with your username or phone number and password"
                      : authMode === "complete_profile" || regStep === 3
                      ? "Step 3 of 3: Identity & Payout Account"
                      : regStep === 2
                      ? "Step 2 of 2: Code Verification & Password"
                      : "Step 1 of 2: Instant Phone Verification"}
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
                  <LogIn size={14} /> Sign In (Passcode)
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
                  <Smartphone size={14} /> Register (Phone OTP)
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

              {/* Registration Step 1: Phone Request OTP */}
              {authMode === "register" && regStep === 1 && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="p-3 bg-[#0c3b2e]/70 border border-[#d6a735]/30 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-[#d6a735] flex items-center gap-1">
                      <Sparkles size={14} /> Draughts Arena Registration
                    </span>
                    <p className="text-slate-300 text-[11px]">
                      Enter your phone number to receive a one-time 6-digit SMS verification code. No password required.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1">
                      <Phone size={13} className="text-[#d6a735]" /> Phone Number (Payout &amp; Verification)
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
                      Supports MTN, Telecel, and AT networks. This number will be your permanently verified payout destination.
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
                      A 6-digit verification code was sent to <strong className="text-white">{regPhone}</strong>.
                    </p>
                  </div>

                  {regDebugCode && (
                    <div className="p-2 bg-amber-950/60 border border-amber-800 rounded-xl text-amber-200 text-xs flex items-center justify-between">
                      <span>Sandbox Code: <strong>{regDebugCode}</strong></span>
                      <button
                        type="button"
                        onClick={() => setRegOtpCode(regDebugCode)}
                        className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded hover:bg-amber-400"
                      >
                        Auto-Fill
                      </button>
                    </div>
                  )}

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
                      <CheckCircle2 size={15} className="text-emerald-400" /> Phone verified successfully! Complete your player profile below.
                    </span>
                  </div>

                  <div className="p-3 bg-[#0c3b2e]/70 border border-[#d6a735]/30 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-[#d6a735] flex items-center gap-1">
                      <UserCheck size={14} /> Player Registration Details
                    </span>
                    <p className="text-slate-300 text-[11px]">
                      Enter your official player details to complete registration. Players must be at least 18 years of age.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#f5efdf] mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Sparkles size={12} className="text-[#d6a735]" /> Gamer Tag / Username *
                        </span>
                        <span className="text-[10px] bg-[#0c3b2e] text-[#d6a735] px-1.5 py-0.5 rounded font-mono font-bold border border-[#184d3c] flex items-center gap-1">
                          <Lock size={10} /> Read-only
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          disabled
                          required
                          value={profUsername || "Assigning..."}
                          placeholder="e.g. lemon264"
                          className="w-full px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-[#d6a735] font-mono font-bold text-xs cursor-not-allowed select-none opacity-90"
                        />
                      </div>
                      <small className="block text-[10px] text-slate-400 mt-1">
                        Permanently generated fruit tag assigned to your account.
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
                        placeholder="player@example.com (optional)"
                        className="w-full px-3 py-2 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                      />
                      <small className="block text-[10px] text-slate-400 mt-1">
                        Optional for match notifications &amp; alerts.
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
                    {isLoading ? "Completing Profile..." : (
                      <>
                        <Sparkles size={16} /> Complete Profile &amp; Enter Arena
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Sign In Mode (Passcode / Token) */}
              {authMode === "login" && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1">
                      <User size={13} className="text-[#d6a735]" /> Gamer Tag or Phone Number
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
                      <Lock size={13} className="text-[#d6a735]" /> Password / Passcode
                    </label>
                    <input
                      type="password"
                      required
                      value={formPasscode}
                      onChange={(e) => setFormPasscode(e.target.value)}
                      placeholder="Enter your account password"
                      className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? "Signing in..." : (
                      <>
                        <LogIn size={16} /> Sign In to Arena
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center text-xs text-slate-400">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setRegStep(1);
                        setAuthError("");
                      }}
                      className="text-[#d6a735] hover:underline font-bold"
                    >
                      Register via Phone OTP
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#06261f] border border-[#d6a735]/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#f5efdf]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#0c3b2e] bg-[#0c3b2e]/60">
              <div className="flex items-center gap-2">
                <UserCog className="text-[#d6a735]" size={20} />
                <h3 className="text-lg font-black font-serif text-[#f5efdf]">
                  Edit Profile Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="text-slate-400 hover:text-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditProfileSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{editError}</span>
                </div>
              )}

              {editSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                  <span>{editSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#f5efdf] mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Update username"
                  className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1">
                  <Phone size={13} className="text-[#d6a735]" /> Phone Number (Mobile Money)
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 0241234567 or +233241234567"
                  className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
                />
                <small className="block text-[10px] text-slate-400 mt-1">
                  Used for Mobile Money payouts &amp; wager victory settlements.
                </small>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#f5efdf] mb-1.5">
                  New Passcode / PIN <span className="text-[10px] text-slate-400 font-normal">(Leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={editPasscode}
                  onChange={(e) => setEditPasscode(e.target.value)}
                  placeholder="Enter new secret passcode"
                  className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isEditLoading}
                className="w-full py-3 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isEditLoading ? "Saving Changes..." : "Save Profile Changes"}
              </button>

              {/* Session Security Section */}
              <div className="pt-4 border-t border-[#0c3b2e] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#d6a735] flex items-center gap-1.5">
                    <Shield size={14} /> Session Security &amp; Tokens
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800 font-mono">
                    CSRF Protected
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Manage active sessions, rotate session keys, or revoke access on lost/other devices.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isEditLoading}
                    onClick={handleRotateSession}
                    className="w-full py-2 px-3 bg-[#0c3b2e] hover:bg-[#114232] border border-[#184d3c] text-[#f5efdf] text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <Zap size={13} className="text-[#d6a735]" /> Rotate Session Token
                  </button>

                  <button
                    type="button"
                    disabled={isEditLoading}
                    onClick={() => handleRevokeSessions(true)}
                    className="w-full py-2 px-3 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 text-amber-200 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <LogOut size={13} className="text-amber-400" /> Revoke Other Devices
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isEditLoading}
                  onClick={() => handleRevokeSessions(false)}
                  className="w-full py-2 px-3 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <X size={13} className="text-red-400" /> Revoke All Sessions &amp; Sign Out
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
                  router.push(target);
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

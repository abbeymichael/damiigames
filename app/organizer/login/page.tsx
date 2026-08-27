"use client";

import React, { useState, useEffect } from "react";
import { SharedHeader } from "@/components/SharedHeader";
import { Footer } from "@/components/Footer";
import {
  ShieldCheck,
  LogIn,
  UserPlus,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Crown,
  Trophy,
  Users,
  Sparkles,
} from "lucide-react";
import Link, { safeNavigate } from "@/components/NavLink";
import { useRouter } from "next/navigation";
import { getAuthHeaders, saveSessionToken } from "@/lib/client-auth";

export default function OrganizerLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [role, setRole] = useState<string>("user");

  // Auth form states
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPasscode, setAuthPasscode] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const syncAuth = () => {
    const savedToken = localStorage.getItem("damii-player-token") || "";
    const savedName = localStorage.getItem("damii-player-name") || "";
    const authUser = localStorage.getItem("damii-auth-user");

    let savedRole = "user";
    if (authUser) {
      try {
        const parsed = JSON.parse(authUser);
        if (parsed.role) savedRole = parsed.role;
      } catch {
        /* ignore */
      }
    }

    setToken(savedToken);
    setUsername(savedName);
    setRole(savedRole);
  };

  useEffect(() => {
    syncAuth();
    window.addEventListener("damii-auth-changed", syncAuth);
    return () => window.removeEventListener("damii-auth-changed", syncAuth);
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    if (!authUsername.trim() || !authPasscode.trim()) {
      setError("Username and password are required.");
      setBusy(false);
      return;
    }

    if (authMode === "register" && authPasscode.length < 3) {
      setError("Password must be at least 3 characters.");
      setBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: authMode === "login" ? getAuthHeaders() : { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: authMode,
          username: authUsername.trim(),
          passcode: authPasscode.trim(),
          phoneNumber: authMode === "register" ? authPhone.trim() || undefined : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Authentication failed. Check your credentials.");
        setBusy(false);
        return;
      }

      saveSessionToken(data.token, data.csrfToken);
      localStorage.setItem("damii-player-token", data.token);
      localStorage.setItem("damii-player-name", data.profile.username);
      localStorage.setItem(
        "damii-auth-user",
        JSON.stringify({
          token: data.token,
          username: data.profile.username,
          points: data.profile.points || 500,
          role: data.profile.role || "user",
        })
      );

      const userRole = data.profile.role || "user";
      const isAdminUser = ["admin", "super_admin", "treasurer"].includes(userRole) || Boolean(data.adminPermissions?.isSuperAdmin);
      const isOrganizerUser = userRole === "organizer" || userRole === "facilitator";

      setToken(data.token);
      setUsername(data.profile.username);
      setRole(userRole);

      setSuccess(`Signed in as ${data.profile.username}. Redirecting...`);

      window.dispatchEvent(new Event("damii-auth-changed"));

      setTimeout(() => {
        if (isAdminUser) {
          safeNavigate(router, "/admin");
        } else if (isOrganizerUser) {
          safeNavigate(router, "/organizer");
        } else {
          safeNavigate(router, "/arena");
        }
      }, 1000);
    } catch {
      setError("Server connection failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="app-shell min-h-screen bg-[#041d17] text-[#f5efdf] flex flex-col justify-between">
      <SharedHeader />

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 w-full space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/organizer"
            className="px-3 py-1.5 bg-[#06261f] hover:bg-[#081c15] text-[#d6a735] border border-[#114232] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Organizer Hub
          </Link>

          <Link
            href="/organizer/apply"
            className="px-3 py-1.5 bg-[#d6a735]/20 hover:bg-[#d6a735]/30 text-[#d6a735] border border-[#d6a735]/40 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <Crown size={14} /> Apply for License
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-950/90 border border-red-600/80 rounded-2xl text-red-200 flex items-center gap-3 shadow-xl">
            <AlertCircle size={20} className="text-red-400 shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-950/90 border border-emerald-500/80 rounded-2xl text-emerald-200 flex items-center gap-3 shadow-xl">
            <CheckCircle size={20} className="text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold">{success}</span>
          </div>
        )}

        {token ? (
          <div className="p-8 bg-[#06261f] border border-[#114232] rounded-3xl shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-[#0c3b2e] border border-[#d6a735]/40 rounded-2xl flex items-center justify-center mx-auto text-[#d6a735] shadow-lg">
              <ShieldCheck size={32} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-[#f5efdf]">
                Already Signed In
              </h2>
              <p className="text-sm text-[#a3b8b0] mt-1.5">
                You are currently signed in as <strong className="text-[#d6a735]">@{username}</strong> ({role.toUpperCase()}).
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/organizer"
                className="px-6 py-3 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Trophy size={16} /> Open Organizer Studio
              </Link>
              <Link
                href="/organizer/apply"
                className="px-6 py-3 bg-[#0c3b2e] hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <Crown size={16} className="text-[#d6a735]" /> View License Status
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-8 bg-[#06261f] border border-[#114232] rounded-3xl shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-[#0c3b2e] border border-[#d6a735]/40 rounded-2xl flex items-center justify-center mx-auto text-[#d6a735] shadow-lg">
              <ShieldCheck size={32} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-[#f5efdf]">
                {authMode === "login" ? "Organizer Portal Sign In" : "Register as Organizer"}
              </h2>
              <p className="text-sm text-[#a3b8b0] mt-1.5 leading-relaxed">
                {authMode === "login"
                  ? "Sign in with your official account credentials to access your tournament director studio and manage leagues."
                  : "Create your DAMII account to start hosting tournaments or submit your organizer accreditation."}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-[#081c15] border border-[#114232] rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setError("");
                  setSuccess("");
                }}
                className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  authMode === "login"
                    ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                    : "text-[#a3b8b0] hover:text-[#f5efdf]"
                }`}
              >
                <LogIn size={15} /> Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setError("");
                  setSuccess("");
                }}
                className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  authMode === "register"
                    ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                    : "text-[#a3b8b0] hover:text-[#f5efdf]"
                }`}
              >
                <UserPlus size={15} /> Register / Apply
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                  {authMode === "login" ? "Username / Account Name" : "Desired Username / Handle *"}
                </label>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder={authMode === "login" ? "Enter your username" : "e.g. Tema_Draughts_Club"}
                  className="w-full px-4 py-3 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                  Password / Passcode *
                </label>
                <input
                  type="password"
                  required
                  value={authPasscode}
                  onChange={(e) => setAuthPasscode(e.target.value)}
                  placeholder="Enter password (min 3 chars)"
                  className="w-full px-4 py-3 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              {authMode === "register" && (
                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Mobile / MoMo Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    placeholder="e.g. 0244123456"
                    className="w-full px-4 py-3 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {authMode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
                {busy
                  ? "Processing..."
                  : authMode === "login"
                  ? "Sign In to Organizer Studio"
                  : "Create Account & Start Organizing"}
              </button>

              <div className="pt-2 text-center space-y-2">
                {authMode === "login" ? (
                  <p className="text-xs text-[#a3b8b0]">
                    New tournament host?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setError("");
                        setSuccess("");
                      }}
                      className="text-[#d6a735] font-bold hover:underline inline-flex items-center gap-1"
                    >
                      Register here to apply for an Organizer License →
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-[#a3b8b0]">
                    Already registered?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setError("");
                        setSuccess("");
                      }}
                      className="text-[#d6a735] font-bold hover:underline inline-flex items-center gap-1"
                    >
                      Sign in to your account →
                    </button>
                  </p>
                )}

                <div className="pt-2 border-t border-[#114232]">
                  <Link
                    href="/organizer/apply"
                    className="text-xs text-[#d6a735] hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    <Crown size={13} /> Direct Application Portal for Ghana Card Holders →
                  </Link>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}

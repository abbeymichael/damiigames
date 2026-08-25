"use client";

import React, { useState, useEffect } from "react";
import { SharedHeader } from "@/components/SharedHeader";
import { OrganizerApplicationForm } from "@/components/organizer/OrganizerApplicationForm";
import { ShieldCheck, LogIn, UserPlus, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import Link from "@/components/NavLink";
import { getAuthHeaders, saveSessionToken } from "@/lib/client-auth";

export default function OrganizerApplyPage() {
  const [token, setToken] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [role, setRole] = useState<string>("user");

  // Auth form states
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
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
      setError("Username and passcode are required.");
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
        setError(data.error || "Authentication failed. Check your details.");
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

      setToken(data.token);
      setUsername(data.profile.username);
      setRole(data.profile.role || "user");
      setSuccess(
        authMode === "register"
          ? `Account created! Welcome, ${data.profile.username}. Fill in your application below.`
          : `Signed in as ${data.profile.username}`
      );
      window.dispatchEvent(new Event("damii-auth-changed"));
    } catch {
      setError("Server connection failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="app-shell min-h-screen bg-[#041d17] text-[#f5efdf]">
      <SharedHeader />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/organizer"
            className="px-3 py-1.5 bg-[#06261f] hover:bg-[#081c15] text-[#d6a735] border border-[#114232] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Organizer Hub
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

        {!token ? (
          <div className="p-8 bg-[#06261f] border border-[#114232] rounded-3xl shadow-2xl space-y-6 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-[#081c15] border border-[#d6a735]/40 rounded-2xl flex items-center justify-center mx-auto text-[#d6a735] shadow-lg">
              <ShieldCheck size={32} />
            </div>

            <div>
              <h2 className="text-xl font-black text-[#f5efdf]">
                {authMode === "register" ? "Register Organizer Account" : "Sign In to Apply"}
              </h2>
              <p className="text-xs text-[#a3b8b0] mt-1.5 leading-relaxed">
                {authMode === "register"
                  ? "Create a new DAMII account to submit your Certified Organizer license application."
                  : "Sign in with your existing account to continue your Organizer application."}
              </p>
            </div>

            {/* Mode switcher */}
            <div className="grid grid-cols-2 p-1 bg-[#081c15] border border-[#114232] rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setError("");
                  setSuccess("");
                }}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  authMode === "register"
                    ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                    : "text-[#a3b8b0] hover:text-[#f5efdf]"
                }`}
              >
                <UserPlus size={14} /> Register
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setError("");
                  setSuccess("");
                }}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  authMode === "login"
                    ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                    : "text-[#a3b8b0] hover:text-[#f5efdf]"
                }`}
              >
                <LogIn size={14} /> Sign In
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1">
                  {authMode === "register" ? "Desired Username / Handle *" : "Username *"}
                </label>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder={authMode === "register" ? "e.g. Accra_Draughts_Club" : "Enter username"}
                  className="w-full px-3.5 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1">
                  Password / Passcode *
                </label>
                <input
                  type="password"
                  required
                  value={authPasscode}
                  onChange={(e) => setAuthPasscode(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3.5 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              {authMode === "register" && (
                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1">
                    Mobile / MoMo Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    placeholder="e.g. 0244123456"
                    className="w-full px-3.5 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {authMode === "register" ? <UserPlus size={16} /> : <LogIn size={16} />}
                {busy
                  ? "Processing..."
                  : authMode === "register"
                  ? "Create Account & Apply"
                  : "Sign In to Apply"}
              </button>

              <div className="text-center pt-1">
                {authMode === "login" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setError("");
                      setSuccess("");
                    }}
                    className="text-xs text-[#d6a735] hover:underline"
                  >
                    Don&apos;t have an account? Register new account →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setError("");
                      setSuccess("");
                    }}
                    className="text-xs text-[#d6a735] hover:underline"
                  >
                    Already registered? Sign in here →
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <OrganizerApplicationForm
            token={token}
            userRole={role}
            onSuccessNavigate={() => {
              window.location.href = "/organizer";
            }}
          />
        )}
      </div>
    </main>
  );
}

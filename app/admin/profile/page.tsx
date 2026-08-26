"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "@/components/NavLink";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  UserCog,
  Key,
  Mail,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Save,
  Lock,
  Calendar,
  Activity,
  Award,
  Layers,
  MapPin,
} from "lucide-react";
import { getSessionToken, getAuthHeaders, saveSessionToken } from "@/lib/client-auth";
import type { AdminLog, Role } from "@/lib/types";

interface AdminProfileData {
  token: string;
  username: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: Role;
  roleTitle?: string;
  isSuperAdmin?: boolean;
  permissionKeys?: string[];
  points: number;
  marbles: number;
  status: string;
  region?: string;
  createdAt?: string;
  phoneVerifiedAt?: string | null;
}

export default function AdminProfilePage() {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [recentLogs, setRecentLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Profile Form State
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Password / Passcode Form State
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");

  const loadAdminProfile = useCallback(async (authToken: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "get_admin_profile",
          token: authToken,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to load admin profile");
      }
      setProfile(data.profile);
      setUsername(data.profile.username || "");
      setFullName(data.profile.fullName || "");
      setEmail(data.profile.email || "");
      setPhoneNumber(data.profile.phoneNumber || "");
      setRecentLogs(data.recentLogs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching admin profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sessionToken = getSessionToken() || localStorage.getItem("damii-player-token") || "";
    if (!sessionToken) {
      setError("No active admin session found. Please log in through the Admin Dashboard.");
      setLoading(false);
      return;
    }
    setToken(sessionToken);
    loadAdminProfile(sessionToken);
  }, [loadAdminProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updates: {
        username?: string;
        fullName?: string;
        email?: string;
        phoneNumber?: string;
      } = {
        username: username.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
      };

      const res = await fetch("/api/admin", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "update_admin_profile",
          token,
          updates,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update admin profile");
      }

      setSuccess("Admin profile details updated successfully!");
      setProfile((prev) => (prev ? { ...prev, ...data.profile } : data.profile));
      if (data.profile?.username) {
        localStorage.setItem("damii-player-name", data.profile.username);
        window.dispatchEvent(new Event("damii-auth-changed"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!currentPasscode.trim()) {
      setError("Please provide your current admin passcode / password.");
      return;
    }

    if (!newPasscode.trim() || newPasscode.trim().length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setError("New passcode and confirmation do not match.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "update_admin_profile",
          token,
          updates: {
            currentPasscode: currentPasscode.trim(),
            newPasscode: newPasscode.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update password");
      }

      setSuccess("Admin security password updated successfully!");
      setCurrentPasscode("");
      setNewPasscode("");
      setConfirmPasscode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#081c15] text-[#f5efdf] flex flex-col selection:bg-[#d6a735]/30">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#06261f]/95 backdrop-blur-md border-b border-[#114232] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#1a5e48] bg-[#081c15] hover:bg-[#0c3b2e] text-xs font-bold text-[#f5efdf] transition-all hover:scale-[1.02]"
            id="admin-profile-back-btn"
          >
            <ArrowLeft size={14} className="text-[#d6a735]" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-[#114232] hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d6a735] text-xs font-black text-[#06261f] shadow-sm">
              D
            </span>
            <span className="text-sm font-extrabold tracking-wide hidden sm:inline">
              DAMII Admin Profile
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => token && loadAdminProfile(token)}
            disabled={loading}
            className="p-1.5 sm:px-3 sm:py-1.5 text-xs bg-[#081c15] hover:bg-[#0c3b2e] text-[#f5efdf] rounded-xl border border-[#1a5e48] font-bold flex items-center gap-1.5 transition-all"
            id="admin-profile-refresh-btn"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#d6a735]" : "text-[#d6a735]"} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Breadcrumb / Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#114232] pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#f5efdf] font-serif flex items-center gap-2.5">
              <UserCog className="text-[#d6a735]" size={24} />
              <span>Admin Profile &amp; Security</span>
            </h1>
            <p className="text-xs text-[#a3b8b0] mt-1">
              Manage your administrator credentials, contact information, and platform access settings.
            </p>
          </div>

          {profile && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-3 py-1 rounded-full bg-[#d6a735]/15 border border-[#d6a735]/40 text-[#d6a735] text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} />
                {profile.roleTitle || (profile.isSuperAdmin || profile.role === "super_admin" ? "Super Admin" : "Administrator")}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-semibold capitalize">
                {profile.status}
              </span>
            </div>
          )}
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3.5 bg-red-950/80 border border-red-800 text-red-200 text-xs sm:text-sm rounded-xl flex items-center gap-2.5 shadow-md animate-in fade-in">
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs sm:text-sm rounded-xl flex items-center gap-2.5 shadow-md animate-in fade-in">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="animate-spin text-[#d6a735]" size={28} />
            <p className="text-sm font-semibold">Loading admin profile details...</p>
          </div>
        ) : !profile ? (
          <div className="p-8 text-center bg-[#06261f] border border-[#114232] rounded-2xl space-y-4">
            <ShieldCheck size={40} className="mx-auto text-slate-500" />
            <h3 className="text-base font-bold text-slate-200">No Admin Profile Loaded</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Please ensure you are authenticated with an active admin account before accessing this page.
            </p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#d6a735] hover:bg-[#c4952b] text-[#06261f] font-black rounded-xl text-xs transition-colors"
            >
              <ArrowLeft size={14} /> Go to Admin Login
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Admin Overview Badge Card */}
            <div className="space-y-6">
              <div className="bg-[#06261f] border border-[#114232] rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-[#114232]">
                  <div className="w-16 h-16 rounded-2xl bg-[#d6a735]/20 border border-[#d6a735]/40 flex items-center justify-center text-[#d6a735] font-black text-2xl shadow-inner">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#f5efdf]">{profile.username}</h2>
                    <p className="text-xs text-[#a3b8b0]">{profile.fullName || "Administrator"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#d6a735] font-semibold bg-[#081c15] px-3 py-1 rounded-lg border border-[#114232]">
                    <Award size={13} />
                    <span>{profile.role.toUpperCase().replace("_", " ")}</span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-[#114232]/50">
                    <span className="text-[#a3b8b0] flex items-center gap-1.5">
                      <Mail size={13} className="text-[#d6a735]" /> Email
                    </span>
                    <span className="font-semibold text-[#f5efdf] truncate max-w-[150px]">
                      {profile.email || "Not configured"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#114232]/50">
                    <span className="text-[#a3b8b0] flex items-center gap-1.5">
                      <Phone size={13} className="text-[#d6a735]" /> Phone
                    </span>
                    <span className="font-semibold text-[#f5efdf]">
                      {profile.phoneNumber || "Not configured"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#114232]/50">
                    <span className="text-[#a3b8b0] flex items-center gap-1.5">
                      <MapPin size={13} className="text-[#d6a735]" /> Region
                    </span>
                    <span className="font-semibold text-[#f5efdf]">
                      {profile.region || "Greater Accra"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#a3b8b0] flex items-center gap-1.5">
                      <Calendar size={13} className="text-[#d6a735]" /> Created
                    </span>
                    <span className="font-semibold text-[#f5efdf]">
                      {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Active"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Admin Privileges Box */}
              <div className="bg-[#06261f] border border-[#114232] rounded-2xl p-5 shadow-lg space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#d6a735] flex items-center gap-1.5">
                  <Layers size={14} /> Assigned Privileges
                </h3>
                <ul className="text-xs space-y-1.5 text-slate-300">
                  <li className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 size={13} /> Full Tournament Oversight
                  </li>
                  <li className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 size={13} /> Financial Ledger Management
                  </li>
                  <li className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 size={13} /> Organizer Applications Review
                  </li>
                  <li className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 size={13} /> Dispute Resolution &amp; Overrides
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Columns: Edit Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Information Form */}
              <div className="bg-[#06261f] border border-[#114232] rounded-2xl p-5 sm:p-6 shadow-lg space-y-5">
                <div className="flex items-center justify-between border-b border-[#114232] pb-3">
                  <h2 className="text-base font-extrabold text-[#f5efdf] flex items-center gap-2">
                    <User className="text-[#d6a735]" size={18} />
                    <span>Personal &amp; Contact Details</span>
                  </h2>
                  <span className="text-[11px] text-[#a3b8b0]">Editable</span>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4" id="admin-details-form">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#a3b8b0] flex items-center gap-1">
                        <User size={13} className="text-[#d6a735]" /> Admin Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full bg-[#081c15] border border-[#1a5e48] rounded-xl px-3.5 py-2 text-sm text-[#f5efdf] focus:outline-none focus:border-[#d6a735] transition-colors"
                        placeholder="Admin username"
                        id="admin-username-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#a3b8b0] flex items-center gap-1">
                        <UserCog size={13} className="text-[#d6a735]" /> Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#081c15] border border-[#1a5e48] rounded-xl px-3.5 py-2 text-sm text-[#f5efdf] focus:outline-none focus:border-[#d6a735] transition-colors"
                        placeholder="e.g. Kwame Mensah"
                        id="admin-fullname-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#a3b8b0] flex items-center gap-1">
                        <Mail size={13} className="text-[#d6a735]" /> Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#081c15] border border-[#1a5e48] rounded-xl px-3.5 py-2 text-sm text-[#f5efdf] focus:outline-none focus:border-[#d6a735] transition-colors"
                        placeholder="admin@damii.app"
                        id="admin-email-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#a3b8b0] flex items-center gap-1">
                        <Phone size={13} className="text-[#d6a735]" /> Mobile Number (Ghana)
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-[#081c15] border border-[#1a5e48] rounded-xl px-3.5 py-2 text-sm text-[#f5efdf] focus:outline-none focus:border-[#d6a735] transition-colors"
                        placeholder="024XXXXXXX"
                        id="admin-phone-input"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 bg-[#d6a735] hover:bg-[#c4952b] text-[#06261f] font-black rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                      id="admin-save-details-btn"
                    >
                      <Save size={15} />
                      <span>{saving ? "Saving..." : "Save Profile Details"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Password / Passcode Update Form */}
              <div className="bg-[#06261f] border border-[#114232] rounded-2xl p-5 sm:p-6 shadow-lg space-y-5">
                <div className="flex items-center justify-between border-b border-[#114232] pb-3">
                  <h2 className="text-base font-extrabold text-[#f5efdf] flex items-center gap-2">
                    <Key className="text-[#d6a735]" size={18} />
                    <span>Change Admin Passcode / Password</span>
                  </h2>
                  <span className="text-[11px] text-amber-300 font-semibold">Security Credential</span>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4" id="admin-password-form">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#a3b8b0] flex items-center gap-1">
                      <Lock size={13} className="text-[#d6a735]" /> Current Admin Passcode / Password
                    </label>
                    <input
                      type="password"
                      value={currentPasscode}
                      onChange={(e) => setCurrentPasscode(e.target.value)}
                      required
                      className="w-full bg-[#081c15] border border-[#1a5e48] rounded-xl px-3.5 py-2 text-sm text-[#f5efdf] focus:outline-none focus:border-[#d6a735] transition-colors"
                      placeholder="Enter current password"
                      id="admin-current-password-input"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#a3b8b0] flex items-center gap-1">
                        <Key size={13} className="text-[#d6a735]" /> New Passcode / Password
                      </label>
                      <input
                        type="password"
                        value={newPasscode}
                        onChange={(e) => setNewPasscode(e.target.value)}
                        required
                        minLength={6}
                        className="w-full bg-[#081c15] border border-[#1a5e48] rounded-xl px-3.5 py-2 text-sm text-[#f5efdf] focus:outline-none focus:border-[#d6a735] transition-colors"
                        placeholder="Min 6 characters"
                        id="admin-new-password-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#a3b8b0] flex items-center gap-1">
                        <Key size={13} className="text-[#d6a735]" /> Confirm New Passcode
                      </label>
                      <input
                        type="password"
                        value={confirmPasscode}
                        onChange={(e) => setConfirmPasscode(e.target.value)}
                        required
                        minLength={6}
                        className="w-full bg-[#081c15] border border-[#1a5e48] rounded-xl px-3.5 py-2 text-sm text-[#f5efdf] focus:outline-none focus:border-[#d6a735] transition-colors"
                        placeholder="Re-enter new password"
                        id="admin-confirm-password-input"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-[#06261f] font-black rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                      id="admin-save-password-btn"
                    >
                      <Lock size={15} />
                      <span>{saving ? "Updating..." : "Update Security Password"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Recent Security & Activity Audit */}
              {recentLogs.length > 0 && (
                <div className="bg-[#06261f] border border-[#114232] rounded-2xl p-5 shadow-lg space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#d6a735] flex items-center gap-1.5">
                    <Activity size={14} /> Recent Admin Actions &amp; Security Logs
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#114232] text-[#a3b8b0]">
                          <th className="py-2 px-3">Action</th>
                          <th className="py-2 px-3">Target</th>
                          <th className="py-2 px-3 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#114232]/50 text-slate-300">
                        {recentLogs.slice(0, 8).map((log) => (
                          <tr key={log.id} className="hover:bg-[#081c15]/60 transition-colors">
                            <td className="py-2 px-3 font-semibold text-[#f5efdf]">
                              {log.action}
                            </td>
                            <td className="py-2 px-3 text-slate-400">
                              {log.targetUser || log.target || (log.details as any)?.targetUser || "System"}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-400 font-mono text-[11px]">
                              {new Date(log.createdAt || log.timestamp || Date.now()).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

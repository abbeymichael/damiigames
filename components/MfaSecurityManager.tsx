"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  Fingerprint,
  KeyRound,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Download,
  Trash2,
  Lock,
  Plus,
  QrCode,
  Zap,
  Info,
  X,
  Radio,
} from "lucide-react";
import { UserMfaSettings, UserPasskey } from "@/lib/types";
import {
  isPlatformBiometricsAvailable,
  registerPasskeyCredential,
  authenticateWithPasskey,
} from "@/lib/webauthn-client";
import { generateQrSvg } from "@/lib/qr-generator";

interface MfaSecurityManagerProps {
  userToken: string;
  username: string;
  getAuthHeaders: () => Record<string, string>;
  onMfaUpdated?: (settings: UserMfaSettings) => void;
}

export default function MfaSecurityManager({
  userToken,
  username,
  getAuthHeaders,
  onMfaUpdated,
}: MfaSecurityManagerProps) {
  const [settings, setSettings] = useState<UserMfaSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Hardware Biometrics Detection
  const [hasPlatformBiometrics, setHasPlatformBiometrics] = useState(false);
  const [testBiometricSuccess, setTestBiometricSuccess] = useState(false);
  const [testPasskeySuccess, setTestPasskeySuccess] = useState(false);

  // Passkey Modal State
  const [showAddPasskeyModal, setShowAddPasskeyModal] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState("");

  // TOTP Setup Modal State
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<{
    secret: string;
    formattedSecret: string;
    uri: string;
  } | null>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState("");
  const [totpTestCode, setTotpTestCode] = useState("");
  const [totpTestResult, setTotpTestResult] = useState<string | null>(null);

  // Backup Codes Modal State
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [displayedBackupCodes, setDisplayedBackupCodes] = useState<string[]>([]);
  const [hasCopiedAll, setHasCopiedAll] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Load MFA Settings & Detect Platform Hardware
  const fetchMfaSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/mfa", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.mfaSettings) {
        setSettings(data.mfaSettings);
        if (onMfaUpdated) onMfaUpdated(data.mfaSettings);
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to load MFA security settings." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMfaSettings();
    isPlatformBiometricsAvailable().then((supported) => {
      setHasPlatformBiometrics(supported);
    });
  }, [userToken]);

  // 1. Phone Biometrics Registration (Touch ID / Face ID / Android Biometrics)
  const handleEnrollBiometrics = async () => {
    setActionLoading("biometrics_enroll");
    setStatusMessage(null);
    setTestBiometricSuccess(false);

    try {
      const regResult = await registerPasskeyCredential({
        name: `Phone Biometric (${username})`,
        type: "biometric",
        userToken,
        username,
      });

      if (!regResult.success || !regResult.credentialId) {
        setStatusMessage({ type: "error", text: regResult.error || "Biometric sensor prompt was cancelled." });
        setActionLoading(null);
        return;
      }

      // Save credential to server
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "register_passkey",
          credentialId: regResult.credentialId,
          name: "Phone Biometric (Face ID / Fingerprint)",
          type: "biometric",
          publicKey: regResult.publicKey,
          deviceType: regResult.deviceType,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setStatusMessage({ type: "error", text: data.error || "Failed to register biometric credential on server." });
      } else {
        setSettings(data.mfaSettings);
        if (onMfaUpdated) onMfaUpdated(data.mfaSettings);
        setStatusMessage({
          type: "success",
          text: "Phone Biometrics enrolled! You can now verify with your fingerprint or Face ID instead of SMS.",
        });
        if (data.backupCodes && data.backupCodes.length > 0) {
          setDisplayedBackupCodes(data.backupCodes);
          setShowBackupModal(true);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ type: "error", text: msg || "Biometric enrollment error." });
    } finally {
      setActionLoading(null);
    }
  };

  // 1b. Test Phone Biometrics
  const handleTestBiometrics = async () => {
    setActionLoading("biometrics_test");
    setStatusMessage(null);
    setTestBiometricSuccess(false);

    try {
      const biometricCreds = (settings?.passkeys || []).filter((p) => p.type === "biometric");
      const ids = biometricCreds.map((b) => b.id);
      const authResult = await authenticateWithPasskey(ids);

      if (authResult.success) {
        setTestBiometricSuccess(true);
        setStatusMessage({
          type: "success",
          text: "Biometric sensor authenticated successfully! 1-tap verification confirmed.",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: authResult.error || "Biometric test failed or was cancelled.",
        });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Biometric verification encountered an issue." });
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Register Generic Passkey (FIDO2 / Hardware Key / Cloud Keychain)
  const handleEnrollPasskey = async () => {
    if (!newPasskeyName.trim()) {
      setStatusMessage({ type: "error", text: "Please enter a friendly name for this passkey." });
      return;
    }

    setActionLoading("passkey_enroll");
    setStatusMessage(null);

    try {
      const regResult = await registerPasskeyCredential({
        name: newPasskeyName.trim(),
        type: "passkey",
        userToken,
        username,
      });

      if (!regResult.success || !regResult.credentialId) {
        setStatusMessage({ type: "error", text: regResult.error || "Passkey registration prompt was cancelled." });
        setActionLoading(null);
        return;
      }

      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "register_passkey",
          credentialId: regResult.credentialId,
          name: newPasskeyName.trim(),
          type: "passkey",
          publicKey: regResult.publicKey,
          deviceType: regResult.deviceType,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setStatusMessage({ type: "error", text: data.error || "Failed to register passkey." });
      } else {
        setSettings(data.mfaSettings);
        if (onMfaUpdated) onMfaUpdated(data.mfaSettings);
        setShowAddPasskeyModal(false);
        setNewPasskeyName("");
        setStatusMessage({
          type: "success",
          text: `Passkey "${newPasskeyName.trim()}" registered successfully!`,
        });
        if (data.backupCodes && data.backupCodes.length > 0) {
          setDisplayedBackupCodes(data.backupCodes);
          setShowBackupModal(true);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ type: "error", text: msg || "Passkey error." });
    } finally {
      setActionLoading(null);
    }
  };

  // 2b. Test Passkey
  const handleTestPasskey = async () => {
    setActionLoading("passkey_test");
    setStatusMessage(null);
    setTestPasskeySuccess(false);

    try {
      const passkeyCreds = (settings?.passkeys || []).filter((p) => p.type === "passkey");
      const ids = passkeyCreds.map((p) => p.id);
      const authResult = await authenticateWithPasskey(ids);

      if (authResult.success) {
        setTestPasskeySuccess(true);
        setStatusMessage({
          type: "success",
          text: "Passkey verified successfully! Secure instant authentication confirmed.",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: authResult.error || "Passkey test failed or was cancelled.",
        });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Passkey verification encountered an issue." });
    } finally {
      setActionLoading(null);
    }
  };

  // 2c. Remove Passkey or Biometric
  const handleRemovePasskey = async (credentialId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}"?`)) return;

    setActionLoading(`remove_${credentialId}`);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "remove_passkey",
          credentialId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setStatusMessage({ type: "error", text: data.error || "Failed to remove credential." });
      } else {
        setSettings(data.mfaSettings);
        if (onMfaUpdated) onMfaUpdated(data.mfaSettings);
        setStatusMessage({ type: "success", text: `"${name}" has been removed.` });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to remove credential." });
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Start TOTP Authenticator App Setup
  const handleStartTotpSetup = async () => {
    setActionLoading("totp_start");
    setStatusMessage(null);
    setTotpVerifyCode("");

    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "totp_setup" }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setStatusMessage({ type: "error", text: data.error || "Failed to initialize authenticator setup." });
      } else {
        setTotpSetupData({
          secret: data.secret,
          formattedSecret: data.formattedSecret,
          uri: data.uri,
        });
        setShowTotpModal(true);
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network error during setup." });
    } finally {
      setActionLoading(null);
    }
  };

  // 3b. Verify & Activate TOTP
  const handleVerifyAndEnableTotp = async () => {
    if (!totpSetupData?.secret || !totpVerifyCode.trim()) {
      setStatusMessage({ type: "error", text: "Please enter the 6-digit code shown in your Authenticator app." });
      return;
    }

    setActionLoading("totp_verify");
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "totp_verify_and_enable",
          secret: totpSetupData.secret,
          code: totpVerifyCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setStatusMessage({ type: "error", text: data.error || "Verification code is invalid." });
      } else {
        setSettings(data.mfaSettings);
        if (onMfaUpdated) onMfaUpdated(data.mfaSettings);
        setShowTotpModal(false);
        setTotpVerifyCode("");
        setStatusMessage({
          type: "success",
          text: "Authenticator App activated! You can now generate instant 6-digit codes without waiting for SMS.",
        });
        if (data.backupCodes && data.backupCodes.length > 0) {
          setDisplayedBackupCodes(data.backupCodes);
          setShowBackupModal(true);
        }
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to verify authenticator code." });
    } finally {
      setActionLoading(null);
    }
  };

  // 3c. Test Active TOTP Code
  const handleTestTotpCode = async () => {
    if (!totpTestCode.trim()) return;

    setActionLoading("totp_test");
    setTotpTestResult(null);

    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "totp_test",
          code: totpTestCode.trim(),
        }),
      });

      const data = await res.json();
      if (data.valid) {
        setTotpTestResult("valid");
        setStatusMessage({ type: "success", text: "Authenticator code verified successfully!" });
      } else {
        setTotpTestResult("invalid");
        setStatusMessage({ type: "error", text: "Invalid code. Please ensure your device clock is synchronized." });
      }
    } catch {
      setTotpTestResult("invalid");
    } finally {
      setActionLoading(null);
    }
  };

  // 3d. Disable TOTP
  const handleDisableTotp = async () => {
    if (!confirm("Are you sure you want to disable your Authenticator App?")) return;

    setActionLoading("totp_disable");
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "totp_disable" }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setStatusMessage({ type: "error", text: data.error || "Failed to disable authenticator app." });
      } else {
        setSettings(data.mfaSettings);
        if (onMfaUpdated) onMfaUpdated(data.mfaSettings);
        setStatusMessage({ type: "info", text: "Authenticator App disabled." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Error disabling authenticator." });
    } finally {
      setActionLoading(null);
    }
  };

  // 4. Generate / View Backup Codes
  const handleGenerateBackupCodes = async () => {
    setActionLoading("backup_generate");
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "generate_backup_codes" }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setStatusMessage({ type: "error", text: data.error || "Failed to generate emergency backup codes." });
      } else {
        setDisplayedBackupCodes(data.backupCodes || []);
        setShowBackupModal(true);
        setStatusMessage({ type: "success", text: "New emergency backup codes generated." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to generate backup codes." });
    } finally {
      setActionLoading(null);
    }
  };

  // 5. Change Preferred Method
  const handleSetPreferredMethod = async (method: "biometric" | "passkey" | "authenticator" | "sms") => {
    setActionLoading("set_preferred");
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "set_preferred_method",
          preferredMethod: method,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setStatusMessage({ type: "error", text: data.error || "Failed to update preferred method." });
      } else {
        setSettings(data.mfaSettings);
        if (onMfaUpdated) onMfaUpdated(data.mfaSettings);
        setStatusMessage({ type: "success", text: `Preferred method set to ${method}.` });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to update default method." });
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const downloadBackupCodes = () => {
    const text = `DAMII GHANA - EMERGENCY BACKUP CODES\nGenerated: ${new Date().toLocaleString()}\nAccount: ${username}\n\nKeep these single-use recovery codes in a secure offline location.\nEach code can only be used once.\n\n${displayedBackupCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `damii-backup-codes-${username}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const registeredBiometrics = (settings?.passkeys || []).filter((p) => p.type === "biometric");
  const registeredPasskeys = (settings?.passkeys || []).filter((p) => p.type === "passkey");
  const isMfaActive = Boolean(settings?.enabled && (settings.totpEnabled || settings.passkeysCount > 0 || settings.biometricsCount > 0));

  return (
    <div className="space-y-4">
      {/* MFA Master Overview Card */}
      <div className="p-4 bg-gradient-to-br from-[#0c3b2e] to-[#082a20] border border-[#184d3c] rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#d6a735]/20 text-[#d6a735] rounded-xl border border-[#d6a735]/30">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-[#f5efdf] uppercase tracking-wider">
                Multi-Factor Authentication (MFA / 2FA)
              </h4>
              <p className="text-[11px] text-slate-400">
                Modern hardware &amp; app protection — eliminate SMS delays &amp; telco outages in Ghana
              </p>
            </div>
          </div>

          <div>
            {isLoading ? (
              <span className="px-2.5 py-1 bg-slate-800/60 text-slate-300 text-[10px] font-bold rounded-full border border-slate-700 flex items-center gap-1">
                <RefreshCw size={10} className="animate-spin" /> Checking Status
              </span>
            ) : isMfaActive ? (
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black rounded-full flex items-center gap-1.5 shadow-sm">
                <ShieldCheck size={12} className="text-emerald-400" /> MFA Protection Active
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black rounded-full flex items-center gap-1.5">
                <AlertCircle size={12} className="text-amber-400" /> MFA Not Configured
              </span>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed bg-[#06261f]/80 p-3 rounded-xl border border-[#184d3c]/60">
          <Info size={14} className="inline mr-1.5 text-[#d6a735] align-sub" />
          Protect your DAMII wallet and account without relying on SMS delivery delays or network congestion. Set up instant phone biometrics, passkeys, or an authenticator app for 1-tap verification.
        </p>

        {/* Preferred Method Selector if MFA is active */}
        {isMfaActive && (
          <div className="pt-2 border-t border-[#184d3c]/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <label className="text-xs font-bold text-[#d6a735] flex items-center gap-1.5">
              <Zap size={13} /> Default Login &amp; Security Challenge:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "biometric", label: "📱 Biometrics", disabled: registeredBiometrics.length === 0 },
                { id: "passkey", label: "🔑 Passkey", disabled: registeredPasskeys.length === 0 },
                { id: "authenticator", label: "📲 Authenticator App", disabled: !settings?.totpEnabled },
                { id: "sms", label: "💬 SMS OTP (Fallback)", disabled: false },
              ].map((method) => {
                const isSelected = settings?.preferredMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    disabled={method.disabled || actionLoading === "set_preferred"}
                    onClick={() => handleSetPreferredMethod(method.id as any)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#d6a735] text-[#06261f] border-[#d6a735] shadow-sm font-black"
                        : method.disabled
                        ? "bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-[#06261f] border-[#184d3c] text-slate-300 hover:text-white hover:border-[#d6a735]/60"
                    }`}
                  >
                    {method.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Global Status Message Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in duration-200 ${
            statusMessage.type === "success"
              ? "bg-emerald-950/80 border-emerald-800 text-emerald-200"
              : statusMessage.type === "error"
              ? "bg-red-950/80 border-red-800 text-red-200"
              : "bg-blue-950/80 border-blue-800 text-blue-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          ) : statusMessage.type === "error" ? (
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          ) : (
            <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
          )}
          <span className="flex-1 leading-relaxed">{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white cursor-pointer ml-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* METHOD 1: PHONE BIOMETRICS (FINGERPRINT / FACE ID) */}
      <div className="p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Fingerprint size={16} />
            </span>
            <div>
              <h5 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider flex items-center gap-1.5">
                Phone &amp; Device Biometrics
                {hasPlatformBiometrics ? (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800 font-mono">
                    Hardware Detected
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 font-mono">
                    WebAuthn Ready
                  </span>
                )}
              </h5>
              <p className="text-[11px] text-slate-400">
                Verify instantly using Face ID, Touch ID, or Android Fingerprint sensor.
              </p>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
              registeredBiometrics.length > 0
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {registeredBiometrics.length > 0 ? `${registeredBiometrics.length} Enrolled` : "Not Enrolled"}
          </span>
        </div>

        {/* Registered Biometrics List */}
        {registeredBiometrics.length > 0 && (
          <div className="space-y-2 pt-1">
            {registeredBiometrics.map((bio) => (
              <div
                key={bio.id}
                className="p-2.5 bg-[#06261f] border border-[#184d3c] rounded-xl flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Fingerprint size={14} className="text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-[#f5efdf] truncate block">{bio.name}</span>
                    <span className="text-[10px] text-slate-400 block">
                      Enrolled: {new Date(bio.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={actionLoading === `remove_${bio.id}`}
                    onClick={() => handleRemovePasskey(bio.id, bio.name)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/60 rounded-lg transition-colors cursor-pointer"
                    title="Remove Biometric"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Biometrics Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            disabled={actionLoading === "biometrics_enroll"}
            onClick={handleEnrollBiometrics}
            className="py-2 px-3.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {actionLoading === "biometrics_enroll" ? (
              <>
                <RefreshCw size={13} className="animate-spin" /> Scanning Sensor...
              </>
            ) : (
              <>
                <Plus size={13} className="text-emerald-400" />
                {registeredBiometrics.length > 0 ? "Enroll Additional Biometric" : "Enroll Phone Biometric"}
              </>
            )}
          </button>

          {registeredBiometrics.length > 0 && (
            <button
              type="button"
              disabled={actionLoading === "biometrics_test"}
              onClick={handleTestBiometrics}
              className={`py-2 px-3.5 border text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                testBiometricSuccess
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                  : "bg-[#06261f] hover:bg-[#114232] border-[#184d3c] text-[#f5efdf]"
              }`}
            >
              {actionLoading === "biometrics_test" ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> Testing Biometric...
                </>
              ) : testBiometricSuccess ? (
                <>
                  <Check size={13} className="text-emerald-400" /> Sensor Verified!
                </>
              ) : (
                <>
                  <Fingerprint size={13} className="text-[#d6a735]" /> Test Biometric Sensor
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* METHOD 2: PASSKEYS (FIDO2 / WEBAUTHN / HARDWARE KEY) */}
      <div className="p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/20 text-[#d6a735] rounded-xl border border-[#d6a735]/30">
              <KeyRound size={16} />
            </span>
            <div>
              <h5 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider">
                Passkeys (FIDO2 / Hardware Security Keys)
              </h5>
              <p className="text-[11px] text-slate-400">
                iCloud Keychain, Windows Hello, Google Password Manager, or YubiKey.
              </p>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
              registeredPasskeys.length > 0
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {registeredPasskeys.length > 0 ? `${registeredPasskeys.length} Active` : "None"}
          </span>
        </div>

        {/* Registered Passkeys List */}
        {registeredPasskeys.length > 0 && (
          <div className="space-y-2 pt-1">
            {registeredPasskeys.map((pk) => (
              <div
                key={pk.id}
                className="p-2.5 bg-[#06261f] border border-[#184d3c] rounded-xl flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <KeyRound size={14} className="text-[#d6a735] shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-[#f5efdf] truncate block">{pk.name}</span>
                    <span className="text-[10px] text-slate-400 block">
                      Added: {new Date(pk.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={actionLoading === `remove_${pk.id}`}
                    onClick={() => handleRemovePasskey(pk.id, pk.name)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/60 rounded-lg transition-colors cursor-pointer"
                    title="Remove Passkey"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Passkey Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setNewPasskeyName(`Passkey (${navigator.userAgent.includes("Mac") ? "MacBook" : navigator.userAgent.includes("Windows") ? "Windows PC" : "Mobile"})`);
              setShowAddPasskeyModal(true);
            }}
            className="py-2 px-3.5 bg-[#06261f] hover:bg-[#114232] border border-[#184d3c] text-[#f5efdf] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={13} className="text-[#d6a735]" /> Add New Passkey
          </button>

          {registeredPasskeys.length > 0 && (
            <button
              type="button"
              disabled={actionLoading === "passkey_test"}
              onClick={handleTestPasskey}
              className={`py-2 px-3.5 border text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                testPasskeySuccess
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                  : "bg-[#06261f] hover:bg-[#114232] border-[#184d3c] text-[#f5efdf]"
              }`}
            >
              {actionLoading === "passkey_test" ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> Verifying Passkey...
                </>
              ) : testPasskeySuccess ? (
                <>
                  <Check size={13} className="text-emerald-400" /> Passkey Verified!
                </>
              ) : (
                <>
                  <KeyRound size={13} className="text-[#d6a735]" /> Test Passkey
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* METHOD 3: AUTHENTICATOR APP (RFC 6238 TOTP) */}
      <div className="p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Smartphone size={16} />
            </span>
            <div>
              <h5 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider">
                Authenticator App (TOTP)
              </h5>
              <p className="text-[11px] text-slate-400">
                Google Authenticator, Microsoft Authenticator, Authy, or 1Password.
              </p>
            </div>
          </div>

          {settings?.totpEnabled ? (
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black rounded-full flex items-center gap-1">
              <CheckCircle2 size={11} className="text-emerald-400" /> Active
            </span>
          ) : (
            <span className="px-2.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold rounded-full">
              Disabled
            </span>
          )}
        </div>

        {settings?.totpEnabled ? (
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-[#06261f] border border-[#184d3c] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-emerald-400 font-bold block flex items-center gap-1">
                  <ShieldCheck size={13} /> Authenticator Synchronized
                </span>
                <span className="text-[10px] text-slate-400">
                  Generates offline 6-digit codes every 30 seconds.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading === "totp_disable"}
                  onClick={handleDisableTotp}
                  className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {actionLoading === "totp_disable" ? "Disabling..." : "Disable"}
                </button>
              </div>
            </div>

            {/* Test Authenticator Code */}
            <div className="p-3 bg-[#06261f]/60 border border-[#184d3c]/70 rounded-xl space-y-2">
              <label className="block text-[11px] font-bold text-slate-300">
                Quick Test: Enter 6-digit code from your app to verify synchronization:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={totpTestCode}
                  onChange={(e) => setTotpTestCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 849201"
                  className="w-36 px-3 py-1.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] text-sm font-mono tracking-widest text-center focus:outline-none focus:border-[#d6a735]"
                />
                <button
                  type="button"
                  disabled={totpTestCode.length !== 6 || actionLoading === "totp_test"}
                  onClick={handleTestTotpCode}
                  className="px-3 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] text-xs font-black rounded-xl transition-all cursor-pointer"
                >
                  {actionLoading === "totp_test" ? "Testing..." : "Verify Code"}
                </button>
                {totpTestResult === "valid" && (
                  <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 size={14} /> Valid!
                  </span>
                )}
                {totpTestResult === "invalid" && (
                  <span className="text-red-400 text-xs font-bold flex items-center gap-1">
                    <AlertCircle size={14} /> Incorrect
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-1">
            <button
              type="button"
              disabled={actionLoading === "totp_start"}
              onClick={handleStartTotpSetup}
              className="py-2 px-3.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {actionLoading === "totp_start" ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> Preparing Setup...
                </>
              ) : (
                <>
                  <QrCode size={13} className="text-blue-400" /> Set Up Authenticator App
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* METHOD 4: EMERGENCY BACKUP RECOVERY CODES */}
      <div className="p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-2xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-slate-800 text-slate-300 rounded-xl border border-slate-700">
              <Lock size={16} />
            </span>
            <div>
              <h5 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider">
                Emergency Recovery Codes
              </h5>
              <p className="text-[11px] text-slate-400">
                Single-use emergency codes if you lose access to your phone or passkey.
              </p>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
              settings?.hasBackupCodes
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {settings?.hasBackupCodes ? "Generated" : "None"}
          </span>
        </div>

        <div className="pt-1">
          <button
            type="button"
            disabled={actionLoading === "backup_generate"}
            onClick={handleGenerateBackupCodes}
            className="py-2 px-3.5 bg-[#06261f] hover:bg-[#114232] border border-[#184d3c] text-[#f5efdf] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {actionLoading === "backup_generate" ? (
              <>
                <RefreshCw size={13} className="animate-spin" /> Generating...
              </>
            ) : (
              <>
                <RefreshCw size={13} className="text-[#d6a735]" />
                {settings?.hasBackupCodes ? "Regenerate Backup Codes" : "Generate Emergency Codes"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD PASSKEY */}
      {/* ========================================================================= */}
      {showAddPasskeyModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#06261f] border-2 border-[#d6a735] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 text-[#f5efdf]">
            <div className="flex items-center justify-between pb-3 border-b border-[#184d3c]">
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-[#d6a735]" />
                <h4 className="text-sm font-black text-[#d6a735] uppercase tracking-wider">
                  Register New Passkey
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPasskeyModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Name your passkey so you can identify it later (e.g. your phone, tablet, or security hardware key).
            </p>

            <div>
              <label className="block text-xs font-bold text-[#f5efdf] mb-1.5">
                Passkey Name / Device Label
              </label>
              <input
                type="text"
                value={newPasskeyName}
                onChange={(e) => setNewPasskeyName(e.target.value)}
                placeholder="e.g. MacBook Pro Touch ID, Pixel 8, YubiKey"
                className="w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddPasskeyModal(false)}
                className="px-4 py-2 bg-[#0c3b2e] hover:bg-[#144435] text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newPasskeyName.trim() || actionLoading === "passkey_enroll"}
                onClick={handleEnrollPasskey}
                className="px-5 py-2 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] text-xs font-black rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading === "passkey_enroll" ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> Prompting Device...
                  </>
                ) : (
                  <>
                    <Check size={14} /> Continue &amp; Create Passkey
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TOTP AUTHENTICATOR SETUP WIZARD */}
      {/* ========================================================================= */}
      {showTotpModal && totpSetupData && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#06261f] border-2 border-[#d6a735] rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 text-[#f5efdf] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#184d3c]">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-[#d6a735]" />
                <h4 className="text-sm font-black text-[#d6a735] uppercase tracking-wider">
                  Set Up Authenticator App
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowTotpModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step 1: Scan QR or Enter Key */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-300 block">
                1. Open Google Authenticator, Microsoft Authenticator, or Authy and scan this QR code:
              </span>

              {/* QR Code SVG Display */}
              <div className="flex justify-center p-3 bg-white rounded-2xl shadow-inner max-w-[200px] mx-auto">
                <div
                  dangerouslySetIgnoreCase="true"
                  dangerouslySetInnerHTML={{
                    __html: generateQrSvg(totpSetupData.uri, 180),
                  }}
                />
              </div>

              {/* Manual Entry Key */}
              <div className="p-3 bg-[#0c3b2e] border border-[#184d3c] rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold">
                  <span>Can't scan? Enter key manually:</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(totpSetupData.secret)}
                    className="text-[#d6a735] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSecret ? <Check size={12} /> : <Copy size={12} />}
                    {copiedSecret ? "Copied!" : "Copy Key"}
                  </button>
                </div>
                <div className="font-mono text-sm tracking-wider text-[#d6a735] bg-[#06261f] p-2 rounded-lg border border-[#184d3c] text-center select-all">
                  {totpSetupData.formattedSecret}
                </div>
              </div>
            </div>

            {/* Step 2: Verification Input */}
            <div className="space-y-2 pt-2 border-t border-[#184d3c]">
              <label className="block text-xs font-bold text-slate-200">
                2. Enter the 6-digit code shown in your Authenticator app to activate:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={totpVerifyCode}
                  onChange={(e) => setTotpVerifyCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="flex-1 px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] text-base font-mono tracking-widest text-center focus:outline-none focus:border-[#d6a735]"
                />
                <button
                  type="button"
                  disabled={totpVerifyCode.length !== 6 || actionLoading === "totp_verify"}
                  onClick={handleVerifyAndEnableTotp}
                  className="px-6 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] text-xs font-black rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {actionLoading === "totp_verify" ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} /> Verify &amp; Activate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EMERGENCY BACKUP RECOVERY CODES */}
      {/* ========================================================================= */}
      {showBackupModal && displayedBackupCodes.length > 0 && (
        <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#06261f] border-2 border-[#d6a735] rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 text-[#f5efdf]">
            <div className="flex items-center justify-between pb-3 border-b border-[#184d3c]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#d6a735]" />
                <h4 className="text-sm font-black text-[#d6a735] uppercase tracking-wider">
                  Emergency Recovery Codes
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Store these single-use recovery codes in a safe place. If you ever lose access to your phone or passkey, you can sign in with any of these codes.
            </p>

            <div className="grid grid-cols-2 gap-2 bg-[#0c3b2e] p-3 rounded-xl border border-[#184d3c]">
              {displayedBackupCodes.map((code, idx) => (
                <div
                  key={idx}
                  className="font-mono text-xs text-[#d6a735] bg-[#06261f] px-2 py-1.5 rounded-lg border border-[#184d3c]/60 text-center font-bold select-all"
                >
                  {code}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(displayedBackupCodes.join("\n"));
                  setHasCopiedAll(true);
                  setTimeout(() => setHasCopiedAll(false), 2000);
                }}
                className="py-2 px-3 bg-[#0c3b2e] hover:bg-[#144435] text-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {hasCopiedAll ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {hasCopiedAll ? "Copied!" : "Copy All"}
              </button>

              <button
                type="button"
                onClick={downloadBackupCodes}
                className="py-2 px-3 bg-[#0c3b2e] hover:bg-[#144435] text-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={13} className="text-[#d6a735]" /> Download .txt
              </button>

              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="py-2 px-4 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] text-xs font-black rounded-xl transition-all cursor-pointer"
              >
                I've Saved Them
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building,
  User,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  Save,
  Send,
  RefreshCw,
  Phone,
  Check,
  Shield,
  Smartphone,
  Lock,
  Calendar,
  Users,
  ChevronRight,
  Info,
  Sparkles,
} from "lucide-react";
import { OrganizerApplication, OrganizerApplicationStatus } from "@/lib/types";

interface OrganizerApplicationFormProps {
  token: string;
  initialApplication?: OrganizerApplication | null;
  userRole: string;
  onApplicationUpdated?: (app: OrganizerApplication) => void;
  onSuccessNavigate?: () => void;
}

export function OrganizerApplicationForm({
  token,
  initialApplication,
  userRole,
  onApplicationUpdated,
  onSuccessNavigate,
}: OrganizerApplicationFormProps) {
  const [busy, setBusy] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Application Data State
  const [application, setApplication] = useState<OrganizerApplication | null>(initialApplication || null);
  const [cooldown, setCooldown] = useState<{
    isCooldownActive: boolean;
    reapplyEligibleAt: string | null;
    remainingDays: number;
  }>({
    isCooldownActive: false,
    reapplyEligibleAt: null,
    remainingDays: 0,
  });
  const [isRevoked, setIsRevoked] = useState(false);
  const [revocationReason, setRevocationReason] = useState("");

  // Phone Verification State
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [otpRequestId, setOtpRequestId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState("");
  const [otpDebugCode, setOtpDebugCode] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  // Form Fields
  const [applicantType, setApplicantType] = useState<"individual" | "organization">("individual");
  const [organizationName, setOrganizationName] = useState("");
  const [smallBio, setSmallBio] = useState("");
  const [expectedFrequency, setExpectedFrequency] = useState<string>("monthly");
  const [expectedTournamentSize, setExpectedTournamentSize] = useState<number>(16);

  // Acknowledgements
  const [termsRulesAccepted, setTermsRulesAccepted] = useState(false);
  const [termsEscrowAccepted, setTermsEscrowAccepted] = useState(false);
  const [termsConductAccepted, setTermsConductAccepted] = useState(false);

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  const getAuthHeaders = () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const populateFormWithApp = (app: OrganizerApplication) => {
    if (app.applicantType) setApplicantType(app.applicantType);
    if (app.organizationName) setOrganizationName(app.organizationName);
    if (app.priorExperience) setSmallBio(app.priorExperience);
    if (app.expectedFrequency) setExpectedFrequency(app.expectedFrequency);
    if (app.expectedTournamentSize) setExpectedTournamentSize(app.expectedTournamentSize);
    if (app.termsAcceptedAt) {
      setTermsRulesAccepted(true);
      setTermsEscrowAccepted(true);
      setTermsConductAccepted(true);
    }
  };

  const loadApplicationStatus = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/organizer/apply", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load application status");

      if (data.application) {
        setApplication(data.application);
        populateFormWithApp(data.application);
      }

      if (data.isPhoneVerified && data.phoneNumber) {
        setIsPhoneVerified(true);
        setVerifiedPhoneNumber(data.phoneNumber);
        setPhoneInput(data.phoneNumber);
      } else if (data.phoneNumber) {
        setPhoneInput(data.phoneNumber);
      }

      if (data.cooldown) {
        setCooldown(data.cooldown);
      }
      if (data.revocation) {
        setIsRevoked(true);
        setRevocationReason(data.revocation.reason || "Organizer privileges revoked for cause.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load application state");
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    loadApplicationStatus();
  }, [loadApplicationStatus]);

  // Request OTP for Phone Verification
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    const clean = phoneInput.trim().replace(/[\s\-()]/g, "");
    if (!clean) {
      setError("Please enter a valid Ghana mobile phone number.");
      return;
    }

    if (clean.length < 9 || clean.length > 16) {
      setError("Invalid phone number format. Please enter a valid 10-digit Ghana number (e.g. 0244123456).");
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch("/api/organizer/phone-otp", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "send",
          phoneNumber: clean,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to send verification code.");
        if (data.retryAfter) {
          setOtpCooldown(Math.min(60, data.retryAfter));
        }
        return;
      }

      setOtpRequestId(data.requestId);
      setOtpExpiresAt(data.expiresAt);
      if (data.debugCode) {
        setOtpDebugCode(data.debugCode);
      }
      setOtpCooldown(60);
      setSuccess(`Verification code sent to ${clean}. Enter the 6-digit code below.`);
    } catch {
      setError("Network connection error. Failed to send verification code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    if (!otpRequestId) {
      setError("Please request a verification code first.");
      return;
    }

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch("/api/organizer/phone-otp", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "verify",
          requestId: otpRequestId,
          code: otpCode.trim(),
          phoneNumber: phoneInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Invalid verification code. Please try again.");
        return;
      }

      setIsPhoneVerified(true);
      setVerifiedPhoneNumber(data.phoneNumber || phoneInput.trim());
      setIsEditingPhone(false);
      setOtpRequestId("");
      setOtpCode("");
      setOtpDebugCode(null);
      setSuccess("Phone number verified successfully! You can now complete your application.");
    } catch {
      setError("Network connection error during OTP verification.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Save Application Draft
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/organizer/apply", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          isDraft: true,
          applicantType,
          organizationName: organizationName.trim(),
          priorExperience: smallBio.trim(),
          expectedFrequency,
          expectedTournamentSize,
          termsRulesAccepted,
          termsEscrowAccepted,
          termsConductAccepted,
          termsAccepted: termsRulesAccepted && termsEscrowAccepted && termsConductAccepted,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to save draft");

      setApplication(data.application);
      setSuccess("Application draft saved successfully.");
      if (onApplicationUpdated && data.application) {
        onApplicationUpdated(data.application);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  };

  // Submit Final Application
  const handleSubmitFinal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    if (!isPhoneVerified) {
      setError("Phone number verification is required. Please verify your mobile number first.");
      return;
    }

    if (!organizationName.trim()) {
      setError(
        applicantType === "organization"
          ? "Company or Organization name is required."
          : "Organizer display name or brand name is required."
      );
      return;
    }

    if (!smallBio.trim()) {
      setError("Please provide a brief bio or description of your tournament hosting background / plans.");
      return;
    }

    if (!termsRulesAccepted || !termsEscrowAccepted || !termsConductAccepted) {
      setError("You must acknowledge and accept all three platform agreements before submitting.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/organizer/apply", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          isDraft: false,
          applicantType,
          organizationName: organizationName.trim(),
          priorExperience: smallBio.trim(),
          expectedFrequency,
          expectedTournamentSize,
          termsRulesAccepted,
          termsEscrowAccepted,
          termsConductAccepted,
          termsAccepted: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Submission failed");

      setApplication(data.application);
      setSuccess(
        data.message ||
          "Your organizer application has been submitted successfully! An administrator will review your application."
      );
      if (onApplicationUpdated && data.application) {
        onApplicationUpdated(data.application);
      }
      if (onSuccessNavigate) {
        setTimeout(onSuccessNavigate, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit organizer application");
    } finally {
      setBusy(false);
    }
  };

  const isApproved =
    userRole === "organizer" ||
    userRole === "facilitator" ||
    userRole === "admin" ||
    userRole === "super_admin" ||
    application?.status === "approved";

  return (
    <div className="space-y-6">
      {/* ERROR & SUCCESS BANNERS */}
      {error && (
        <div className="p-4 bg-red-950/90 border border-red-600/80 rounded-2xl text-red-200 flex items-center justify-between gap-3 shadow-xl animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-400 shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-400 hover:text-white p-1 rounded-lg">
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-500/80 rounded-2xl text-emerald-200 flex items-center justify-between gap-3 shadow-xl animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold">{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-400 hover:text-white p-1 rounded-lg">
            ✕
          </button>
        </div>
      )}

      {/* --- STATUS OVERVIEW PANEL --- */}
      {isApproved ? (
        <div className="p-6 bg-gradient-to-br from-[#0c3b2e] to-[#06261f] border border-emerald-500/60 rounded-3xl shadow-xl flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-900/60 border border-emerald-400/50 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck size={32} />
          </div>
          <div>
            <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-full text-[11px] font-black uppercase tracking-wider">
              Licensed Organizer
            </span>
            <h3 className="text-lg font-black text-[#f5efdf] mt-1">Certified Tournament Organizer</h3>
            <p className="text-xs text-[#a3b8b0] mt-0.5">
              You are authorized to create tournament brackets, manage entry fees, and moderate 10x10 Draughts leagues.
            </p>
          </div>
        </div>
      ) : application?.status === "pending" ? (
        <div className="p-6 bg-[#06261f] border border-amber-500/60 rounded-3xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-950/80 border border-amber-500/50 rounded-2xl flex items-center justify-center text-amber-400 shrink-0">
                <Clock size={24} className="animate-spin" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-500/40 rounded-full text-[11px] font-black uppercase tracking-wider">
                  Pending Admin Review
                </span>
                <h3 className="text-base font-black text-[#f5efdf] mt-0.5">Application Under Review</h3>
              </div>
            </div>
            <button
              onClick={loadApplicationStatus}
              disabled={busy}
              className="px-3.5 py-2 bg-[#081c15] hover:bg-[#0c3b2e] text-[#d6a735] border border-[#114232] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          <p className="text-xs text-[#a3b8b0] leading-relaxed">
            Your application for <strong>{application.organizationName || "Organizer License"}</strong> was submitted on{" "}
            {new Date(application.submittedAt || application.createdAt).toLocaleString()}. Platform administrators are
            reviewing your credentials.
          </p>
        </div>
      ) : application?.status === "needs_info" ? (
        <div className="p-6 bg-amber-950/80 border border-amber-500 rounded-3xl shadow-xl space-y-3">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-amber-400 shrink-0" />
            <div>
              <h3 className="text-base font-black text-[#f5efdf]">Additional Information Requested</h3>
              <p className="text-xs text-amber-200">
                Admin Note: {application.reviewNote || application.needsInfoNote || "Please update your details."}
              </p>
            </div>
          </div>
        </div>
      ) : cooldown.isCooldownActive ? (
        <div className="p-6 bg-red-950/80 border border-red-500/60 rounded-3xl shadow-xl space-y-2">
          <h3 className="text-base font-black text-red-200">Re-application Cooldown Active</h3>
          <p className="text-xs text-red-300 leading-relaxed">
            Your previous organizer application was reviewed and declined. You may submit a new application in{" "}
            <strong>{cooldown.remainingDays} day(s)</strong> (on{" "}
            {cooldown.reapplyEligibleAt ? new Date(cooldown.reapplyEligibleAt).toLocaleDateString() : "eligible date"}).
          </p>
        </div>
      ) : null}

      {/* --- APPLICATION FORM CONTAINER --- */}
      {(!isApproved && !cooldown.isCooldownActive && application?.status !== "pending") && (
        <form onSubmit={handleSubmitFinal} className="p-6 sm:p-8 bg-[#06261f] border border-[#114232] rounded-3xl shadow-2xl space-y-8">
          {/* Header */}
          <div className="border-b border-[#114232] pb-5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#d6a735] uppercase tracking-wider mb-1">
              <Sparkles size={14} /> Simplified License Application
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#f5efdf]">Organizer Registration</h2>
            <p className="text-xs sm:text-sm text-[#a3b8b0] mt-1 leading-relaxed">
              Verify your mobile number and set up your organizer profile to start hosting official 10x10 Draughts tournaments.
            </p>
          </div>

          {/* --- SECTION 1: PHONE NUMBER VERIFICATION --- */}
          <div className="space-y-4 p-5 bg-[#081c15] border border-[#114232] rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0c3b2e] border border-[#184d3c] flex items-center justify-center text-[#d6a735]">
                  <Phone size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#f5efdf]">1. Mobile Phone Verification (Required)</h3>
                  <p className="text-[11px] text-[#a3b8b0]">
                    Verified phone number ensures secure tournament escrow communications and organizer identity.
                  </p>
                </div>
              </div>

              {isPhoneVerified && !isEditingPhone && (
                <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/50 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck size={14} className="text-emerald-400" /> Phone Verified
                </span>
              )}
            </div>

            {isPhoneVerified && !isEditingPhone ? (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#06261f] border border-emerald-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Smartphone className="text-emerald-400" size={20} />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#a3b8b0]">Verified Phone Number</span>
                    <p className="text-sm font-mono font-bold text-[#f5efdf]">{verifiedPhoneNumber}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingPhone(true)}
                  className="text-xs text-[#d6a735] hover:underline font-bold"
                >
                  Change / Re-verify
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                      Ghana Mobile Number *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="e.g. 0244123456 or 0501234567"
                        disabled={isSendingOtp || isVerifyingOtp}
                        className="w-full px-4 py-3 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/40 text-sm font-mono focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRequestOtp()}
                      disabled={isSendingOtp || !phoneInput.trim() || otpCooldown > 0}
                      className="w-full py-3 px-4 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Send size={14} className={isSendingOtp ? "animate-spin" : ""} />
                      {isSendingOtp
                        ? "Sending..."
                        : otpCooldown > 0
                        ? `Resend in ${otpCooldown}s`
                        : "Send 6-Digit OTP"}
                    </button>
                  </div>
                </div>

                {/* OTP input field when requestId is generated */}
                {otpRequestId && (
                  <div className="p-4 bg-[#06261f] border border-[#d6a735]/40 rounded-xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#d6a735] flex items-center gap-1.5">
                        <Lock size={14} /> Enter 6-Digit Verification Code
                      </span>
                      {otpDebugCode && (
                        <span className="text-[11px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 font-mono">
                          Dev Demo Code: {otpDebugCode}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="sm:col-span-2 px-4 py-3 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-center tracking-widest font-mono text-lg font-black focus:outline-none focus:border-[#d6a735]"
                      />
                      <button
                        type="button"
                        onClick={() => handleVerifyOtp()}
                        disabled={isVerifyingOtp || otpCode.length !== 6}
                        className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle size={15} className={isVerifyingOtp ? "animate-spin" : ""} />
                        {isVerifyingOtp ? "Verifying..." : "Verify Code"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* --- SECTION 2: APPLICANT TYPE (INDIVIDUAL OR COMPANY) --- */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1">
                2. Organizer Classification *
              </label>
              <p className="text-xs text-[#a3b8b0]">
                Select whether you are applying as an individual draughts organizer or representing a company / gaming organization.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Individual */}
              <div
                onClick={() => setApplicantType("individual")}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  applicantType === "individual"
                    ? "bg-[#0c3b2e]/80 border-[#d6a735] shadow-lg ring-1 ring-[#d6a735]/50"
                    : "bg-[#081c15] border-[#114232] hover:border-[#184d3c]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#06261f] border border-[#114232] flex items-center justify-center text-[#d6a735]">
                    <User size={20} />
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      applicantType === "individual" ? "border-[#d6a735] bg-[#d6a735]" : "border-[#114232]"
                    }`}
                  >
                    {applicantType === "individual" && <Check size={12} className="text-[#06261f] stroke-[3]" />}
                  </div>
                </div>
                <h4 className="text-sm font-bold text-[#f5efdf]">Individual Organizer</h4>
                <p className="text-xs text-[#a3b8b0] mt-1 leading-relaxed">
                  Independent club host, community referee, or local draughts coordinator.
                </p>
              </div>

              {/* Option 2: Company / Organization */}
              <div
                onClick={() => setApplicantType("organization")}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  applicantType === "organization"
                    ? "bg-[#0c3b2e]/80 border-[#d6a735] shadow-lg ring-1 ring-[#d6a735]/50"
                    : "bg-[#081c15] border-[#114232] hover:border-[#184d3c]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#06261f] border border-[#114232] flex items-center justify-center text-[#d6a735]">
                    <Building size={20} />
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      applicantType === "organization" ? "border-[#d6a735] bg-[#d6a735]" : "border-[#114232]"
                    }`}
                  >
                    {applicantType === "organization" && <Check size={12} className="text-[#06261f] stroke-[3]" />}
                  </div>
                </div>
                <h4 className="text-sm font-bold text-[#f5efdf]">Company / Organization</h4>
                <p className="text-xs text-[#a3b8b0] mt-1 leading-relaxed">
                  Registered esports entity, draughts club, gaming center, brand, or federation.
                </p>
              </div>
            </div>
          </div>

          {/* --- SECTION 3: ORGANIZER DETAILS & SMALL BIO --- */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                3. {applicantType === "organization" ? "Company / Organization Name *" : "Organizer / Brand Name *"}
              </label>
              <input
                type="text"
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder={
                  applicantType === "organization"
                    ? "e.g. Ghana Draughts Association or Kumasi Gaming Hub"
                    : "e.g. Master Kofi Draughts Club or Accra League Organizer"
                }
                className="w-full px-4 py-3 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/40 text-sm focus:outline-none focus:border-[#d6a735]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                4. Small Bio / About Your Organization *
              </label>
              <textarea
                required
                rows={3}
                value={smallBio}
                onChange={(e) => setSmallBio(e.target.value)}
                placeholder="Tell us briefly about yourself, your club or company, your draughts community background, and your plans for organizing tournaments on DAMII..."
                className="w-full px-4 py-3 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/40 text-sm leading-relaxed focus:outline-none focus:border-[#d6a735]"
              />
              <p className="text-[11px] text-[#a3b8b0] mt-1">
                A short summary helping platform moderators understand your community and tournament goals.
              </p>
            </div>
          </div>

          {/* --- SECTION 4: TOURNAMENT PLANS & FREQUENCY --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-[#081c15] border border-[#114232] rounded-2xl">
            <div>
              <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} /> Expected Event Frequency
              </label>
              <select
                value={expectedFrequency}
                onChange={(e) => setExpectedFrequency(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs font-bold focus:outline-none focus:border-[#d6a735]"
              >
                <option value="weekly">Weekly Tournaments</option>
                <option value="bi-weekly">Bi-Weekly Tournaments</option>
                <option value="monthly">Monthly Tournaments</option>
                <option value="special-events">Quarterly / Special Events</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5 flex items-center gap-1.5">
                <Users size={14} /> Target Tournament Bracket Size
              </label>
              <select
                value={expectedTournamentSize}
                onChange={(e) => setExpectedTournamentSize(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs font-bold focus:outline-none focus:border-[#d6a735]"
              >
                <option value={8}>8 Players (Fast Bracket)</option>
                <option value={16}>16 Players (Standard Tournament)</option>
                <option value={32}>32 Players (Major Championship)</option>
                <option value={64}>64+ Players (Open Grand Slam)</option>
              </select>
            </div>
          </div>

          {/* --- SECTION 5: ACKNOWLEDGEMENTS & ESCROW TERMS --- */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#d6a735] uppercase">
              <Shield size={15} /> 5. Organizer Acknowledgements & Financial Escrow Rules
            </div>

            <div className="space-y-3">
              {/* Term 1 */}
              <label className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl flex items-start gap-3.5 cursor-pointer hover:border-[#184d3c] transition-colors">
                <input
                  type="checkbox"
                  required
                  checked={termsRulesAccepted}
                  onChange={(e) => setTermsRulesAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#d6a735] rounded"
                />
                <div className="text-xs leading-relaxed text-[#a3b8b0]">
                  <strong className="text-[#f5efdf] block font-bold mb-0.5">
                    Official 10x10 Draughts Rules & Fair Bracket Management
                  </strong>
                  I agree to uphold official 10x10 Damii rules, maintain impartial match moderation, and never tamper with player results or tournament brackets.
                </div>
              </label>

              {/* Term 2 */}
              <label className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl flex items-start gap-3.5 cursor-pointer hover:border-[#184d3c] transition-colors">
                <input
                  type="checkbox"
                  required
                  checked={termsEscrowAccepted}
                  onChange={(e) => setTermsEscrowAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#d6a735] rounded"
                />
                <div className="text-xs leading-relaxed text-[#a3b8b0]">
                  <strong className="text-[#f5efdf] block font-bold mb-0.5">
                    Platform Automated Escrow & Transparent Prize Settlement
                  </strong>
                  I acknowledge that all participant entry fees and tournament prize pools are locked safely in DAMII escrow and disbursed automatically to winners with zero manual off-platform diversions.
                </div>
              </label>

              {/* Term 3 */}
              <label className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl flex items-start gap-3.5 cursor-pointer hover:border-[#184d3c] transition-colors">
                <input
                  type="checkbox"
                  required
                  checked={termsConductAccepted}
                  onChange={(e) => setTermsConductAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#d6a735] rounded"
                />
                <div className="text-xs leading-relaxed text-[#a3b8b0]">
                  <strong className="text-[#f5efdf] block font-bold mb-0.5">
                    Organizer Code of Conduct & License Standards
                  </strong>
                  I understand that match manipulation, schedule neglect, or abusive behavior will result in immediate license revocation and tournament reassignment.
                </div>
              </label>
            </div>
          </div>

          {/* --- SUBMISSION BUTTONS --- */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-[#114232]">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || busy}
              className="px-5 py-3 bg-[#081c15] hover:bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/40 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save size={15} className={savingDraft ? "animate-spin" : ""} />
              {savingDraft ? "Saving Draft..." : "Save Draft"}
            </button>

            <button
              type="submit"
              disabled={
                busy ||
                !isPhoneVerified ||
                !organizationName.trim() ||
                !smallBio.trim() ||
                !termsRulesAccepted ||
                !termsEscrowAccepted ||
                !termsConductAccepted
              }
              className="px-8 py-3.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] rounded-xl text-sm font-black flex items-center gap-2 transition-all shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={16} className={busy ? "animate-spin" : ""} />
              {busy
                ? "Submitting Application..."
                : application?.status === "needs_info"
                ? "Resubmit Organizer Application"
                : "Submit Organizer Application"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

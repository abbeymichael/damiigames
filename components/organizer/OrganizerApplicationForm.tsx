"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building,
  User,
  ShieldCheck,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  HelpCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  RefreshCw,
  Eye,
  Info,
  Award,
  Check,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { OrganizerApplication, OrganizerApplicationStatus, Profile } from "@/lib/types";

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
  const [currentStep, setCurrentStep] = useState<number>(1);
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

  // Step 1: Type
  const [applicantType, setApplicantType] = useState<"individual" | "organization">("individual");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationRegNumber, setOrganizationRegNumber] = useState("");

  // Step 2: KYC
  const [ghanaCardFrontUrl, setGhanaCardFrontUrl] = useState("");
  const [ghanaCardBackUrl, setGhanaCardBackUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");

  // Step 3: Address & Proof
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [proofOfAddressUrl, setProofOfAddressUrl] = useState("");

  // Step 4: Intent & Experience
  const [intendedGameTypes, setIntendedGameTypes] = useState<string[]>(["damii-10x10"]);
  const [expectedTournamentSize, setExpectedTournamentSize] = useState<number>(16);
  const [expectedFrequency, setExpectedFrequency] = useState<string>("monthly");
  const [priorExperience, setPriorExperience] = useState<string>("");

  // Step 5: Terms
  const [termsRulesAccepted, setTermsRulesAccepted] = useState(false);
  const [termsEscrowAccepted, setTermsEscrowAccepted] = useState(false);
  const [termsConductAccepted, setTermsConductAccepted] = useState(false);

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  // Helper for auth headers
  const getAuthHeaders = () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const populateFormWithApp = (app: OrganizerApplication) => {
    if (app.applicantType) setApplicantType(app.applicantType);
    if (app.organizationName) setOrganizationName(app.organizationName);
    if (app.organizationRegNumber) setOrganizationRegNumber(app.organizationRegNumber);
    if (app.ghanaCardFrontUrl) setGhanaCardFrontUrl(app.ghanaCardFrontUrl);
    if (app.ghanaCardBackUrl) setGhanaCardBackUrl(app.ghanaCardBackUrl);
    if (app.selfieUrl) setSelfieUrl(app.selfieUrl);
    if (app.physicalAddress) setPhysicalAddress(app.physicalAddress);
    if (app.proofOfAddressUrl) setProofOfAddressUrl(app.proofOfAddressUrl);
    
    if (app.intendedGameTypes) {
      try {
        const parsed = JSON.parse(app.intendedGameTypes);
        if (Array.isArray(parsed)) setIntendedGameTypes(parsed);
        else setIntendedGameTypes([app.intendedGameTypes]);
      } catch {
        setIntendedGameTypes([app.intendedGameTypes]);
      }
    }
    
    if (app.expectedTournamentSize) setExpectedTournamentSize(app.expectedTournamentSize);
    if (app.expectedFrequency) setExpectedFrequency(app.expectedFrequency);
    if (app.priorExperience) setPriorExperience(app.priorExperience);
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

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        isDraft: true,
        applicantType,
        organizationName: organizationName.trim() || undefined,
        organizationRegNumber: organizationRegNumber.trim() || undefined,
        ghanaCardFrontUrl: ghanaCardFrontUrl.trim() || undefined,
        ghanaCardBackUrl: ghanaCardBackUrl.trim() || undefined,
        selfieUrl: selfieUrl.trim() || undefined,
        physicalAddress: physicalAddress.trim() || undefined,
        proofOfAddressUrl: proofOfAddressUrl.trim() || undefined,
        intendedGameTypes,
        expectedTournamentSize,
        expectedFrequency,
        priorExperience: priorExperience.trim() || undefined,
        termsAccepted: termsRulesAccepted && termsEscrowAccepted && termsConductAccepted,
      };

      const res = await fetch("/api/organizer/apply", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save application draft");
      }

      setApplication(data.application);
      if (onApplicationUpdated && data.application) onApplicationUpdated(data.application);
      setSuccess("Draft saved! You can close this page and return at any time to finish.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmitFinal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    // Validate Steps
    if (applicantType === "organization" && !organizationName.trim()) {
      setError("Organization Name is required in Step 1.");
      setCurrentStep(1);
      return;
    }
    if (!ghanaCardFrontUrl.trim() || !ghanaCardBackUrl.trim() || !selfieUrl.trim()) {
      setError("Please provide all KYC identity documents in Step 2.");
      setCurrentStep(2);
      return;
    }
    if (!physicalAddress.trim() || !proofOfAddressUrl.trim()) {
      setError("Physical address and proof of address document are required in Step 3.");
      setCurrentStep(3);
      return;
    }
    if (intendedGameTypes.length === 0) {
      setError("Please select at least one intended tournament format in Step 4.");
      setCurrentStep(4);
      return;
    }
    if (!termsRulesAccepted || !termsEscrowAccepted || !termsConductAccepted) {
      setError("You must acknowledge and accept all platform agreements in Step 5.");
      setCurrentStep(5);
      return;
    }

    setBusy(true);
    try {
      const payload = {
        isDraft: false,
        applicantType,
        organizationName: organizationName.trim() || undefined,
        organizationRegNumber: organizationRegNumber.trim() || undefined,
        ghanaCardFrontUrl: ghanaCardFrontUrl.trim(),
        ghanaCardBackUrl: ghanaCardBackUrl.trim(),
        selfieUrl: selfieUrl.trim(),
        physicalAddress: physicalAddress.trim(),
        proofOfAddressUrl: proofOfAddressUrl.trim(),
        intendedGameTypes,
        expectedTournamentSize,
        expectedFrequency,
        priorExperience: priorExperience.trim() || undefined,
        termsAccepted: true,
      };

      const res = await fetch("/api/organizer/apply", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to submit organizer application");
      }

      setApplication(data.application);
      if (onApplicationUpdated && data.application) onApplicationUpdated(data.application);
      setSuccess(
        application?.status === "needs_info"
          ? "Your application has been resubmitted with requested updates! An admin will review shortly."
          : "Your organizer license application has been submitted for commission review!"
      );
      if (onSuccessNavigate) onSuccessNavigate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  };

  const handleStartNewApplicationAfterCooldown = () => {
    // Reset state for new draft
    setApplication(null);
    setCurrentStep(1);
    setError("");
    setSuccess("");
  };

  // Preset Mock Upload Helpers for seamless testing
  const handleQuickPopulateDoc = (type: "ghana_front" | "ghana_back" | "selfie" | "proof") => {
    const seed = Math.floor(Math.random() * 1000);
    if (type === "ghana_front") setGhanaCardFrontUrl(`https://picsum.photos/seed/ghana-card-front-${seed}/800/500`);
    if (type === "ghana_back") setGhanaCardBackUrl(`https://picsum.photos/seed/ghana-card-back-${seed}/800/500`);
    if (type === "selfie") setSelfieUrl(`https://picsum.photos/seed/selfie-${seed}/600/600`);
    if (type === "proof") setProofOfAddressUrl(`https://picsum.photos/seed/utility-bill-${seed}/800/1000`);
  };

  /* ------------------------------------------------------------------------- */
  /* STATUS SCREENS: Approved, Pending, Revoked, Rejected                      */
  /* ------------------------------------------------------------------------- */

  // CASE: Approved
  if (userRole === "organizer" || application?.status === "approved") {
    return (
      <div className="p-8 bg-[#06261f] border border-[#114232] rounded-3xl text-center space-y-6 shadow-2xl animate-in fade-in">
        <div className="w-20 h-20 bg-[#081c15] border-2 border-emerald-500 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
          <Award size={44} />
        </div>
        <div className="space-y-2">
          <span className="px-3 py-1 bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold rounded-full text-xs uppercase tracking-wider">
            License Active & Certified
          </span>
          <h2 className="text-2xl font-black text-[#f5efdf]">
            {application?.organizationName || "Official Tournament Organizer"}
          </h2>
          <p className="text-sm text-[#a3b8b0] max-w-lg mx-auto leading-relaxed">
            Your organizer credentials are fully certified. You have authorized rights to create official draughts tournaments, disburse prize pools, and oversee bracket matches.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => {
              if (onSuccessNavigate) onSuccessNavigate();
              else window.location.href = "/organizer";
            }}
            className="px-6 py-3.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg inline-flex items-center gap-2"
          >
            Enter Tournament Organizer Studio <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // CASE: Revoked
  if (isRevoked) {
    return (
      <div className="p-8 bg-red-950/90 border border-red-600 rounded-3xl text-[#f5efdf] space-y-6 shadow-2xl animate-in fade-in">
        <div className="w-16 h-16 bg-red-900/60 border border-red-500 rounded-2xl flex items-center justify-center text-red-300 shadow-lg">
          <XCircle size={36} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-red-200">
            Organizer Privileges Revoked
          </h2>
          <p className="text-sm text-red-300 mt-2 leading-relaxed">
            Your certified organizer privileges were revoked by system administration for cause.
          </p>
        </div>
        <div className="p-4 bg-[#081c15] border border-red-800/80 rounded-2xl space-y-2 text-xs">
          <div className="text-[#a3b8b0] font-bold uppercase tracking-wider">Reason for Revocation:</div>
          <div className="text-red-200 text-sm font-semibold">{revocationReason}</div>
        </div>
        <p className="text-xs text-[#a3b8b0]">
          In accordance with platform governance rules, reapplication following a revocation requires manual administrator review and clearance. Please contact platform support.
        </p>
      </div>
    );
  }

  // CASE: Pending Review (Submitted & Waiting)
  if (application && application.status === "pending") {
    return (
      <div className="p-8 bg-[#06261f] border border-[#114232] rounded-3xl text-[#f5efdf] space-y-6 shadow-2xl animate-in fade-in">
        <div className="flex items-center justify-between gap-4 border-b border-[#114232] pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-950/80 border border-amber-500/60 rounded-2xl flex items-center justify-center text-amber-400 shrink-0 shadow-lg animate-pulse">
              <Clock size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-[#f5efdf]">
                  Application Under Commission Review
                </h2>
                <span className="px-2.5 py-0.5 bg-amber-950 border border-amber-500/50 text-amber-300 rounded text-[10px] font-bold uppercase">
                  Pending
                </span>
              </div>
              <p className="text-xs text-[#a3b8b0] mt-0.5">
                Submitted on {new Date(application.submittedAt || application.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={loadApplicationStatus}
            disabled={busy}
            className="px-4 py-2 bg-[#081c15] hover:bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Refresh Status
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#a3b8b0]">Applicant / Brand</span>
            <div className="text-sm font-bold text-[#f5efdf]">
              {application.organizationName || "Individual Organizer"}
            </div>
            <div className="text-[#a3b8b0]">
              Format: <strong className="text-[#f5efdf] capitalize">{application.applicantType}</strong>
            </div>
            <div className="text-[#a3b8b0]">
              Address: <strong className="text-[#f5efdf]">{application.physicalAddress}</strong>
            </div>
          </div>

          <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#a3b8b0]">Tournament Intent</span>
            <div className="text-[#a3b8b0]">
              Frequency: <strong className="text-[#f5efdf] capitalize">{application.expectedFrequency}</strong>
            </div>
            <div className="text-[#a3b8b0]">
              Avg. Size: <strong className="text-[#f5efdf]">{application.expectedTournamentSize || 16} Players</strong>
            </div>
            <div className="text-[#a3b8b0]">
              Game Rules: <strong className="text-[#f5efdf]">Standard 10×10 Damii</strong>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#0c3b2e]/60 border border-[#184d3c] rounded-2xl flex items-start gap-3 text-xs text-[#a3b8b0]">
          <Info size={18} className="text-[#d6a735] shrink-0 mt-0.5" />
          <p leading-relaxed>
            System administrators and compliance officers review submitted KYC credentials within 24 hours. Once verified, your account role will upgrade to <strong>Certified Organizer</strong> and the Command Studio will unlock immediately.
          </p>
        </div>
      </div>
    );
  }

  // CASE: Rejected with 14-day Cooldown
  if (application && application.status === "rejected" && cooldown.isCooldownActive) {
    return (
      <div className="p-8 bg-red-950/70 border border-red-600/80 rounded-3xl text-[#f5efdf] space-y-6 shadow-2xl animate-in fade-in">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-red-900/60 border border-red-500 rounded-2xl flex items-center justify-center text-red-300 shrink-0 shadow-lg">
            <XCircle size={30} />
          </div>
          <div>
            <h2 className="text-xl font-black text-red-200">
              Application Not Approved
            </h2>
            <p className="text-xs text-red-300 mt-0.5">
              Reviewed on {application.reviewedAt ? new Date(application.reviewedAt).toLocaleDateString() : "Recently"}
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#081c15] border border-red-800/80 rounded-2xl space-y-1.5 text-xs">
          <span className="text-[#a3b8b0] uppercase font-bold text-[10px]">Review Feedback Note:</span>
          <p className="text-red-200 text-sm font-semibold">
            {application.reviewNote || "Submitted credentials do not meet current platform organizer standards."}
          </p>
        </div>

        <div className="p-5 bg-[#06261f] border border-amber-500/50 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <Clock size={16} /> 14-Day Reapplication Cooldown Active
          </div>
          <p className="text-xs text-[#a3b8b0] leading-relaxed">
            In order to maintain platform trust and prevent repeated invalid filings, rejected applications undergo a 14-day cooldown period. You will be eligible to prepare and submit a revised application on:
          </p>
          <div className="p-3 bg-[#081c15] rounded-xl border border-[#114232] flex items-center justify-between text-xs font-bold">
            <span className="text-[#f5efdf]">
              Eligible Date: {cooldown.reapplyEligibleAt ? new Date(cooldown.reapplyEligibleAt).toLocaleDateString() : "In 14 days"}
            </span>
            <span className="text-[#d6a735]">{cooldown.remainingDays} Day(s) Remaining</span>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------- */
  /* ACTIVE FORM: Draft, Needs Info, Fresh, or Cooldown Expired                */
  /* ------------------------------------------------------------------------- */

  const steps = [
    { number: 1, title: "Applicant Type" },
    { number: 2, title: "ID & KYC" },
    { number: 3, title: "Address" },
    { number: 4, title: "Experience" },
    { number: 5, title: "Rules & Terms" },
    { number: 6, title: "Review & Submit" },
  ];

  return (
    <div className="space-y-6">
      {/* Needs Info Banner if in needs_info state */}
      {application?.status === "needs_info" && (
        <div className="p-5 bg-cyan-950/90 border border-cyan-500 rounded-3xl text-cyan-100 shadow-xl space-y-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <HelpCircle size={24} className="text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-base text-cyan-200">
                Action Required: Additional Information Requested
              </h3>
              <p className="text-xs text-cyan-300 leading-relaxed">
                The reviewing administrator has requested corrections or additional documentation before your license can be approved.
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#081c15] border border-cyan-700/80 rounded-2xl space-y-1 text-xs">
            <span className="text-cyan-400 font-bold uppercase text-[10px]">
              Admin Note ({application.needsInfoRequestedAt ? new Date(application.needsInfoRequestedAt).toLocaleDateString() : "Recent"}):
            </span>
            <p className="text-sm font-semibold text-cyan-100">
              {application.needsInfoNote || application.reviewNote || "Please review and clarify your submitted documents."}
            </p>
          </div>

          <p className="text-xs text-[#a3b8b0]">
            Update the necessary fields below and submit to return your application to the pending review queue.
          </p>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-950/90 border border-red-600 rounded-2xl text-red-200 flex items-center justify-between text-xs font-semibold shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-400 hover:text-white">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-500 rounded-2xl text-emerald-200 flex items-center justify-between text-xs font-semibold shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-400 hover:text-white">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Stepper Header */}
      <div className="p-5 bg-[#06261f] border border-[#114232] rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#f5efdf] flex items-center gap-2">
              <ShieldCheck size={20} className="text-[#d6a735]" /> Certified Organizer Application
            </h2>
            <p className="text-xs text-[#a3b8b0]">
              Step {currentStep} of 6: <strong className="text-[#f5efdf]">{steps[currentStep - 1].title}</strong>
              {application?.status === "draft" && (
                <span className="ml-2 px-2 py-0.5 bg-[#081c15] border border-[#d6a735]/40 text-[#d6a735] rounded text-[10px] uppercase font-bold">
                  Draft Saved
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || busy}
              className="px-3.5 py-2 bg-[#081c15] hover:bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Save size={14} className={savingDraft ? "animate-spin" : ""} />
              {savingDraft ? "Saving..." : "Save Draft"}
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-6 gap-1.5">
          {steps.map((step) => {
            const isDone = currentStep > step.number;
            const isCurrent = currentStep === step.number;
            return (
              <button
                key={step.number}
                type="button"
                onClick={() => setCurrentStep(step.number)}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all text-center flex flex-col items-center gap-1 ${
                  isCurrent
                    ? "bg-[#d6a735] text-[#06261f] shadow-md"
                    : isDone
                    ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                    : "bg-[#081c15] text-[#a3b8b0] border border-[#114232] opacity-70"
                }`}
              >
                <span className="text-[10px] opacity-80">Step {step.number}</span>
                <span className="hidden sm:inline line-clamp-1">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP FORM CONTAINER */}
      <div className="p-6 sm:p-8 bg-[#06261f] border border-[#114232] rounded-3xl shadow-2xl space-y-6">
        {/* --- STEP 1: APPLICANT TYPE --- */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#f5efdf]">
                1. Select Applicant Organization Type
              </h3>
              <p className="text-xs text-[#a3b8b0]">
                Indicate whether you are applying as an independent Draughts Facilitator or representing a registered Draughts Club / Enterprise.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setApplicantType("individual")}
                className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-2 flex flex-col justify-between ${
                  applicantType === "individual"
                    ? "bg-[#0c3b2e] border-[#d6a735] ring-2 ring-[#d6a735]/40"
                    : "bg-[#081c15] border-[#114232] hover:border-[#184d3c]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#d6a735]">
                    <User size={22} />
                  </div>
                  {applicantType === "individual" && <CheckCircle size={18} className="text-[#d6a735]" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#f5efdf]">Individual Facilitator</h4>
                  <p className="text-xs text-[#a3b8b0] mt-1">
                    Independent tournament director hosting personal or community matches.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setApplicantType("organization")}
                className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-2 flex flex-col justify-between ${
                  applicantType === "organization"
                    ? "bg-[#0c3b2e] border-[#d6a735] ring-2 ring-[#d6a735]/40"
                    : "bg-[#081c15] border-[#114232] hover:border-[#184d3c]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#d6a735]">
                    <Building size={22} />
                  </div>
                  {applicantType === "organization" && <CheckCircle size={18} className="text-[#d6a735]" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#f5efdf]">Registered Organization / Club</h4>
                  <p className="text-xs text-[#a3b8b0] mt-1">
                    Draughts club, esports association, venue, or commercial gaming entity.
                  </p>
                </div>
              </div>
            </div>

            {applicantType === "organization" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-[#081c15] border border-[#114232] rounded-2xl animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Organization / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. Accra Central Draughts League"
                    className="w-full px-4 py-2.5 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Business / Club Registration ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={organizationRegNumber}
                    onChange={(e) => setOrganizationRegNumber(e.target.value)}
                    placeholder="e.g. BN-89201948"
                    className="w-full px-4 py-2.5 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 2: IDENTIFICATION & KYC --- */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#f5efdf]">
                2. National ID & Verification KYC
              </h3>
              <p className="text-xs text-[#a3b8b0]">
                All certified organizers must be verified against their official Ghana National Identity Card (Ghana Card) to guarantee player prize pool security.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Front Card */}
              <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#d6a735] uppercase">Ghana Card Front *</label>
                  <button
                    type="button"
                    onClick={() => handleQuickPopulateDoc("ghana_front")}
                    className="text-[10px] text-[#d6a735] hover:underline"
                  >
                    Use Sample Photo
                  </button>
                </div>
                <input
                  type="text"
                  value={ghanaCardFrontUrl}
                  onChange={(e) => setGhanaCardFrontUrl(e.target.value)}
                  placeholder="Paste image URL (https://...)"
                  className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                />
                {ghanaCardFrontUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-[#114232] bg-black">
                    <img src={ghanaCardFrontUrl} alt="Ghana Card Front" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Back Card */}
              <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#d6a735] uppercase">Ghana Card Back *</label>
                  <button
                    type="button"
                    onClick={() => handleQuickPopulateDoc("ghana_back")}
                    className="text-[10px] text-[#d6a735] hover:underline"
                  >
                    Use Sample Photo
                  </button>
                </div>
                <input
                  type="text"
                  value={ghanaCardBackUrl}
                  onChange={(e) => setGhanaCardBackUrl(e.target.value)}
                  placeholder="Paste image URL (https://...)"
                  className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                />
                {ghanaCardBackUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-[#114232] bg-black">
                    <img src={ghanaCardBackUrl} alt="Ghana Card Back" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Verification Selfie */}
              <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#d6a735] uppercase">Verification Selfie *</label>
                  <button
                    type="button"
                    onClick={() => handleQuickPopulateDoc("selfie")}
                    className="text-[10px] text-[#d6a735] hover:underline"
                  >
                    Use Sample Photo
                  </button>
                </div>
                <input
                  type="text"
                  value={selfieUrl}
                  onChange={(e) => setSelfieUrl(e.target.value)}
                  placeholder="Paste image URL (https://...)"
                  className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                />
                {selfieUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-[#114232] bg-black">
                    <img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- STEP 3: PHYSICAL ADDRESS & PROOF --- */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#f5efdf]">
                3. Physical Location & Proof of Address
              </h3>
              <p className="text-xs text-[#a3b8b0]">
                Provide your verified operating location or tournament venue.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                  Physical / Venue Address *
                </label>
                <input
                  type="text"
                  required
                  value={physicalAddress}
                  onChange={(e) => setPhysicalAddress(e.target.value)}
                  placeholder="e.g. House 42, Independence Avenue, Ridge, Accra"
                  className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#d6a735] uppercase">
                    Proof of Address Document (Utility Bill / Tenancy / GPS Digital Address) *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleQuickPopulateDoc("proof")}
                    className="text-[10px] text-[#d6a735] hover:underline"
                  >
                    Use Sample Document
                  </button>
                </div>
                <input
                  type="text"
                  value={proofOfAddressUrl}
                  onChange={(e) => setProofOfAddressUrl(e.target.value)}
                  placeholder="Paste document image/PDF URL (https://...)"
                  className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                />
                {proofOfAddressUrl && (
                  <div className="relative aspect-video max-h-48 rounded-xl overflow-hidden border border-[#114232] bg-black">
                    <img src={proofOfAddressUrl} alt="Proof of Address" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- STEP 4: INTENT & EXPERIENCE --- */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#f5efdf]">
                4. Tournament Organizing Intent & Experience
              </h3>
              <p className="text-xs text-[#a3b8b0]">
                Tell the tournament commission about the types of events you intend to run.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                  Expected Event Frequency
                </label>
                <select
                  value={expectedFrequency}
                  onChange={(e) => setExpectedFrequency(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                >
                  <option value="weekly">Weekly Tournaments</option>
                  <option value="bi-weekly">Bi-Weekly Tournaments</option>
                  <option value="monthly">Monthly Championships</option>
                  <option value="quarterly">Quarterly Major Cups</option>
                  <option value="special_invitational">Special Invitational Cups</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                  Expected Bracket Size
                </label>
                <select
                  value={expectedTournamentSize}
                  onChange={(e) => setExpectedTournamentSize(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                >
                  <option value={8}>8 Players (Single Elimination)</option>
                  <option value={16}>16 Players (Standard)</option>
                  <option value={32}>32 Players (Grand Tournament)</option>
                  <option value={64}>64 Players (Major Championship)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                Past Draughts Organizing Background / Bio
              </label>
              <textarea
                rows={3}
                value={priorExperience}
                onChange={(e) => setPriorExperience(e.target.value)}
                placeholder="Briefly describe your experience running draughts competitions, venue partnerships, or refereeing..."
                className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
              />
            </div>
          </div>
        )}

        {/* --- STEP 5: TERMS ACCEPTANCE & PLATFORM RULES --- */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#f5efdf]">
                5. Platform Rules & Financial Escrow Acknowledgement
              </h3>
              <p className="text-xs text-[#a3b8b0]">
                All certified organizers must abide by server-authoritative draughts rules and financial integrity guarantees.
              </p>
            </div>

            <div className="space-y-3">
              <label className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl flex items-start gap-3 cursor-pointer hover:border-[#184d3c] transition-colors">
                <input
                  type="checkbox"
                  checked={termsRulesAccepted}
                  onChange={(e) => setTermsRulesAccepted(e.target.checked)}
                  className="mt-1 accent-[#d6a735]"
                />
                <div className="text-xs leading-relaxed text-[#a3b8b0]">
                  <strong className="text-[#f5efdf] block font-bold mb-0.5">
                    10×10 Ghanaian Draughts Rule Enforcement
                  </strong>
                  I agree that all tournaments created under my license strictly enforce standard Ghanaian Damii rules, compulsory multi-hop jump completions, 60-second turn clocks, and flying king moves.
                </div>
              </label>

              <label className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl flex items-start gap-3 cursor-pointer hover:border-[#184d3c] transition-colors">
                <input
                  type="checkbox"
                  checked={termsEscrowAccepted}
                  onChange={(e) => setTermsEscrowAccepted(e.target.checked)}
                  className="mt-1 accent-[#d6a735]"
                />
                <div className="text-xs leading-relaxed text-[#a3b8b0]">
                  <strong className="text-[#f5efdf] block font-bold mb-0.5">
                    Server Escrow & Automatic Ledger Prize Distribution
                  </strong>
                  I acknowledge that all entry fees and prize pools are escrowed by the server ledger and automatically disbursed to verified winners. Organizers cannot alter prize disbursements outside platform ledger policies.
                </div>
              </label>

              <label className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl flex items-start gap-3 cursor-pointer hover:border-[#184d3c] transition-colors">
                <input
                  type="checkbox"
                  checked={termsConductAccepted}
                  onChange={(e) => setTermsConductAccepted(e.target.checked)}
                  className="mt-1 accent-[#d6a735]"
                />
                <div className="text-xs leading-relaxed text-[#a3b8b0]">
                  <strong className="text-[#f5efdf] block font-bold mb-0.5">
                    Organizer Code of Conduct & Revocation Terms
                  </strong>
                  I understand that match fixing, improper manual score manipulation, or failure to fulfill event schedules will result in immediate license revocation and tournament reassignment.
                </div>
              </label>
            </div>
          </div>
        )}

        {/* --- STEP 6: REVIEW & FINAL SUBMIT --- */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#f5efdf]">
                6. Review Application & Final Submit
              </h3>
              <p className="text-xs text-[#a3b8b0]">
                Verify your submitted information before final filing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#d6a735]">Applicant & Business</span>
                <p><strong className="text-[#f5efdf]">Type:</strong> <span className="capitalize">{applicantType}</span></p>
                {applicantType === "organization" && (
                  <p><strong className="text-[#f5efdf]">Organization Name:</strong> {organizationName || "Not provided"}</p>
                )}
                <p><strong className="text-[#f5efdf]">Physical Address:</strong> {physicalAddress || "Not provided"}</p>
              </div>

              <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#d6a735]">Tournaments & Frequency</span>
                <p><strong className="text-[#f5efdf]">Event Frequency:</strong> <span className="capitalize">{expectedFrequency}</span></p>
                <p><strong className="text-[#f5efdf]">Average Size:</strong> {expectedTournamentSize} Players</p>
                <p><strong className="text-[#f5efdf]">Rules Acknowledged:</strong> <span className="text-emerald-400 font-bold">Yes</span></p>
              </div>
            </div>

            {/* Document checklist */}
            <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-[#d6a735]">KYC Documents Attached</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                <div className={`p-2 rounded-xl border ${ghanaCardFrontUrl ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300" : "bg-red-950/60 border-red-500/40 text-red-300"}`}>
                  Ghana Card Front: {ghanaCardFrontUrl ? "✓" : "✗"}
                </div>
                <div className={`p-2 rounded-xl border ${ghanaCardBackUrl ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300" : "bg-red-950/60 border-red-500/40 text-red-300"}`}>
                  Ghana Card Back: {ghanaCardBackUrl ? "✓" : "✗"}
                </div>
                <div className={`p-2 rounded-xl border ${selfieUrl ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300" : "bg-red-950/60 border-red-500/40 text-red-300"}`}>
                  Selfie: {selfieUrl ? "✓" : "✗"}
                </div>
                <div className={`p-2 rounded-xl border ${proofOfAddressUrl ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300" : "bg-red-950/60 border-red-500/40 text-red-300"}`}>
                  Proof Address: {proofOfAddressUrl ? "✓" : "✗"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NAVIGATION CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#114232]">
          <button
            type="button"
            disabled={currentStep === 1 || busy}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            className="px-4 py-2.5 bg-[#081c15] hover:bg-[#0c3b2e] text-[#f5efdf] border border-[#114232] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || busy}
              className="px-4 py-2.5 bg-[#081c15] hover:bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Save size={14} className={savingDraft ? "animate-spin" : ""} />
              {savingDraft ? "Saving..." : "Save Draft"}
            </button>

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(6, prev + 1))}
                className="px-5 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md"
              >
                Next Step <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmitFinal()}
                disabled={busy}
                className="px-6 py-2.5 bg-gradient-to-r from-[#d6a735] to-[#f39c12] hover:opacity-90 text-[#06261f] rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-xl"
              >
                <Send size={14} className={busy ? "animate-spin" : ""} />
                {busy
                  ? "Submitting Application..."
                  : application?.status === "needs_info"
                  ? "Resubmit Application"
                  : "Submit Application"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

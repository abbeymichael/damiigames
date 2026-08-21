"use client";

import React, { useState } from "react";
import {
  Building,
  User,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Trophy,
  Calendar,
  MapPin,
  CreditCard,
  HelpCircle,
  X,
  RefreshCw,
  Ban,
  UserCheck,
  ExternalLink,
  Award,
  Clock,
  Check,
  AlertTriangle,
} from "lucide-react";
import { OrganizerApplicationDetailPayload, OrganizerApplicationStatus } from "@/lib/types";

interface OrganizerApplicationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  detail: OrganizerApplicationDetailPayload | null;
  busy: boolean;
  onApprove: (applicationId: string, reviewNote?: string) => Promise<void>;
  onReject: (applicationId: string, reviewNote: string) => Promise<void>;
  onRequestInfo: (applicationId: string, reviewNote: string) => Promise<void>;
  onRevoke: (
    applicationId: string,
    reason: string,
    tournamentHandling: "reassign_to_system" | "cancel_and_refund"
  ) => Promise<void>;
}

export function OrganizerApplicationDetailModal({
  isOpen,
  onClose,
  detail,
  busy,
  onApprove,
  onReject,
  onRequestInfo,
  onRevoke,
}: OrganizerApplicationDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "documents" | "applicant_context" | "tournaments" | "review_log">("details");
  
  // Action sub-dialogs
  const [actionDialog, setActionDialog] = useState<"none" | "approve" | "reject" | "needs_info" | "revoke">("none");
  const [reviewNoteInput, setReviewNoteInput] = useState("");
  const [tournamentHandlingInput, setTournamentHandlingInput] = useState<"reassign_to_system" | "cancel_and_refund">("reassign_to_system");
  const [selectedDocPreview, setSelectedDocPreview] = useState<{ title: string; url: string } | null>(null);

  if (!isOpen || !detail) return null;

  const { application: app, applicant, userAccount, applicantContext, activeTournaments } = detail;

  const statusBadge = (status: OrganizerApplicationStatus) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-3 py-1 bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
            <CheckCircle size={13} className="text-emerald-400" /> Approved
          </span>
        );
      case "pending":
        return (
          <span className="px-3 py-1 bg-amber-950/90 text-amber-300 border border-amber-500/50 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse shadow-xs">
            <Clock size={13} className="text-amber-400" /> Pending Review
          </span>
        );
      case "needs_info":
        return (
          <span className="px-3 py-1 bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
            <HelpCircle size={13} className="text-cyan-400" /> Needs More Info
          </span>
        );
      case "rejected":
        return (
          <span className="px-3 py-1 bg-red-950/90 text-red-300 border border-red-500/50 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
            <XCircle size={13} className="text-red-400" /> Rejected / Revoked
          </span>
        );
      default:
        return null;
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionDialog === "approve") {
      await onApprove(app.id, reviewNoteInput.trim() || undefined);
      setActionDialog("none");
      setReviewNoteInput("");
    } else if (actionDialog === "reject") {
      if (!reviewNoteInput.trim()) return;
      await onReject(app.id, reviewNoteInput.trim());
      setActionDialog("none");
      setReviewNoteInput("");
    } else if (actionDialog === "needs_info") {
      if (!reviewNoteInput.trim()) return;
      await onRequestInfo(app.id, reviewNoteInput.trim());
      setActionDialog("none");
      setReviewNoteInput("");
    } else if (actionDialog === "revoke") {
      if (!reviewNoteInput.trim()) return;
      await onRevoke(app.id, reviewNoteInput.trim(), tournamentHandlingInput);
      setActionDialog("none");
      setReviewNoteInput("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#081c15] border border-[#1a5e48] text-[#f5efdf] max-w-4xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="p-5 bg-[#041d17] border-b border-[#1a5e48] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0c3b2e] border border-[#1a5e48] rounded-xl text-[#d6a735]">
              {app.applicantType === "organization" ? <Building size={24} /> : <User size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-bold text-[#f5efdf]">
                  {app.organizationName || applicant?.username || "Organizer Application"}
                </h3>
                {statusBadge(app.status)}
                <span className="px-2 py-0.5 bg-[#06261f] border border-[#1a5e48] rounded text-[10px] uppercase font-bold text-slate-300">
                  {app.applicantType}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Applicant: <strong className="text-cyan-300 font-mono">{applicant?.username || app.userId}</strong> •
                Submitted: <span className="font-mono">{new Date(app.createdAt).toLocaleDateString()}</span> •
                ID: <span className="font-mono text-slate-400">{app.id}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-[#0c3b2e]"
          >
            <X size={20} />
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-[#1a5e48] bg-[#06261f] px-5 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "details"
                ? "border-[#d6a735] text-[#d6a735]"
                : "border-transparent text-slate-300 hover:text-white"
            }`}
          >
            <FileText size={15} /> Application Fields
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "documents"
                ? "border-[#d6a735] text-[#d6a735]"
                : "border-transparent text-slate-300 hover:text-white"
            }`}
          >
            <Shield size={15} /> KYC Documents (4)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("applicant_context")}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "applicant_context"
                ? "border-[#d6a735] text-[#d6a735]"
                : "border-transparent text-slate-300 hover:text-white"
            }`}
          >
            <User size={15} /> Account & Gaming History
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tournaments")}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "tournaments"
                ? "border-[#d6a735] text-[#d6a735]"
                : "border-transparent text-slate-300 hover:text-white"
            }`}
          >
            <Trophy size={15} /> Hosted Tournaments ({activeTournaments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("review_log")}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "review_log"
                ? "border-[#d6a735] text-[#d6a735]"
                : "border-transparent text-slate-300 hover:text-white"
            }`}
          >
            <Clock size={15} /> Review Audit Notes
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* TAB 1: APPLICATION FIELDS */}
          {activeTab === "details" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                    Applicant Type & Entity
                  </span>
                  <p className="font-bold text-[#f5efdf] text-sm capitalize">{app.applicantType}</p>
                  {app.organizationName && (
                    <p className="text-xs text-amber-300 font-semibold mt-1">
                      Org Name: {app.organizationName}
                    </p>
                  )}
                  {app.organizationRegNumber && (
                    <p className="text-[11px] text-cyan-300 font-mono">
                      Reg No: {app.organizationRegNumber}
                    </p>
                  )}
                </div>

                <div className="p-3.5 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                    Physical Operating Location
                  </span>
                  <div className="flex items-start gap-1.5 mt-1">
                    <MapPin size={15} className="text-[#d6a735] shrink-0 mt-0.5" />
                    <p className="font-medium text-[#f5efdf] leading-relaxed">
                      {app.physicalAddress || "No physical address provided"}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                    Intended Game Modes & Formats
                  </span>
                  <p className="font-bold text-[#f5efdf] text-sm mt-0.5">
                    {app.intendedGameTypes || "damii-10x10"}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Standard 10x10 Draughts / Tournament Brackets
                  </p>
                </div>

                <div className="p-3.5 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                    Scale & Cadence
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <div>
                      <p className="text-[11px] text-slate-300">Expected Size</p>
                      <p className="text-sm font-bold text-amber-300">
                        {app.expectedTournamentSize ? `${app.expectedTournamentSize} Players` : "Flexible (8-32)"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-300">Frequency</p>
                      <p className="text-sm font-bold text-cyan-300">
                        {app.expectedFrequency || "Bi-weekly"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prior Experience Statement */}
              <div className="p-4 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-1.5">
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Award size={13} className="text-[#d6a735]" /> Prior Tournament Organizing Experience
                </span>
                <p className="text-xs text-[#f8fafc] leading-relaxed bg-[#081c15] p-3 rounded-lg border border-[#114232]">
                  {app.priorExperience || "Applicant did not submit prior organizing background notes."}
                </p>
              </div>

              {/* Terms Acceptance Note */}
              <div className="p-3 bg-[#0c3b2e]/40 border border-[#1a5e48] rounded-xl flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Check size={16} />
                  <span>Platform Organizer Terms of Service Accepted</span>
                </div>
                <span className="font-mono text-slate-300">
                  {new Date(app.termsAcceptedAt).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: KYC & VERIFICATION DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="space-y-4">
              {!(app.ghanaCardFrontUrl || app.ghanaCardBackUrl || app.selfieUrl || app.proofOfAddressUrl) ? (
                <div className="p-6 bg-[#041d17] border border-[#1a5e48] rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#0c3b2e] border border-[#1a5e48] flex items-center justify-center mx-auto text-[#d6a735]">
                    <Shield size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-[#f5efdf]">Physical KYC Documents Kept at Bay</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    Under the current simplified organizer onboarding framework, physical Ghana Card scans and utility bills are not required. The applicant’s identity is secured via verified mobile phone and platform terms acknowledgement.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-300">
                    Inspect official Ghana Card identity documents and proof of physical business address. Click any document to view high-resolution preview.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Ghana Card Front */}
                    {app.ghanaCardFrontUrl && (
                      <div className="p-3.5 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#f5efdf] text-xs flex items-center gap-1.5">
                            <CreditCard size={14} className="text-[#d6a735]" /> Ghana Card (Front)
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                            Uploaded
                          </span>
                        </div>
                        <div
                          onClick={() => setSelectedDocPreview({ title: "Ghana Card (Front)", url: app.ghanaCardFrontUrl! })}
                          className="relative aspect-video rounded-lg overflow-hidden border border-[#114232] cursor-pointer group bg-black/40 flex items-center justify-center"
                        >
                          <img
                            src={app.ghanaCardFrontUrl}
                            alt="Ghana Card Front"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1.5">
                            <ExternalLink size={14} /> Click to Expand Scan
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ghana Card Back */}
                    {app.ghanaCardBackUrl && (
                      <div className="p-3.5 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#f5efdf] text-xs flex items-center gap-1.5">
                            <CreditCard size={14} className="text-[#d6a735]" /> Ghana Card (Back)
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                            Uploaded
                          </span>
                        </div>
                        <div
                          onClick={() => setSelectedDocPreview({ title: "Ghana Card (Back)", url: app.ghanaCardBackUrl! })}
                          className="relative aspect-video rounded-lg overflow-hidden border border-[#114232] cursor-pointer group bg-black/40 flex items-center justify-center"
                        >
                          <img
                            src={app.ghanaCardBackUrl}
                            alt="Ghana Card Back"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1.5">
                            <ExternalLink size={14} /> Click to Expand Scan
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Live Selfie Photo */}
                    {app.selfieUrl && (
                      <div className="p-3.5 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#f5efdf] text-xs flex items-center gap-1.5">
                            <User size={14} className="text-cyan-400" /> Applicant Live Selfie
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                            Biometric Match
                          </span>
                        </div>
                        <div
                          onClick={() => setSelectedDocPreview({ title: "Live Selfie Photo", url: app.selfieUrl! })}
                          className="relative aspect-video rounded-lg overflow-hidden border border-[#114232] cursor-pointer group bg-black/40 flex items-center justify-center"
                        >
                          <img
                            src={app.selfieUrl}
                            alt="Live Selfie"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1.5">
                            <ExternalLink size={14} /> Click to Expand Selfie
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Proof of Address Document */}
                    {app.proofOfAddressUrl && (
                      <div className="p-3.5 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#f5efdf] text-xs flex items-center gap-1.5">
                            <FileText size={14} className="text-amber-400" /> Proof of Physical Address
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                            Utility / Lease
                          </span>
                        </div>
                        <div
                          onClick={() => setSelectedDocPreview({ title: "Proof of Physical Address", url: app.proofOfAddressUrl! })}
                          className="relative aspect-video rounded-lg overflow-hidden border border-[#114232] cursor-pointer group bg-black/40 flex items-center justify-center"
                        >
                          <img
                            src={app.proofOfAddressUrl}
                            alt="Proof of Address"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1.5">
                            <ExternalLink size={14} /> Click to Expand Document
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Document Zoom Lightbox Modal */}
              {selectedDocPreview && (
                <div className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4">
                  <div className="max-w-2xl w-full bg-[#081c15] border border-[#1a5e48] rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-3.5 bg-[#041d17] border-b border-[#1a5e48] flex items-center justify-between">
                      <span className="font-bold text-sm text-[#d6a735]">{selectedDocPreview.title}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDocPreview(null)}
                        className="text-slate-300 hover:text-white"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="p-4 bg-black/50 flex items-center justify-center max-h-[70vh] overflow-auto">
                      <img
                        src={selectedDocPreview.url}
                        alt="Zoomed scan"
                        className="max-h-[65vh] max-w-full rounded-lg object-contain"
                      />
                    </div>
                    <div className="p-3 bg-[#041d17] border-t border-[#1a5e48] flex justify-end">
                      <a
                        href={selectedDocPreview.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#114232] text-cyan-300 font-bold rounded-lg text-xs flex items-center gap-1.5"
                      >
                        <ExternalLink size={13} /> Open Image in New Tab
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: APPLICANT ACCOUNT & GAMING CONTEXT */}
          {activeTab === "applicant_context" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-300 uppercase font-bold">DPI Rating</span>
                  <p className="text-base font-black text-[#d6a735]">{applicantContext.rating} DPI</p>
                </div>
                <div className="p-3 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-300 uppercase font-bold">Total Matches</span>
                  <p className="text-base font-black text-cyan-400">{applicantContext.totalMatches} Games</p>
                </div>
                <div className="p-3 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-300 uppercase font-bold">Win Rate</span>
                  <p className="text-base font-black text-emerald-400">{applicantContext.winRate}%</p>
                </div>
                <div className="p-3 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-300 uppercase font-bold">Account Age</span>
                  <p className="text-base font-black text-[#f5efdf]">{applicantContext.accountAgeDays} Days</p>
                </div>
              </div>

              {/* Profile Details */}
              <div className="p-4 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-3">
                <span className="text-xs font-bold text-[#d6a735] uppercase">
                  Verified Contact & Account Profile
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-300 block text-[11px]">Account ID / Token:</span>
                    <span className="font-mono text-cyan-300">{app.userId}</span>
                  </div>
                  <div>
                    <span className="text-slate-300 block text-[11px]">User Role:</span>
                    <span className="font-bold text-[#f5efdf] uppercase">
                      {applicant?.role || userAccount?.role || "player"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-300 block text-[11px]">Phone Number:</span>
                    <span className="font-mono text-[#f5efdf]">
                      {applicant?.phoneNumber || userAccount?.phoneNumber || "Not set"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-300 block text-[11px]">Email Address:</span>
                    <span className="text-[#f5efdf]">{applicant?.email || userAccount?.email || "Not set"}</span>
                  </div>
                  <div>
                    <span className="text-slate-300 block text-[11px]">Available Points:</span>
                    <span className="font-bold text-amber-400">
                      {applicantContext.pointsBalance.toLocaleString()} Pts
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-300 block text-[11px]">Available Marbles (GHS):</span>
                    <span className="font-bold text-emerald-400">
                      {applicantContext.marblesBalance.toLocaleString()} Marbles
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HOSTED TOURNAMENTS */}
          {activeTab === "tournaments" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#f5efdf]">
                  Leagues Created by {applicant?.username || app.organizationName || app.userId}
                </span>
                <span className="text-[11px] text-[#d6a735]">
                  Active: {applicantContext.activeTournamentsCount} • Completed: {applicantContext.completedTournamentsCount}
                </span>
              </div>

              {activeTournaments.length === 0 ? (
                <div className="py-8 bg-[#041d17] border border-[#1a5e48] rounded-xl text-center text-slate-400 italic">
                  No tournaments hosted yet by this applicant.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#1a5e48] text-slate-300 uppercase font-bold bg-[#041d17]">
                        <th className="py-2.5 px-3">Tournament Title</th>
                        <th className="py-2.5 px-3">Format</th>
                        <th className="py-2.5 px-3">Prize Pool</th>
                        <th className="py-2.5 px-3">Players</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#114232]">
                      {activeTournaments.map((t) => (
                        <tr key={t.id} className="hover:bg-[#0c3b2e]/40">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-[#f5efdf] block">{t.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {t.id}</span>
                          </td>
                          <td className="py-2.5 px-3 uppercase text-[11px] text-cyan-300">
                            {t.format || "single_elimination"}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-amber-400">
                            {t.prizePoolPoints || 0} Pts
                          </td>
                          <td className="py-2.5 px-3 text-slate-200">
                            {t.participantCount || 0} / {t.maxParticipants}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                t.status === "active"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                                  : t.status === "registration"
                                  ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                                  : t.status === "completed"
                                  ? "bg-slate-800 text-slate-300"
                                  : "bg-red-950 text-red-300"
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: REVIEW AUDIT LOG */}
          {activeTab === "review_log" && (
            <div className="space-y-3">
              <div className="p-4 bg-[#041d17] border border-[#1a5e48] rounded-xl space-y-2">
                <span className="text-xs font-bold text-[#d6a735] uppercase">
                  Latest Administrative Decision
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-300 block text-[11px]">Reviewed By:</span>
                    <span className="font-bold text-[#f5efdf]">
                      {app.reviewedByAdminName || app.reviewedByAdminId || "Not reviewed yet"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-300 block text-[11px]">Reviewed Timestamp:</span>
                    <span className="font-mono text-slate-300">
                      {app.reviewedAt ? new Date(app.reviewedAt).toLocaleString() : "N/A"}
                    </span>
                  </div>
                </div>

                {app.reviewNote && (
                  <div className="mt-2 pt-2 border-t border-[#1a5e48]">
                    <span className="text-slate-300 block text-[11px] font-bold mb-1">
                      Official Reviewer Note / Decision Reason:
                    </span>
                    <p className="p-3 bg-[#081c15] border border-[#114232] rounded-lg text-slate-200 leading-relaxed font-mono">
                      {app.reviewNote}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTION SUB-DIALOG (APPROVE, REJECT, REQUEST INFO, REVOKE) */}
          {actionDialog !== "none" && (
            <form
              onSubmit={handleActionSubmit}
              className="p-4 bg-[#041d17] border border-[#d6a735]/40 rounded-xl space-y-3 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-[#1a5e48] pb-2">
                <span className="font-bold text-sm text-[#d6a735] flex items-center gap-1.5">
                  {actionDialog === "approve" && <><CheckCircle size={16} /> Approve Organizer Application</>}
                  {actionDialog === "reject" && <><XCircle size={16} /> Reject Organizer Application</>}
                  {actionDialog === "needs_info" && <><HelpCircle size={16} /> Request Additional Information / Documents</>}
                  {actionDialog === "revoke" && <><Ban size={16} /> Revoke Organizer Status & Handle Tournaments</>}
                </span>
                <button
                  type="button"
                  onClick={() => setActionDialog("none")}
                  className="text-slate-300 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {actionDialog === "approve" && (
                <div>
                  <label className="block text-slate-300 mb-1 text-xs">
                    Approval Review Note (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ghana Card verified, KYC documents approved."
                    value={reviewNoteInput}
                    onChange={(e) => setReviewNoteInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#d6a735]"
                  />
                  <p className="text-[11px] text-emerald-400 mt-1">
                    ✓ This will set application status to APPROVED and upgrade the user role to ORGANIZER in the same transaction.
                  </p>
                </div>
              )}

              {actionDialog === "reject" && (
                <div>
                  <label className="block text-slate-300 mb-1 text-xs font-bold">
                    Rejection Reason / Note (Required):
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="State reason for rejecting application (e.g. invalid KYC scan, failed background check)..."
                    value={reviewNoteInput}
                    onChange={(e) => setReviewNoteInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-red-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    No role change will occur. The applicant will be able to view this rejection reason.
                  </p>
                </div>
              )}

              {actionDialog === "needs_info" && (
                <div>
                  <label className="block text-slate-300 mb-1 text-xs font-bold">
                    Information / Document Request Instructions (Required):
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Please upload a clear photo of the back of your Ghana Card and a recent utility bill dated within 90 days..."
                    value={reviewNoteInput}
                    onChange={(e) => setReviewNoteInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[11px] text-cyan-400 mt-1">
                    ✓ Status will change to NEEDS_INFO. The applicant will be prompted to update and resubmit their application.
                  </p>
                </div>
              )}

              {actionDialog === "revoke" && (
                <div className="space-y-3">
                  <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl space-y-1 text-xs">
                    <p className="font-bold text-red-300 flex items-center gap-1.5">
                      <AlertTriangle size={15} /> Revoking Organizer Privileges
                    </p>
                    <p className="text-slate-300 leading-relaxed">
                      The user will be demoted from <strong>organizer</strong> back to <strong>player</strong>. Choose how to handle any active tournaments owned by this organizer:
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 text-xs font-bold">
                      Live Tournament Resolution Strategy:
                    </label>
                    <select
                      value={tournamentHandlingInput}
                      onChange={(e: any) => setTournamentHandlingInput(e.target.value)}
                      className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                    >
                      <option value="reassign_to_system">
                        Reassign active tournaments to DAMII Facilitator (Preserve brackets & players)
                      </option>
                      <option value="cancel_and_refund">
                        Cancel active tournaments & refund all entry fees to participants immediately
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 text-xs font-bold">
                      Revocation Audit Reason (Required):
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="State the reason for revoking organizer permissions (e.g. misconduct, fraudulent tournament management)..."
                      value={reviewNoteInput}
                      onChange={(e) => setReviewNoteInput(e.target.value)}
                      className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1a5e48]">
                <button
                  type="button"
                  onClick={() => setActionDialog("none")}
                  className="px-3 py-1.5 bg-[#081c15] text-slate-300 rounded-lg text-xs hover:bg-[#0c3b2e]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className={`px-4 py-1.5 font-bold rounded-lg text-xs shadow-md transition-all ${
                    actionDialog === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : actionDialog === "needs_info"
                      ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                      : "bg-red-600 hover:bg-red-500 text-white"
                  }`}
                >
                  {busy ? "Processing..." : "Confirm Decision"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* MODAL FOOTER CONTROLS */}
        <div className="p-4 bg-[#041d17] border-t border-[#1a5e48] flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-slate-400">
            Current Status: <strong className="text-white uppercase">{app.status}</strong>
          </div>

          <div className="flex items-center gap-2">
            {(app.status === "pending" || app.status === "needs_info") && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActionDialog("needs_info");
                    setReviewNoteInput("");
                  }}
                  disabled={busy}
                  className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#114232] text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <HelpCircle size={14} /> Request More Info
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionDialog("reject");
                    setReviewNoteInput("");
                  }}
                  disabled={busy}
                  className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <XCircle size={14} /> Reject Application
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionDialog("approve");
                    setReviewNoteInput("");
                  }}
                  disabled={busy}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle size={14} /> Approve Organizer
                </button>
              </>
            )}

            {app.status === "approved" && (
              <button
                type="button"
                onClick={() => {
                  setActionDialog("revoke");
                  setReviewNoteInput("");
                }}
                disabled={busy}
                className="px-3.5 py-1.5 bg-red-950 hover:bg-red-900 border border-red-700 text-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Ban size={14} /> Revoke Organizer Status
              </button>
            )}

            {app.status === "rejected" && (
              <button
                type="button"
                onClick={() => {
                  setActionDialog("approve");
                  setReviewNoteInput("Re-evaluated and approved by admin.");
                }}
                disabled={busy}
                className="px-3.5 py-1.5 bg-[#0c3b2e] hover:bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <UserCheck size={14} /> Re-Approve Organizer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

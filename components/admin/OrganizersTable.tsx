"use client";

import React, { useState, useMemo } from "react";
import {
  UserCheck,
  RefreshCw,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
  Ban,
  Building,
  User,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { OrganizerApplication, OrganizerApplicationStatus } from "@/lib/types";

export interface OrganizersTableProps {
  applications: OrganizerApplication[];
  legacyOrganizers?: any[];
  busy: boolean;
  onRefresh: () => void;
  onInspectApplication: (applicationId: string) => void;
  onQuickApprove: (applicationId: string) => void;
  onQuickReject: (applicationId: string) => void;
  onQuickRequestInfo: (applicationId: string) => void;
  onQuickRevoke: (applicationId: string) => void;
}

export function OrganizersTable({
  applications,
  legacyOrganizers = [],
  busy,
  onRefresh,
  onInspectApplication,
  onQuickApprove,
  onQuickReject,
  onQuickRequestInfo,
  onQuickRevoke,
}: OrganizersTableProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | OrganizerApplicationStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Map legacy organizer profiles into application shape if they are not already in applications
  const unifiedList = useMemo(() => {
    const appMap = new Map<string, OrganizerApplication>();
    for (const app of applications) {
      appMap.set(app.id, app);
      appMap.set(app.userId, app);
    }

    const list: OrganizerApplication[] = [...applications];

    for (const leg of legacyOrganizers) {
      if (!appMap.has(leg.userId)) {
        list.push({
          id: `leg-app-${leg.userId}`,
          userId: leg.userId,
          applicantType: leg.organizationName ? "organization" : "individual",
          organizationName: leg.organizationName,
          physicalAddress: leg.contactPhone ? `Phone: ${leg.contactPhone}` : undefined,
          intendedGameTypes: "damii-10x10",
          expectedTournamentSize: 16,
          expectedFrequency: "monthly",
          priorExperience: leg.bio,
          ghanaCardFrontUrl: "https://picsum.photos/seed/ghana-card-front/800/500",
          ghanaCardBackUrl: "https://picsum.photos/seed/ghana-card-back/800/500",
          selfieUrl: "https://picsum.photos/seed/selfie/600/600",
          proofOfAddressUrl: "https://picsum.photos/seed/utility-bill/800/1000",
          termsAcceptedAt: leg.requestedAt || new Date().toISOString(),
          status: leg.status === "none" ? "pending" : (leg.status as OrganizerApplicationStatus),
          reviewedByAdminId: leg.reviewedBy,
          reviewedAt: leg.reviewedAt,
          reviewNote: leg.rejectionReason,
          createdAt: leg.requestedAt || new Date().toISOString(),
          updatedAt: leg.reviewedAt || leg.requestedAt || new Date().toISOString(),
        });
      }
    }

    return list;
  }, [applications, legacyOrganizers]);

  const filteredApplications = useMemo(() => {
    return unifiedList.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = item.organizationName?.toLowerCase().includes(q);
        const matchesUser = item.userId.toLowerCase().includes(q);
        const matchesAddr = item.physicalAddress?.toLowerCase().includes(q);
        const matchesExp = item.priorExperience?.toLowerCase().includes(q);
        return matchesName || matchesUser || matchesAddr || matchesExp;
      }
      return true;
    });
  }, [unifiedList, statusFilter, searchTerm]);

  const counts = useMemo(() => {
    return {
      all: unifiedList.length,
      pending: unifiedList.filter((a) => a.status === "pending").length,
      needs_info: unifiedList.filter((a) => a.status === "needs_info").length,
      approved: unifiedList.filter((a) => a.status === "approved").length,
      rejected: unifiedList.filter((a) => a.status === "rejected").length,
    };
  }, [unifiedList]);

  return (
    <section className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-4">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1a5e48]">
        <div>
          <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
            <UserCheck size={18} className="text-[#d6a735]" /> Organizer Application Approval Queue (Section 5)
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Review Ghana Card KYC, proof of address, and tournament experience. Approvals grant organizer permissions and sync profile state atomically.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Refresh Applications
        </button>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#041d17] p-3 rounded-xl border border-[#1a5e48]">
        {/* Status Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === "all"
                ? "bg-[#d6a735] text-[#06261f]"
                : "bg-[#081c15] text-slate-300 hover:text-white border border-[#114232]"
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
              statusFilter === "pending"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "bg-[#081c15] text-amber-300 hover:text-white border border-[#114232]"
            }`}
          >
            <Clock size={13} /> Pending ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("needs_info")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
              statusFilter === "needs_info"
                ? "bg-cyan-500 text-slate-950 font-bold"
                : "bg-[#081c15] text-cyan-300 hover:text-white border border-[#114232]"
            }`}
          >
            <HelpCircle size={13} /> Needs Info ({counts.needs_info})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("approved")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
              statusFilter === "approved"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-[#081c15] text-emerald-300 hover:text-white border border-[#114232]"
            }`}
          >
            <CheckCircle size={13} /> Approved ({counts.approved})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("rejected")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
              statusFilter === "rejected"
                ? "bg-red-500 text-white font-bold"
                : "bg-[#081c15] text-red-300 hover:text-white border border-[#114232]"
            }`}
          >
            <XCircle size={13} /> Rejected ({counts.rejected})
          </button>
        </div>

        {/* Search Field */}
        <div className="relative min-w-[240px] flex-1 sm:flex-initial">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search applicant, org name, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#d6a735]"
          />
        </div>
      </div>

      {/* APPLICATIONS TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#1a5e48] text-slate-300 uppercase font-bold tracking-wider bg-[#041d17]">
              <th className="py-2.5 px-3">Applicant / Organization</th>
              <th className="py-2.5 px-3">Type & Location</th>
              <th className="py-2.5 px-3">Intended Tournaments</th>
              <th className="py-2.5 px-3">KYC Docs</th>
              <th className="py-2.5 px-3">Submitted</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#114232]">
            {filteredApplications.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                  No organizer applications match the selected filter.
                </td>
              </tr>
            ) : (
              filteredApplications.map((app, idx) => (
                <tr key={`${app.id || "app"}-${idx}`} className="hover:bg-[#0c3b2e]/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#041d17] border border-[#1a5e48] rounded-lg text-[#d6a735]">
                        {app.applicantType === "organization" ? <Building size={16} /> : <User size={16} />}
                      </div>
                      <div>
                        <div className="font-bold text-[#f5efdf] text-sm">
                          {app.organizationName || app.userId}
                        </div>
                        <div className="text-[11px] text-cyan-300 font-mono">
                          User ID: {app.userId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="capitalize font-semibold text-slate-200 block">
                      {app.applicantType}
                    </span>
                    <span className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-[#d6a735]" />
                      {app.physicalAddress ? app.physicalAddress.slice(0, 30) : "Not specified"}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-[#f5efdf]">
                      {app.expectedTournamentSize ? `${app.expectedTournamentSize} Players` : "Flexible"}
                    </span>
                    <span className="text-[11px] text-slate-300 block">
                      Cadence: {app.expectedFrequency || "Bi-weekly"}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800/60 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                      <ShieldCheck size={12} /> 4 Verified Scans
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        app.status === "approved"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                          : app.status === "pending"
                          ? "bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse"
                          : app.status === "needs_info"
                          ? "bg-cyan-950 text-cyan-300 border border-cyan-500/40"
                          : "bg-red-950 text-red-300 border border-red-500/40"
                      }`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onInspectApplication(app.id)}
                        className="px-2.5 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/40 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1"
                        title="View Full Application & KYC Docs"
                      >
                        <Eye size={12} /> Inspect Detail
                      </button>

                      {app.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => onQuickApprove(app.id)}
                            disabled={busy}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow-xs"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickRequestInfo(app.id)}
                            disabled={busy}
                            className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-200 font-bold text-[11px] rounded-lg"
                          >
                            Info
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickReject(app.id)}
                            disabled={busy}
                            className="px-2 py-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 font-bold text-[11px] rounded-lg"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {app.status === "needs_info" && (
                        <button
                          type="button"
                          onClick={() => onQuickApprove(app.id)}
                          disabled={busy}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg"
                        >
                          Approve
                        </button>
                      )}

                      {app.status === "approved" && (
                        <button
                          type="button"
                          onClick={() => onQuickRevoke(app.id)}
                          disabled={busy}
                          className="px-2 py-1 bg-[#041d17] hover:bg-red-950 text-slate-300 hover:text-red-300 text-[11px] rounded-lg border border-[#1a5e48]"
                        >
                          Revoke
                        </button>
                      )}

                      {app.status === "rejected" && (
                        <button
                          type="button"
                          onClick={() => onQuickApprove(app.id)}
                          disabled={busy}
                          className="px-2 py-1 bg-[#041d17] hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 text-[11px] rounded-lg border border-[#1a5e48]"
                        >
                          Re-Approve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default OrganizersTable;

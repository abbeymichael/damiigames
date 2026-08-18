"use client";

import React from "react";
import { UserCheck, RefreshCw } from "lucide-react";

export interface OrganizerProfileItem {
  userId: string;
  username?: string;
  status: "none" | "pending" | "approved" | "rejected" | "revoked";
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  organizationName?: string;
  bio?: string;
  contactPhone?: string;
}

export interface OrganizersTableProps {
  organizers: OrganizerProfileItem[];
  busy: boolean;
  onRefresh: () => void;
  onOrganizerAction: (userId: string, action: "approve" | "reject" | "revoke", reason?: string) => void;
}

export function OrganizersTable({
  organizers,
  busy,
  onRefresh,
  onOrganizerAction,
}: OrganizersTableProps) {
  return (
    <section className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1a5e48]">
        <div>
          <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
            <UserCheck size={18} className="text-[#d6a735]" /> Organizer Application Approval Queue
          </h3>
          <p className="text-xs text-slate-200 mt-1">
            Review player applications requesting tournament organizer status. Approved organizers can create and manage Damii leagues.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/30 rounded-xl text-xs font-bold flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Refresh Requests
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
              <th className="py-2.5 px-3">Applicant / Organization</th>
              <th className="py-2.5 px-3">Contact</th>
              <th className="py-2.5 px-3">Bio / Description</th>
              <th className="py-2.5 px-3">Requested At</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#114232]">
            {organizers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-300 italic">
                  No organizer applications found in queue.
                </td>
              </tr>
            ) : (
              organizers.map((org) => (
                <tr key={org.userId} className="hover:bg-[#0c3b2e]/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-[#f5efdf] text-sm">
                      {org.organizationName || org.username}
                    </div>
                    <div className="text-[11px] text-cyan-300 font-mono">
                      User: {org.username || org.userId}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-200 font-mono text-[11px]">
                    {org.contactPhone || "N/A"}
                  </td>
                  <td className="py-3 px-3 text-slate-200 max-w-xs truncate" title={org.bio}>
                    {org.bio || "No description provided"}
                  </td>
                  <td className="py-3 px-3 text-slate-200 font-mono text-[11px]">
                    {org.requestedAt ? new Date(org.requestedAt).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        org.status === "approved"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                          : org.status === "pending"
                          ? "bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse"
                          : org.status === "rejected"
                          ? "bg-red-950 text-red-300 border border-red-500/40"
                          : "bg-slate-800 text-slate-200"
                      }`}
                    >
                      {org.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {org.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => onOrganizerAction(org.userId, "approve")}
                            disabled={busy}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-all shadow-xs"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onOrganizerAction(org.userId, "reject", "Requirements not met")
                            }
                            disabled={busy}
                            className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 font-bold text-[11px] rounded-lg transition-all"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {org.status === "approved" && (
                        <button
                          type="button"
                          onClick={() =>
                            onOrganizerAction(org.userId, "revoke", "Revoked by admin")
                          }
                          disabled={busy}
                          className="px-2 py-1 bg-[#06261f] hover:bg-red-950 text-slate-200 hover:text-red-300 text-[11px] rounded-lg transition-all border border-[#1a5e48]"
                        >
                          Revoke
                        </button>
                      )}
                      {org.status === "rejected" && (
                        <button
                          type="button"
                          onClick={() => onOrganizerAction(org.userId, "approve")}
                          disabled={busy}
                          className="px-2 py-1 bg-[#06261f] hover:bg-emerald-950 text-slate-200 hover:text-emerald-300 text-[11px] rounded-lg transition-all border border-[#1a5e48]"
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

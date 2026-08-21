"use client";

import React, { useState } from "react";
import { Inbox, CheckCircle2, XCircle, Clock, AlertTriangle, MessageSquare, ShieldCheck } from "lucide-react";
import type { TournamentActionRequest } from "@/lib/types";

interface TournamentRequestsTableProps {
  requests: TournamentActionRequest[];
  busy: boolean;
  onRefresh: () => void;
  token: string;
}

export function TournamentRequestsTable({
  requests,
  busy,
  onRefresh,
  token,
}: TournamentRequestsTableProps) {
  const [filter, setFilter] = useState<string>("all");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<TournamentActionRequest | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [reviewNote, setReviewNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState("");

  const filtered = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  function handleOpenReview(req: TournamentActionRequest, defaultDecision: "approved" | "rejected") {
    setSelectedReq(req);
    setDecision(defaultDecision);
    setReviewNote("");
    setError("");
    setReviewModalOpen(true);
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReq) return;

    setActionBusy(true);
    setError("");

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "review_tournament_request",
          requestId: selectedReq.id,
          decision,
          reviewNote: reviewNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to submit review");

      setReviewModalOpen(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error submitting review");
    } finally {
      setActionBusy(false);
    }
  }

  const typeLabels: Record<string, { label: string; color: string }> = {
    cancel_tournament: { label: "Tournament Cancellation", color: "bg-red-950/80 text-red-300 border-red-500/40" },
    disqualify_player: { label: "Player Disqualification", color: "bg-amber-950/80 text-amber-300 border-amber-500/40" },
    result_override: { label: "Match Result Override", color: "bg-purple-950/80 text-purple-300 border-purple-500/40" },
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-[#081c15] border border-[#114232] rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
            <Inbox size={20} className="text-[#d6a735]" />
            Tournament Organizer Action Requests
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Review and approve or reject sensitive actions submitted by tournament facilitators (emergency cancellations, player disqualifications, and match dispute overrides).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["all", "pending", "approved", "rejected"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                filter === st
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "bg-[#06261f] text-slate-300 hover:bg-[#0c3b2e] border border-[#114232]"
              }`}
            >
              {st}
              {st === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="p-5 bg-[#081c15] border border-[#114232] rounded-2xl shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
                <th className="py-2.5 px-3">Request Type</th>
                <th className="py-2.5 px-3">Tournament &amp; Organizer</th>
                <th className="py-2.5 px-3">Reason / Context</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#114232]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-300 italic">
                    No tournament action requests found under &apos;{filter}&apos; filter.
                  </td>
                </tr>
              ) : (
                filtered.map((req, idx) => {
                  const typeMeta = typeLabels[req.requestType] || { label: req.requestType, color: "bg-[#06261f] text-slate-300 border-[#114232]" };
                  return (
                    <tr key={`${req.id || "req"}-${idx}`} className="hover:bg-[#0c3b2e]/50 transition-colors">
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${typeMeta.color}`}>
                          {typeMeta.label}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">
                          {new Date(req.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#f5efdf] text-xs">
                          {req.tournamentId}
                        </div>
                        <div className="text-[11px] text-emerald-400">
                          By: {req.organizerName || req.organizerId}
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="text-slate-200 text-xs line-clamp-2">
                          {req.reason}
                        </div>
                        {req.targetUserId && (
                          <div className="text-[10px] text-amber-300 font-mono mt-0.5">
                            Target Player: {req.targetUserId}
                          </div>
                        )}
                        {req.matchId && (
                          <div className="text-[10px] text-purple-300 font-mono mt-0.5">
                            Match: {req.matchId}
                          </div>
                        )}
                        {req.reviewNote && (
                          <div className="text-[11px] text-slate-400 italic mt-1 border-t border-[#114232] pt-1">
                            Note: {req.reviewNote}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase font-mono ${
                            req.status === "approved"
                              ? "bg-emerald-950/90 text-emerald-300 border border-emerald-500/40"
                              : req.status === "rejected"
                              ? "bg-red-950/90 text-red-300 border border-red-500/40"
                              : "bg-amber-950/90 text-amber-300 border border-amber-500/40 animate-pulse"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {req.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenReview(req, "approved")}
                              className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white text-xs font-bold rounded-lg border border-emerald-500/40 transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReview(req, "rejected")}
                              className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-white text-xs font-bold rounded-lg border border-red-500/40 transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {reviewModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-[#114232]">
              <div>
                <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#d6a735]" />
                  Review Action Request
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Confirm your decision and optionally attach a review note to the audit log.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="p-3 bg-[#041d17] border border-[#114232] rounded-xl text-xs space-y-1">
                <div className="text-slate-300 font-bold">Request: {selectedReq.requestType}</div>
                <div className="text-slate-400">Tournament: {selectedReq.tournamentId}</div>
                <div className="text-slate-400">Reason: {selectedReq.reason}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                  Decision *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDecision("approved")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      decision === "approved"
                        ? "bg-emerald-950 border-emerald-500 text-emerald-300 shadow-lg"
                        : "bg-[#06261f] border-[#114232] text-slate-400"
                    }`}
                  >
                    <CheckCircle2 size={16} /> Approve &amp; Execute
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision("rejected")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      decision === "rejected"
                        ? "bg-red-950 border-red-500 text-red-300 shadow-lg"
                        : "bg-[#06261f] border-[#114232] text-slate-400"
                    }`}
                  >
                    <XCircle size={16} /> Reject Request
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                  Review Note / Explanation (Optional)
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Approved per tournament regulation 4.2..."
                  className="w-full px-3 py-2 bg-[#041d17] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#114232]">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 text-xs font-bold rounded-xl border border-[#114232] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-lg border transition-all cursor-pointer disabled:opacity-50 ${
                    decision === "approved"
                      ? "bg-gradient-to-r from-emerald-600 to-[#114232] hover:from-emerald-500 border-emerald-500/30"
                      : "bg-gradient-to-r from-red-600 to-red-900 hover:from-red-500 border-red-500/30"
                  }`}
                >
                  {actionBusy ? "Processing..." : decision === "approved" ? "Confirm Approval" : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

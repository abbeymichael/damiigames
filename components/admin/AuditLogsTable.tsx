"use client";

import React from "react";
import { ScrollText } from "lucide-react";
import type { AdminLog } from "@/lib/types";

export interface AuditLogsTableProps {
  logs: AdminLog[];
}

export function AuditLogsTable({ logs }: AuditLogsTableProps) {
  return (
    <section className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-4">
      <div className="pb-3 border-b border-[#1a5e48]">
        <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
          <ScrollText size={18} className="text-[#d6a735]" /> System Audit Log Trail
        </h3>
        <p className="text-xs text-slate-200">
          Full immutable log of administrative actions, role updates, and dispute rulings.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Admin</th>
              <th className="py-2.5 px-3">Action</th>
              <th className="py-2.5 px-3">Target</th>
              <th className="py-2.5 px-3">Details JSON</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#114232]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-300 italic">
                  No audit logs recorded.
                </td>
              </tr>
            ) : (
              logs.map((l, idx) => (
                <tr key={`${l.id || "log"}-${idx}`} className="hover:bg-[#0c3b2e]/50">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-200 font-semibold">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[#f8fafc]">{l.adminName}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#d6a735]">{l.action}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-200">{l.target || "N/A"}</td>
                  <td className="py-2.5 px-3 font-mono text-[10px] text-slate-300 truncate max-w-xs">
                    {l.detailsJson}
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

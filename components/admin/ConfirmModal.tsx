"use client";

import React, { useState } from "react";
import { AlertTriangle, X, RefreshCw } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  warningNote?: string;
  details?: { label: string; value: string }[];
  confirmText?: string;
  confirmStyle?: "danger" | "warning" | "primary";
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  warningNote,
  details,
  confirmText = "Confirm Action",
  confirmStyle = "danger",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [executing, setExecuting] = useState(false);

  if (!isOpen) return null;

  async function handleConfirm() {
    setExecuting(true);
    try {
      await onConfirm();
    } finally {
      setExecuting(false);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[#081c15] border border-red-900/60 text-[#f5efdf] max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-start gap-3 border-b border-[#1a5e48] pb-4">
          <div className="p-2.5 bg-red-950/80 border border-red-500/30 rounded-xl text-red-400 shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base text-[#f5efdf]">{title}</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
          <button
            type="button"
            disabled={executing}
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#114232] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {warningNote && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-200 leading-relaxed">
            <span className="font-bold text-red-400">Warning: </span>
            {warningNote}
          </div>
        )}

        {details && details.length > 0 && (
          <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-1.5 text-xs">
            {details.map((d, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">{d.label}:</span>
                <span className="font-mono font-bold text-[#d6a735]">{d.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1a5e48]">
          <button
            type="button"
            disabled={executing}
            onClick={onClose}
            className="px-4 py-2 bg-[#0c3b2e] hover:bg-[#114232] text-slate-200 rounded-xl text-xs font-bold border border-[#1a5e48] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={executing}
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
              confirmStyle === "danger"
                ? "bg-red-600 hover:bg-red-500 text-white"
                : confirmStyle === "warning"
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f]"
            }`}
          >
            {executing && <RefreshCw size={12} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

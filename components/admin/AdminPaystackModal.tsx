"use client";

import { useEffect, useState, useRef } from "react";
import {
  X,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Lock,
  Coins,
  AlertCircle,
  Bot,
  Users,
  CreditCard,
  ExternalLink,
} from "lucide-react";

export interface AdminPaystackModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorizationUrl: string | null;
  reference: string | null;
  amountGhs: number;
  mode: "single" | "bulk";
  botName?: string;
  botUsername?: string;
  bulkCount?: number;
  bulkTier?: string;
  token: string;
  onSuccess: (reference: string, message?: string) => void;
}

export function AdminPaystackModal({
  isOpen,
  onClose,
  authorizationUrl,
  reference,
  amountGhs,
  mode,
  botName,
  botUsername,
  bulkCount,
  bulkTier,
  token,
  onSuccess,
}: AdminPaystackModalProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Background poller while modal is open
  useEffect(() => {
    if (!isOpen || !reference || isSuccess) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      if (!token) return;
      try {
        const action = mode === "bulk" ? "verify_bulk_bot_paystack_funding" : "verify_bot_paystack_funding";
        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            token,
            reference,
          }),
        });
        const data = await res.json();
        if (!isMounted) return;

        if (res.ok && data.success && !data.pending) {
          setIsSuccess(true);
          setTimeout(() => {
            onSuccess(
              reference,
              data.message ||
                (mode === "bulk"
                  ? `Successfully bulk-funded fleet mechanics via Paystack (GH₵ ${amountGhs.toFixed(2)})!`
                  : `Successfully credited GH₵ ${amountGhs.toFixed(2)} to ${botName || "mechanic"}!`)
            );
          }, 1400);
        }
      } catch {
        // Silently poll in background
      }
    }, 2800);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, reference, token, isSuccess, amountGhs, mode, botName, onSuccess]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setIframeLoading(true);
      setIsSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, authorizationUrl]);

  const handleManualVerify = async () => {
    if (!token || !reference || verifying) return;
    setVerifying(true);
    setErrorMessage(null);

    try {
      const action = mode === "bulk" ? "verify_bulk_bot_paystack_funding" : "verify_bot_paystack_funding";
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          token,
          reference,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.pending) {
          setErrorMessage("Payment is still pending on Paystack. Please approve the MoMo prompt on your phone.");
        } else {
          setIsSuccess(true);
          setTimeout(() => {
            onSuccess(
              reference,
              data.message ||
                (mode === "bulk"
                  ? `Successfully bulk-funded fleet mechanics via Paystack (GH₵ ${amountGhs.toFixed(2)})!`
                  : `Successfully credited GH₵ ${amountGhs.toFixed(2)} to ${botName || "mechanic"}!`)
            );
          }, 1200);
        }
      } else {
        setErrorMessage(data.error || "Payment not yet confirmed by Paystack. Please complete the checkout.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Manual verification failed");
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="admin-paystack-popup-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-xl md:max-w-2xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              {mode === "bulk" ? <Users size={20} /> : <Bot size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  {mode === "bulk"
                    ? `Paystack Fleet Float (${bulkCount ?? 0} Mechanics)`
                    : `Mechanic Bankroll: ${botName || "Bot"}`}
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                  <ShieldCheck size={11} /> 256-Bit Modal
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>
                  Total Float: <strong className="text-amber-300 font-mono">GH₵ {amountGhs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </span>
                <span>•</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Ref: {reference ? `${reference.slice(0, 16)}...` : "Connecting..."}
                </span>
              </p>
            </div>
          </div>

          <button
            id="admin-paystack-modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close payment modal"
            className="p-2 text-slate-400 hover:text-white bg-slate-800/70 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body: Embedded Paystack Frame or Success State */}
        <div className="relative flex-1 min-h-[490px] sm:min-h-[570px] bg-slate-950 flex flex-col">
          {isSuccess ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-200">
              <div className="w-18 h-18 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 mb-4 animate-bounce">
                <CheckCircle2 size={42} />
              </div>
              <h4 className="text-2xl font-black text-white">Payment Confirmed!</h4>
              <p className="text-sm text-slate-300 mt-2 max-w-md">
                {mode === "bulk" ? (
                  <>
                    Consolidated float of <strong className="text-white font-mono">GH₵ {amountGhs.toFixed(2)}</strong> has been verified and distributed across{" "}
                    <strong className="text-amber-300">{bulkCount} mechanics</strong>.
                  </>
                ) : (
                  <>
                    Bankroll float of <strong className="text-white font-mono">GH₵ {amountGhs.toFixed(2)}</strong> has been verified and added to{" "}
                    <strong className="text-amber-300">{botName}</strong> (@{botUsername}).
                  </>
                )}
              </p>
              <div className="mt-5 px-4 py-2 rounded-xl bg-slate-900 border border-emerald-600/40 text-xs font-mono text-emerald-300 flex items-center gap-2">
                <Lock size={12} />
                <span>Reference: {reference}</span>
              </div>
            </div>
          ) : (
            <>
              {iframeLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 gap-3 text-slate-400">
                  <RefreshCw size={32} className="animate-spin text-amber-400" />
                  <span className="text-xs font-medium tracking-wide">Connecting to Paystack Secure Checkout...</span>
                  <p className="text-[11px] text-slate-500">Preparing MoMo & Card checkout session</p>
                </div>
              )}

              {authorizationUrl ? (
                <iframe
                  ref={iframeRef}
                  src={authorizationUrl}
                  title="Paystack Admin Mechanic Checkout"
                  className="w-full h-full flex-1 border-0 rounded-none bg-white min-h-[490px] sm:min-h-[570px]"
                  allow="payment; camera; microphone"
                  onLoad={() => setIframeLoading(false)}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <AlertCircle size={32} className="text-amber-400 mb-2" />
                  <p className="text-sm text-white">Payment authorization URL was not received.</p>
                  <p className="text-xs text-slate-500 mt-1">Please close and re-initiate the payment.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info & manual verification */}
        {!isSuccess && (
          <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 text-center sm:text-left flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Modal listener active. Balance auto-credits immediately upon payment.</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleManualVerify}
                disabled={verifying}
                className="flex-1 sm:flex-initial py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} /> Verify Payment
                  </>
                )}
              </button>

              {authorizationUrl && (
                <a
                  href={authorizationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="If embedded iframe is blocked by browser policy, open in secure tab"
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline text-[11px]">External</span>
                </a>
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="px-4 py-2 bg-amber-950/80 border-t border-amber-800 text-amber-200 text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}

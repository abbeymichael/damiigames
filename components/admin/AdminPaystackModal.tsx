"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  X,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Lock,
  Bot,
  Users,
  CreditCard,
  ExternalLink,
  Smartphone,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { openPaystackInlinePopup } from "@/lib/paystack-client";

export interface AdminPaystackModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorizationUrl: string | null;
  reference: string | null;
  accessCode?: string | null;
  amountGhs: number;
  mode: "single" | "bulk";
  botName?: string;
  botUsername?: string;
  bulkCount?: number;
  bulkTier?: string;
  email?: string;
  token: string;
  onSuccess: (reference: string, message?: string) => void;
}

export function AdminPaystackModal({
  isOpen,
  onClose,
  authorizationUrl,
  reference,
  accessCode,
  amountGhs,
  mode,
  botName,
  botUsername,
  bulkCount,
  bulkTier,
  email,
  token,
  onSuccess,
}: AdminPaystackModalProps) {
  const [verifying, setVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [popupOpened, setPopupOpened] = useState(false);
  const hasTriggeredInitialPopup = useRef(false);

  // Manual or Callback verification
  const verifyPayment = useCallback(
    async (refToVerify: string, isSilent = false) => {
      if (!token || !refToVerify) return;
      if (!isSilent) setVerifying(true);
      setErrorMessage(null);

      try {
        const action = mode === "bulk" ? "verify_bulk_bot_paystack_funding" : "verify_bot_paystack_funding";
        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            token,
            reference: refToVerify,
          }),
        });
        const data = await res.json();

        if (res.ok && data.success && !data.pending) {
          setIsSuccess(true);
          setTimeout(() => {
            onSuccess(
              refToVerify,
              data.message ||
                (mode === "bulk"
                  ? `Successfully bulk-funded fleet mechanics via Paystack (GH₵ ${amountGhs.toFixed(2)})!`
                  : `Successfully credited GH₵ ${amountGhs.toFixed(2)} to ${botName || "mechanic"}!`)
            );
          }, 1400);
          return true;
        } else if (!isSilent && data.pending) {
          setErrorMessage("Payment authorization is still pending on Paystack. Complete the MoMo prompt on your phone.");
        } else if (!isSilent && !res.ok) {
          setErrorMessage(data.error || "Payment verification failed.");
        }
      } catch (err: any) {
        if (!isSilent) {
          setErrorMessage(err.message || "Manual verification failed.");
        }
      } finally {
        if (!isSilent) setVerifying(false);
      }
      return false;
    },
    [token, mode, amountGhs, botName, onSuccess]
  );

  // Helper to launch the Paystack native popup overlay
  const handleLaunchPopup = useCallback(async () => {
    if (!reference) return;
    setErrorMessage(null);
    setPopupOpened(true);

    const launched = await openPaystackInlinePopup({
      accessCode: accessCode || undefined,
      reference,
      authorizationUrl: authorizationUrl || undefined,
      email: email || undefined,
      amountGhs,
      onSuccess: (confirmedRef) => {
        verifyPayment(confirmedRef || reference, false);
      },
      onCancel: () => {
        // User closed or dismissed popup
      },
    });

    if (!launched && authorizationUrl) {
      // If inline JS is blocked by browser, notify user
      setErrorMessage("Popup blocked or not ready. You can click 'Open Checkout in New Tab' below or click 'Verify Payment'.");
    }
  }, [accessCode, reference, authorizationUrl, email, amountGhs, verifyPayment]);

  // Trigger popup once when modal opens
  useEffect(() => {
    if (isOpen && reference && !isSuccess && !hasTriggeredInitialPopup.current) {
      hasTriggeredInitialPopup.current = true;
      // Slight delay to allow smooth modal transition
      const timer = setTimeout(() => {
        handleLaunchPopup();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, reference, isSuccess, handleLaunchPopup]);

  // Background polling while modal is open to auto-verify
  useEffect(() => {
    if (!isOpen || !reference || isSuccess) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      if (!isMounted || !token) return;
      await verifyPayment(reference, true);
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, reference, token, isSuccess, verifyPayment]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setErrorMessage(null);
      setPopupOpened(false);
      hasTriggeredInitialPopup.current = false;
    }
  }, [isOpen, reference]);

  if (!isOpen) return null;

  return (
    <div
      id="admin-paystack-popup-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              {mode === "bulk" ? <Users size={20} /> : <Bot size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  {mode === "bulk"
                    ? `Paystack Fleet Float (${bulkCount ?? 0} Mechanics)`
                    : `Mechanic Bankroll: ${botName || "Bot"}`}
                </h3>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>
                  Total Float:{" "}
                  <strong className="text-amber-300 font-mono">
                    GH₵ {amountGhs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
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

        {/* Modal Body */}
        <div className="p-6 bg-slate-950 flex flex-col items-center text-center">
          {isSuccess ? (
            <div className="py-6 flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 mb-4 animate-bounce">
                <CheckCircle2 size={44} />
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
            <div className="w-full flex flex-col items-center gap-5">
              {/* Paystack Popup Hero Card */}
              <div className="w-full p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/80 border border-slate-800 flex flex-col items-center">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Paystack Popup Gateway</span>
                </div>

                <h4 className="text-lg font-bold text-white mb-1">
                  Complete Payment in Paystack Popup
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  The Paystack checkout popup will open on your screen to pay via <strong className="text-slate-200">MTN MoMo, Telecel Cash, AT Money, or Bank Card</strong>.
                </p>

                {/* Main Launch Button */}
                <button
                  type="button"
                  onClick={handleLaunchPopup}
                  className="w-full max-w-xs py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/20 transition-all transform active:scale-95"
                >
                  <CreditCard size={18} />
                  <span>Open Paystack Popup</span>
                  <ArrowRight size={16} />
                </button>

                <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Smartphone size={12} className="text-amber-400" /> MoMo / Cards
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <ShieldCheck size={12} /> 256-bit Encrypted
                  </span>
                </div>
              </div>

              {/* Status & Details */}
              <div className="w-full grid grid-cols-2 gap-3 text-left">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Amount to Pay</span>
                  <div className="text-base font-mono font-bold text-amber-300 mt-0.5">
                    GH₵ {amountGhs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Target Fleet</span>
                  <div className="text-xs font-semibold text-white truncate mt-0.5">
                    {mode === "bulk" ? `${bulkCount} Mechanics (${bulkTier || "All"})` : botName || "Mechanic"}
                  </div>
                </div>
              </div>

              {/* Live listener indicator */}
              <div className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400">
                <RefreshCw size={12} className="animate-spin text-amber-400" />
                <span>Listening for real-time payment confirmation...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isSuccess && (
          <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => reference && verifyPayment(reference, false)}
              disabled={verifying}
              className="w-full sm:w-auto py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Verifying with Paystack...
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} /> Verify Payment Now
                </>
              )}
            </button>

            {authorizationUrl && (
              <a
                href={authorizationUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="If popups are disabled in your browser, open in new tab"
                className="w-full sm:w-auto py-2.5 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={13} />
                <span>Open Checkout in New Tab</span>
              </a>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="px-5 py-2.5 bg-amber-950/90 border-t border-amber-800 text-amber-200 text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}

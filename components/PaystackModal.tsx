"use client";

import { useEffect, useState, useRef } from "react";
import {
  X,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Lock,
  ExternalLink,
  Coins,
  AlertCircle,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/client-auth";

export interface PaystackModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorizationUrl: string;
  reference: string;
  amountGhs: number;
  points: number;
  token: string | null;
  onSuccess: (reference: string, message?: string) => void;
}

export function PaystackModal({
  isOpen,
  onClose,
  authorizationUrl,
  reference,
  amountGhs,
  points,
  token,
  onSuccess,
}: PaystackModalProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Poll for verification in the background while modal is open
  useEffect(() => {
    if (!isOpen || !reference || isSuccess) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      if (!token) return;
      try {
        const res = await fetch("/api/wallet", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            action: "verify",
            token,
            reference,
          }),
        });
        const data = await res.json();
        if (!isMounted) return;

        if (res.ok && data.success && !data.pending) {
          setIsSuccess(true);
          setTimeout(() => {
            onSuccess(reference, data.message || `GH₵ ${amountGhs}.00 added successfully!`);
          }, 1500);
        }
      } catch {
        // Continue polling silently
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, reference, token, isSuccess, amountGhs, onSuccess]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setIframeLoading(true);
      setIsSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, authorizationUrl]);

  async function handleManualVerify() {
    if (!token || !reference || verifying) return;
    setVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "verify",
          token,
          reference,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.pending) {
          setErrorMessage("Payment authorization is still pending on Paystack. Complete the prompt on your phone.");
        } else {
          setIsSuccess(true);
          setTimeout(() => {
            onSuccess(reference, data.message || `GH₵ ${amountGhs}.00 credited successfully!`);
          }, 1200);
        }
      } else {
        setErrorMessage(data.error || "Unable to verify payment status yet. Please ensure payment is completed.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      id="paystack-popup-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg md:max-w-xl bg-[#07241d] border border-[#1a5e48] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-[#051c17] border-b border-[#144737]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0c3b2e] border border-[#1a5e48] flex items-center justify-center text-[#d6a735]">
              <Lock size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Paystack Secure Checkout
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                  <ShieldCheck size={11} /> 256-bit Encrypted
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Top-up: <strong className="text-white">GH₵ {amountGhs}.00</strong></span>
                <span>•</span>
                <span className="text-[#d6a735] font-semibold flex items-center gap-1">
                  <Coins size={12} /> {points} Marbles
                </span>
              </p>
            </div>
          </div>

          <button
            id="paystack-modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close payment popup"
            className="p-1.5 text-slate-400 hover:text-white bg-[#0c3b2e]/60 hover:bg-[#0c3b2e] rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body: Embedded Paystack Frame or Success State */}
        <div className="relative flex-1 min-h-[480px] sm:min-h-[560px] bg-[#031511] flex flex-col">
          {isSuccess ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 mb-4 animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <h4 className="text-xl font-black text-white">Payment Confirmed!</h4>
              <p className="text-sm text-slate-300 mt-2 max-w-sm">
                Your top-up of <span className="text-white font-bold">GH₵ {amountGhs}.00</span> has been verified and added to your wallet.
              </p>
              <div className="mt-4 px-4 py-2 rounded-xl bg-[#0c3b2e] border border-emerald-600/40 text-xs font-mono text-emerald-300">
                Ref: {reference}
              </div>
            </div>
          ) : (
            <>
              {iframeLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#031511] gap-3 text-slate-400">
                  <RefreshCw size={28} className="animate-spin text-[#d6a735]" />
                  <span className="text-xs font-medium tracking-wide">Connecting to Paystack...</span>
                </div>
              )}

              {authorizationUrl ? (
                <iframe
                  ref={iframeRef}
                  src={authorizationUrl}
                  title="Paystack Checkout"
                  className="w-full h-full flex-1 border-0 rounded-none bg-white min-h-[480px] sm:min-h-[560px]"
                  allow="payment; camera; microphone"
                  onLoad={() => setIframeLoading(false)}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <AlertCircle size={32} className="text-amber-400 mb-2" />
                  <p className="text-sm">Payment authorization URL not found.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info & manual verification */}
        {!isSuccess && (
          <div className="px-4 py-3 bg-[#051c17] border-t border-[#144737] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 text-center sm:text-left flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-time listener active. Popup auto-confirms when paid.</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleManualVerify}
                disabled={verifying}
                className="flex-1 sm:flex-initial py-2 px-3.5 bg-[#0c3b2e] hover:bg-[#114a3a] text-emerald-300 text-xs font-bold rounded-lg border border-[#1a5e48] flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
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

              <a
                href={authorizationUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="If popup fails to render, open in window"
                className="py-2 px-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs rounded-lg transition-colors flex items-center justify-center"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="px-4 py-2 bg-amber-950/80 border-t border-amber-800 text-amber-200 text-xs text-center">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}

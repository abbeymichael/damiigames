/**
 * Paystack Client Inline helper for on-page native popups
 */

export interface PaystackPopupOptions {
  accessCode?: string;
  reference: string;
  authorizationUrl?: string;
  email?: string;
  amountGhs?: number;
  publicKey?: string;
  onSuccess?: (reference: string) => void;
  onCancel?: () => void;
}

let scriptLoadingPromise: Promise<boolean> | null = null;

export function loadPaystackScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as any).PaystackPop) return Promise.resolve(true);

  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise<boolean>((resolve) => {
    // Check if already in DOM
    const existing = document.getElementById("paystack-inline-js") as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).PaystackPop) {
        resolve(true);
        return;
      }
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.id = "paystack-inline-js";
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      // Try fallback to v1 inline
      const fallback = document.createElement("script");
      fallback.id = "paystack-inline-v1-js";
      fallback.src = "https://js.paystack.co/v1/inline.js";
      fallback.async = true;
      fallback.onload = () => resolve(true);
      fallback.onerror = () => resolve(false);
      document.body.appendChild(fallback);
    };

    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * Attempts to launch the native Paystack Pop popup directly on the page.
 * Returns true if the native popup opened, or false if not supported.
 */
export async function openPaystackInlinePopup(options: PaystackPopupOptions): Promise<boolean> {
  try {
    const loaded = await loadPaystackScript();
    const PaystackPop = typeof window !== "undefined" ? (window as any).PaystackPop : null;

    if (!loaded || !PaystackPop) {
      console.warn("Paystack inline library not loaded.");
      return false;
    }

    const publicKey = options.publicKey || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";
    const email = options.email || "admin@damii.game";
    const amountPesewas = options.amountGhs ? Math.round(options.amountGhs * 100) : undefined;

    // 1. Try modern PaystackPop v2 with accessCode (resumeTransaction)
    if (typeof PaystackPop === "function" && options.accessCode) {
      try {
        const popup = new PaystackPop();
        if (typeof popup.resumeTransaction === "function") {
          popup.resumeTransaction(options.accessCode, {
            onSuccess: (transaction: any) => {
              const ref = transaction?.reference || transaction?.trxref || options.reference;
              options.onSuccess?.(ref);
            },
            onCancel: () => {
              options.onCancel?.();
            },
          });
          return true;
        }
      } catch (e) {
        console.warn("PaystackPop.resumeTransaction failed, trying alternative methods:", e);
      }
    }

    // 2. Try modern PaystackPop v2 newTransaction
    if (typeof PaystackPop === "function") {
      try {
        const popup = new PaystackPop();
        if (typeof popup.newTransaction === "function") {
          popup.newTransaction({
            key: publicKey,
            email,
            amount: amountPesewas,
            reference: options.reference,
            accessCode: options.accessCode,
            onSuccess: (transaction: any) => {
              const ref = transaction?.reference || transaction?.trxref || options.reference;
              options.onSuccess?.(ref);
            },
            onCancel: () => {
              options.onCancel?.();
            },
          });
          return true;
        }
      } catch (e) {
        console.warn("PaystackPop.newTransaction failed, trying v1 setup:", e);
      }
    }

    // 3. Try PaystackPop.setup (v1 or legacy API)
    if (typeof PaystackPop.setup === "function") {
      try {
        const handler = PaystackPop.setup({
          key: publicKey,
          access_code: options.accessCode,
          ref: options.reference,
          email,
          amount: amountPesewas,
          currency: "GHS",
          callback: (response: any) => {
            const ref = response?.reference || response?.trxref || options.reference;
            options.onSuccess?.(ref);
          },
          onClose: () => {
            options.onCancel?.();
          },
        });

        if (handler && typeof handler.openIframe === "function") {
          handler.openIframe();
          return true;
        }
      } catch (e) {
        console.warn("PaystackPop.setup failed:", e);
      }
    }

    return false;
  } catch (err) {
    console.warn("Failed to open Paystack inline popup:", err);
    return false;
  }
}


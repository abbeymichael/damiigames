/**
 * Paystack Client Inline helper for on-page popups
 */

export interface PaystackPopupOptions {
  accessCode?: string;
  reference: string;
  authorizationUrl?: string;
  email?: string;
  amountGhs?: number;
  onSuccess?: (reference: string) => void;
  onCancel?: () => void;
}

let scriptLoadingPromise: Promise<boolean> | null = null;

export function loadPaystackScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as any).PaystackPop) return Promise.resolve(true);

  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise<boolean>((resolve) => {
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
 * Attempts to launch the native Paystack Pop popup right on the page.
 * Returns true if the native popup opened, or false if on-page modal iframe should be displayed.
 */
export async function openPaystackInlinePopup(options: PaystackPopupOptions): Promise<boolean> {
  try {
    const loaded = await loadPaystackScript();
    const PaystackPop = typeof window !== "undefined" ? (window as any).PaystackPop : null;

    if (!loaded || !PaystackPop) {
      return false;
    }

    // Modern PaystackPop v2 with accessCode
    if (typeof PaystackPop === "function" && options.accessCode) {
      try {
        const popup = new PaystackPop();
        if (typeof popup.resumeTransaction === "function") {
          popup.resumeTransaction(options.accessCode, {
            onSuccess: (transaction: any) => {
              const ref = transaction?.reference || options.reference;
              options.onSuccess?.(ref);
            },
            onCancel: () => {
              options.onCancel?.();
            },
          });
          return true;
        }
      } catch (e) {
        console.warn("PaystackPop.resumeTransaction failed:", e);
      }
    }

    // PaystackPop.setup (v1 or legacy API)
    if (typeof PaystackPop.setup === "function") {
      try {
        const handler = PaystackPop.setup({
          key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
          access_code: options.accessCode,
          ref: options.reference,
          email: options.email,
          amount: options.amountGhs ? Math.round(options.amountGhs * 100) : undefined,
          callback: (response: any) => {
            const ref = response?.reference || options.reference;
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

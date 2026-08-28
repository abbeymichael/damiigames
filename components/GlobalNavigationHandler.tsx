"use client";

import { useEffect } from "react";

export function GlobalNavigationHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Intercept console.error for benign vinext RSC fetch errors during dev hot-reloads
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      try {
        const text = args
          .map((a) => {
            if (typeof a === "string") return a;
            if (a instanceof Error) return a.message + " " + (a.stack || "");
            if (a && typeof a === "object" && "message" in a) return String((a as { message: unknown }).message);
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          })
          .join(" ");

        if (
          text.includes("RSC navigation error") ||
          text.includes("[vinext]") ||
          text.includes("vite-rsc") ||
          text.includes("error loading dynamically imported module") ||
          text.includes("NetworkError when attempting to fetch resource")
        ) {
          console.warn("[damii] Handled RSC navigation warning gracefully:", ...args);
          return;
        }
      } catch {
        // Fallback to original
      }
      originalConsoleError.apply(console, args);
    };

    // 2. Intercept unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === "string"
          ? reason
          : reason?.message || (reason ? String(reason) : "");

      if (
        message.includes("RSC navigation error") ||
        message.includes("[vinext]") ||
        message.includes("vite-rsc") ||
        message.includes("error loading dynamically imported module") ||
        message.includes("NetworkError when attempting to fetch resource") ||
        message.includes("NetworkError")
      ) {
        if (
          message.includes("error loading dynamically imported module") ||
          message.includes("Failed to fetch dynamically imported module")
        ) {
          const lastReload = sessionStorage.getItem("damii_dyn_reload");
          const now = Date.now();
          if (!lastReload || now - Number(lastReload) > 8000) {
            sessionStorage.setItem("damii_dyn_reload", String(now));
            window.location.reload();
          }
        }
      }
    };

    // 3. Intercept global runtime errors
    const handleError = (event: ErrorEvent) => {
      const message = event.message || "";
      if (
        message.includes("RSC navigation error") ||
        message.includes("[vinext]") ||
        message.includes("vite-rsc") ||
        message.includes("error loading dynamically imported module") ||
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("NetworkError when attempting to fetch resource") ||
        message.includes("NetworkError")
      ) {
        event.preventDefault();
        console.warn("[damii] Handled dynamic import error gracefully:", message);
        if (
          message.includes("error loading dynamically imported module") ||
          message.includes("Failed to fetch dynamically imported module")
        ) {
          const lastReload = sessionStorage.getItem("damii_dyn_reload");
          const now = Date.now();
          if (!lastReload || now - Number(lastReload) > 8000) {
            sessionStorage.setItem("damii_dyn_reload", String(now));
            window.location.reload();
          }
        }
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}

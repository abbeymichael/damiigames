"use client";

import { useEffect } from "react";

export function GlobalNavigationHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === "string"
          ? reason
          : reason?.message || (reason ? String(reason) : "");

      if (
        message.includes("RSC navigation error") ||
        message.includes("[vinext]") ||
        message.includes("NetworkError when attempting to fetch resource")
      ) {
        // Prevent default error overlay from breaking UX
        event.preventDefault();
        console.warn("[damii] Handled RSC navigation rejection gracefully:", message);
      }
    };

    const handleError = (event: ErrorEvent) => {
      const message = event.message || "";
      if (
        message.includes("RSC navigation error") ||
        message.includes("[vinext]") ||
        message.includes("NetworkError when attempting to fetch resource")
      ) {
        event.preventDefault();
        console.warn("[damii] Handled RSC navigation runtime error gracefully:", message);
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}

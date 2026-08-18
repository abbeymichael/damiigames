"use client";

// Client-side authentication & header helper for DAMII

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("damii_session_token") ||
    localStorage.getItem("damii_token") ||
    localStorage.getItem("damii-player-token") ||
    sessionStorage.getItem("damii_session_token")
  );
}

export function saveSessionToken(token: string, csrfToken?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("damii_session_token", token);
  localStorage.setItem("damii_token", token);
  localStorage.setItem("damii-player-token", token);
  sessionStorage.setItem("damii_session_token", token);
  if (csrfToken) {
    saveCsrfToken(csrfToken);
  }
}

export function saveCsrfToken(csrfToken: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("damii_csrf_token", csrfToken);
  sessionStorage.setItem("damii_csrf_token", csrfToken);
}

export function getCsrfToken(): string | null {
  if (typeof window === "undefined") return null;

  // 1. Check document.cookie for damii_csrf
  const match = document.cookie.match(/(?:^|; )damii_csrf=([^;]*)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }

  // 2. Fallback to localStorage & sessionStorage
  return localStorage.getItem("damii_csrf_token") || sessionStorage.getItem("damii_csrf_token");
}

export function clearSessionToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("damii_session_token");
  localStorage.removeItem("damii_token");
  localStorage.removeItem("damii-player-token");
  localStorage.removeItem("damii-player-name");
  localStorage.removeItem("damii-auth-user");
  localStorage.removeItem("damii_csrf_token");
  sessionStorage.removeItem("damii_session_token");
  document.cookie = "damii_session=; path=/; max-age=0";
  document.cookie = "damii_csrf=; path=/; max-age=0";
}

export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getSessionToken();
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["x-session-token"] = token;
  }

  if (csrfToken) {
    headers["x-csrf-token"] = csrfToken;
  }

  return headers;
}

export async function rotateSessionToken(): Promise<{ success: boolean; token?: string; csrfToken?: string; error?: string }> {
  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "rotate_session" }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      saveSessionToken(data.token, data.csrfToken);
      return { success: true, token: data.token, csrfToken: data.csrfToken };
    }
    return { success: false, error: data.error || "Failed to rotate session" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function revokeAllSessions(exceptCurrent = false): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "revoke_all_sessions", exceptCurrent }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (!exceptCurrent) {
        clearSessionToken();
      }
      return { success: true, count: data.count };
    }
    return { success: false, error: data.error || "Failed to revoke sessions" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

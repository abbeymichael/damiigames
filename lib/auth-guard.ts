import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "./db-client";
import { Profile, Role, AdminPermission, Session } from "./types";
import { securityService } from "./security";

export interface AuthContext {
  token: string;
  session?: Session;
  user: Profile;
  role: Role;
  isSuperAdmin: boolean;
  permissions: AdminPermission[];
  ip: string;
  userAgent: string;
}

export function extractTokenFromRequest(req: NextRequest): string {
  // 1. Check HttpOnly session cookie first
  const cookieSession = req.cookies.get("damii_session")?.value;
  if (cookieSession) return cookieSession.trim();

  // 2. Check Authorization header
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      return parts[1].trim();
    }
    return authHeader.trim();
  }

  // 3. Check custom x-session-token header
  const sessionHeader = req.headers.get("x-session-token");
  if (sessionHeader) return sessionHeader.trim();

  // 4. Fallback to search query param
  const { searchParams } = new URL(req.url);
  const paramToken = searchParams.get("token") || searchParams.get("sessionToken");
  if (paramToken) return paramToken.trim();

  return "";
}

/**
 * Validates CSRF token for state-changing HTTP requests (POST, PUT, DELETE, PATCH).
 */
export function validateCsrfToken(req: NextRequest, session?: Session | null) {
  const method = req.method.toUpperCase();
  const isStateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(method);
  if (!isStateChanging) return;

  // Skip CSRF check for automated external webhook endpoints (signature verified separately)
  const pathname = new URL(req.url).pathname;
  if (pathname.includes("/webhook") || pathname.includes("/paystack-webhook")) {
    return;
  }

  const clientCsrf =
    req.headers.get("x-csrf-token") ||
    req.headers.get("X-CSRF-Token") ||
    req.headers.get("x-xsrf-token") ||
    new URL(req.url).searchParams.get("csrfToken");

  const expectedCsrf = session?.csrfToken || req.cookies.get("damii_csrf")?.value;

  // If a session or CSRF cookie exists, CSRF token verification is required
  if (expectedCsrf) {
    if (!clientCsrf || !securityService.timingSafeCompare(clientCsrf, expectedCsrf)) {
      throw new AuthError("CSRF validation failed: Invalid or missing CSRF token", 403);
    }
  }
}

/**
 * Sets secure HttpOnly session cookie and CSRF token cookie on a NextResponse
 */
export function attachAuthCookies(
  res: NextResponse,
  sessionToken: string,
  csrfToken?: string
): NextResponse {
  const isProd = process.env.NODE_ENV === "production";

  res.cookies.set("damii_session", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    secure: isProd,
  });

  if (csrfToken) {
    res.cookies.set("damii_csrf", csrfToken, {
      httpOnly: false, // Accessible by client JS to include in x-csrf-token headers
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      secure: isProd,
    });
  }

  return res;
}

/**
 * Clears HttpOnly session and CSRF cookies on a NextResponse
 */
export function clearAuthCookies(res: NextResponse): NextResponse {
  res.cookies.delete("damii_session");
  res.cookies.delete("damii_csrf");
  return res;
}

export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const token = extractTokenFromRequest(req);
  if (!token) return null;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "Unknown";

  // Check if token is a valid session token
  const session = await dbRepository.getSession(token);
  let userToken = token;
  if (session) {
    userToken = session.userId;
  }

  // Validate CSRF for state-changing requests
  validateCsrfToken(req, session);

  const user = await dbRepository.getProfile(userToken);
  if (!user || user.status === "banned") return null;

  // Fetch admin profile permissions if applicable
  const adminProf = await dbRepository.getAdminProfile(user.token);
  const isSuperAdmin = user.role === "super_admin" || Boolean(adminProf?.isSuperAdmin);
  const permissions: AdminPermission[] = adminProf?.permissions || (
    isSuperAdmin
      ? [
          "manage_users",
          "manage_organizers",
          "manage_tournaments",
          "manage_wallet",
          "manage_payouts",
          "resolve_disputes",
          "manage_admins",
          "run_seeder",
          "view_audit_log",
        ]
      : []
  );

  return {
    token,
    session: session || undefined,
    user,
    role: user.role,
    isSuperAdmin,
    permissions,
    ip,
    userAgent,
  };
}

export async function requireAuth(req: NextRequest): Promise<AuthContext> {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    throw new AuthError("Unauthorized access. Valid session required.", 401);
  }
  return ctx;
}

export async function requireRole(req: NextRequest, allowedRoles: Role[]): Promise<AuthContext> {
  const ctx = await requireAuth(req);
  if (!allowedRoles.includes(ctx.role) && !ctx.isSuperAdmin) {
    throw new AuthError(`Forbidden. Role '${ctx.role}' does not have required access.`, 403);
  }
  return ctx;
}

export async function requireAdminPermission(req: NextRequest, permission: AdminPermission): Promise<AuthContext> {
  const ctx = await requireAuth(req);
  if (ctx.isSuperAdmin) return ctx;

  if (!["admin", "super_admin", "treasurer", "facilitator"].includes(ctx.role)) {
    throw new AuthError("Forbidden. Administrative access required.", 403);
  }

  if (!ctx.permissions.includes(permission)) {
    throw new AuthError(`Forbidden. Missing required permission '${permission}'.`, 403);
  }

  return ctx;
}

export const requirePermission = requireAdminPermission;

export async function getSessionFromRequest(req: NextRequest) {
  return getAuthContext(req);
}

export async function requireApprovedOrganizer(req: NextRequest): Promise<AuthContext> {
  const ctx = await requireAuth(req);
  if (ctx.isSuperAdmin || ["admin", "facilitator"].includes(ctx.role)) {
    return ctx;
  }
  const orgProfile = await dbRepository.getOrganizerProfile(ctx.user.token);
  if (!orgProfile || orgProfile.status !== "approved") {
    throw new AuthError("Forbidden. Approved organizer privileges required.", 403);
  }
  return ctx;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}

export function handleAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Internal server error" },
    { status: 500 }
  );
}

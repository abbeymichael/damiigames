import { and, eq } from "drizzle-orm";
import { getDb } from "./db/mysql-connection";
import * as schema from "../db/schema.mysql";
import type { Permission, AppRole } from "./types";
import { SYSTEM_PERMISSIONS, SEED_ROLES_CONFIG } from "./permissions-constants";

export { SYSTEM_PERMISSIONS, SEED_ROLES_CONFIG };

/**
 * Checks if a user has a specific permission key.
 *
 * Checks:
 * 1. User must exist and have role = "admin" (or super_admin).
 * 2. If user holds any role where `isSystemRole === true` (Super Admin), returns true.
 * 3. Checks if user holds any assigned role that contains the specific permission key.
 */
export async function hasPermission(userId: string, key: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const db = getDb();

    // Check user account or profile
    const [user] = await db
      .select({ role: schema.profiles.role, status: schema.profiles.status })
      .from(schema.profiles)
      .where(eq(schema.profiles.token, userId))
      .limit(1);

    if (!user || user.status === "banned") return false;

    // Super Admin role bypasses granular checks immediately
    if (user.role === "super_admin") return true;

    // Check if the user has a Super Admin system role assigned
    const systemRoleRows = await db
      .select({ isSystemRole: schema.roles.isSystemRole })
      .from(schema.adminUserRoles)
      .innerJoin(schema.roles, eq(schema.roles.id, schema.adminUserRoles.roleId))
      .where(
        and(
          eq(schema.adminUserRoles.userId, userId),
          eq(schema.roles.isSystemRole, 1)
        )
      );

    if (systemRoleRows.length > 0) return true;

    // Check granular permission match
    const [match] = await db
      .select({ id: schema.permissions.id })
      .from(schema.adminUserRoles)
      .innerJoin(
        schema.rolePermissions,
        eq(schema.rolePermissions.roleId, schema.adminUserRoles.roleId)
      )
      .innerJoin(
        schema.permissions,
        eq(schema.permissions.id, schema.rolePermissions.permissionId)
      )
      .where(
        and(
          eq(schema.adminUserRoles.userId, userId),
          eq(schema.permissions.key, key)
        )
      )
      .limit(1);

    if (match) return true;

    // Legacy fallback check for profile.role permissions
    if (user.role === "admin") {
      // General admin has review + operations access by default
      const defaultAdminKeys = [
        "organizers.review",
        "disputes.resolve",
        "tournaments.requests",
        "tournaments.manage",
        "games.manage",
        "wallet.view",
        "limits.manage",
        "users.view",
        "users.suspend",
        "audit.view",
        "system.settings.view",
      ];
      if (defaultAdminKeys.includes(key)) return true;
    } else if (user.role === "treasurer") {
      const treasurerKeys = ["wallet.view", "wallet.payouts", "ledger.adjust", "limits.manage", "audit.view"];
      if (treasurerKeys.includes(key)) return true;
    } else if (user.role === "facilitator") {
      const facilitatorKeys = ["tournaments.manage", "organizers.review", "audit.view"];
      if (facilitatorKeys.includes(key)) return true;
    }

    return false;
  } catch (err) {
    console.error(`[damii][permissions] hasPermission check error for ${userId} on ${key}:`, err);
    return false;
  }
}

/**
 * Retrieves all permission keys and Super Admin status for an admin user.
 */
export async function getAdminPermissions(userId: string): Promise<{
  isSuperAdmin: boolean;
  permissionKeys: string[];
}> {
  if (!userId) {
    return { isSuperAdmin: false, permissionKeys: [] };
  }

  try {
    const db = getDb();

    const [profile] = await db
      .select({ role: schema.profiles.role })
      .from(schema.profiles)
      .where(eq(schema.profiles.token, userId))
      .limit(1);

    if (profile?.role === "super_admin") {
      return {
        isSuperAdmin: true,
        permissionKeys: SYSTEM_PERMISSIONS.map((p) => p.key),
      };
    }

    // Check assigned roles
    const assignedRoles = await db
      .select({
        roleId: schema.roles.id,
        isSystemRole: schema.roles.isSystemRole,
      })
      .from(schema.adminUserRoles)
      .innerJoin(schema.roles, eq(schema.roles.id, schema.adminUserRoles.roleId))
      .where(eq(schema.adminUserRoles.userId, userId));

    const hasSuperAdminRole = assignedRoles.some((r) => r.isSystemRole === 1);
    if (hasSuperAdminRole) {
      return {
        isSuperAdmin: true,
        permissionKeys: SYSTEM_PERMISSIONS.map((p) => p.key),
      };
    }

    const permissionRows = await db
      .select({ key: schema.permissions.key })
      .from(schema.adminUserRoles)
      .innerJoin(
        schema.rolePermissions,
        eq(schema.rolePermissions.roleId, schema.adminUserRoles.roleId)
      )
      .innerJoin(
        schema.permissions,
        eq(schema.permissions.id, schema.rolePermissions.permissionId)
      )
      .where(eq(schema.adminUserRoles.userId, userId));

    const keysSet = new Set(permissionRows.map((r) => r.key));

    // Fallbacks if no explicit RBAC assignment yet
    if (profile?.role === "admin") {
      [
        "organizers.review",
        "disputes.resolve",
        "tournaments.requests",
        "tournaments.manage",
        "games.manage",
        "wallet.view",
        "limits.manage",
        "users.view",
        "users.suspend",
        "audit.view",
        "system.settings.view",
      ].forEach((k) => keysSet.add(k));
    } else if (profile?.role === "treasurer") {
      ["wallet.view", "wallet.payouts", "ledger.adjust", "limits.manage", "audit.view"].forEach((k) =>
        keysSet.add(k)
      );
    }

    return {
      isSuperAdmin: false,
      permissionKeys: Array.from(keysSet),
    };
  } catch (err) {
    console.error(`[damii][permissions] getAdminPermissions error for ${userId}:`, err);
    return { isSuperAdmin: false, permissionKeys: [] };
  }
}

import { and, eq } from "drizzle-orm";
import { getDb } from "./db/mysql-connection";
import * as schema from "../db/schema.mysql";
import type { Permission, AppRole } from "./types";
import { SYSTEM_PERMISSIONS, SEED_ROLES_CONFIG } from "./permissions-constants";
import { dbRepository } from "./db-client";

export { SYSTEM_PERMISSIONS, SEED_ROLES_CONFIG };

/**
 * Checks if a user has a specific permission key.
 *
 * Checks:
 * 1. User must exist and not be banned.
 * 2. If user role === "super_admin" or holds any Super Admin system role, returns true immediately.
 * 3. Checks if user holds any assigned RBAC role that contains the specific permission key.
 * 4. Safe fallback for default roles (admin, treasurer, facilitator) across both MySQL and memory storage.
 */
export async function hasPermission(userId: string, key: string): Promise<boolean> {
  if (!userId) return false;

  try {
    // 1. First check profile status & role via repository or db
    const profile = await dbRepository.getProfile(userId).catch(() => null);
    if (!profile || profile.status === "banned") return false;

    // Super Admin role bypasses granular checks immediately
    if (profile.role === "super_admin") return true;

    // 2. Check assigned roles & permissions from repository
    try {
      const assignedRoleIds = await dbRepository.getAdminUserRoleAssignments(userId).catch(() => []);
      if (assignedRoleIds && assignedRoleIds.length > 0) {
        const allRoles = await dbRepository.listRoles().catch(() => []);
        const userRoles = allRoles.filter((r) => assignedRoleIds.includes(r.id));

        // If user holds any system role (Super Admin), grant all
        if (userRoles.some((r) => r.isSystemRole)) return true;

        // Check if any assigned role contains the requested key
        for (const role of userRoles) {
          if (role.permissionKeys?.includes(key)) {
            return true;
          }
        }
      }
    } catch {
      // Fall through to database query or legacy fallback
    }

    // 3. If MySQL DB is available, check direct join tables
    try {
      const db = getDb();

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
    } catch {
      // Ignore DB query errors if running in memory mode
    }

    // 4. Default fallback checks based on profile.role
    if (profile.role === "admin") {
      const defaultAdminKeys = [
        "organizers.review",
        "organizers.revoke",
        "disputes.resolve",
        "tournaments.requests",
        "tournaments.manage",
        "games.manage",
        "wallet.view",
        "limits.manage",
        "users.view",
        "users.suspend",
        "admins.view",
        "roles.view",
        "audit.view",
        "system.settings.view",
      ];
      if (defaultAdminKeys.includes(key)) return true;
    } else if (profile.role === "treasurer") {
      const treasurerKeys = ["wallet.view", "wallet.payouts", "ledger.adjust", "limits.manage", "audit.view"];
      if (treasurerKeys.includes(key)) return true;
    } else if (profile.role === "facilitator") {
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
    const profile = await dbRepository.getProfile(userId).catch(() => null);

    if (profile?.role === "super_admin") {
      return {
        isSuperAdmin: true,
        permissionKeys: SYSTEM_PERMISSIONS.map((p) => p.key),
      };
    }

    const keysSet = new Set<string>();

    // 1. Check assigned RBAC roles from repository
    try {
      const assignedRoleIds = await dbRepository.getAdminUserRoleAssignments(userId).catch(() => []);
      if (assignedRoleIds && assignedRoleIds.length > 0) {
        const allRoles = await dbRepository.listRoles().catch(() => []);
        const userRoles = allRoles.filter((r) => assignedRoleIds.includes(r.id));

        if (userRoles.some((r) => r.isSystemRole)) {
          return {
            isSuperAdmin: true,
            permissionKeys: SYSTEM_PERMISSIONS.map((p) => p.key),
          };
        }

        for (const r of userRoles) {
          if (r.permissionKeys) {
            r.permissionKeys.forEach((k) => keysSet.add(k));
          }
        }
      }
    } catch {
      // Continue to DB or fallbacks
    }

    // 2. Direct DB fallback
    try {
      const db = getDb();
      const assignedRoles = await db
        .select({
          roleId: schema.roles.id,
          isSystemRole: schema.roles.isSystemRole,
        })
        .from(schema.adminUserRoles)
        .innerJoin(schema.roles, eq(schema.roles.id, schema.adminUserRoles.roleId))
        .where(eq(schema.adminUserRoles.userId, userId));

      if (assignedRoles.some((r) => r.isSystemRole === 1)) {
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

      permissionRows.forEach((r) => keysSet.add(r.key));
    } catch {
      // In memory mode
    }

    // 3. Fallbacks if no explicit RBAC assignment yet
    if (keysSet.size === 0) {
      if (profile?.role === "admin") {
        [
          "organizers.review",
          "organizers.revoke",
          "disputes.resolve",
          "tournaments.requests",
          "tournaments.manage",
          "games.manage",
          "wallet.view",
          "limits.manage",
          "users.view",
          "users.suspend",
          "admins.view",
          "roles.view",
          "audit.view",
          "system.settings.view",
        ].forEach((k) => keysSet.add(k));
      } else if (profile?.role === "treasurer") {
        ["wallet.view", "wallet.payouts", "ledger.adjust", "limits.manage", "audit.view"].forEach((k) =>
          keysSet.add(k)
        );
      }
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

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
 * 1. Resolves session or profile token/identifier.
 * 2. User must exist and not be banned.
 * 3. If user role === "super_admin" or holds any Super Admin system role, returns true immediately.
 * 4. Checks if user holds any assigned RBAC role that contains the specific permission key.
 * 5. Safe fallback for default roles (admin, treasurer, facilitator) across both MySQL and memory storage.
 */
export async function hasPermission(userIdOrToken: string, key: string): Promise<boolean> {
  if (!userIdOrToken || typeof userIdOrToken !== "string") return false;
  const identifier = userIdOrToken.trim();
  if (!identifier) return false;

  try {
    // 0. Resolve session token if present
    let session = await dbRepository.getSession(identifier).catch(() => null);
    const resolvedUserId = session?.userId || identifier;

    // 1. First check profile status & role via repository or db
    let profile = await dbRepository.getProfile(resolvedUserId).catch(() => null);
    if (!profile && resolvedUserId !== identifier) {
      profile = await dbRepository.getProfile(identifier).catch(() => null);
    }

    if (profile && profile.status === "banned") return false;

    // Super Admin role bypasses granular checks immediately
    if (profile?.role === "super_admin" || session?.role === "super_admin") return true;

    // 2. Check assigned roles & permissions from repository
    try {
      const checkIds = Array.from(new Set([resolvedUserId, identifier, profile?.token, profile?.id].filter(Boolean) as string[]));
      let assignedRoleIds: string[] = [];
      for (const uid of checkIds) {
        const roles = await dbRepository.getAdminUserRoleAssignments(uid).catch(() => []);
        if (roles && roles.length > 0) {
          assignedRoleIds = Array.from(new Set([...assignedRoleIds, ...roles]));
        }
      }

      if (assignedRoleIds.length > 0) {
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
      const checkIds = Array.from(new Set([resolvedUserId, identifier, profile?.token, profile?.id].filter(Boolean) as string[]));

      for (const uid of checkIds) {
        // Check if the user has a Super Admin system role assigned
        const systemRoleRows = await db
          .select({ isSystemRole: schema.roles.isSystemRole })
          .from(schema.adminUserRoles)
          .innerJoin(schema.roles, eq(schema.roles.id, schema.adminUserRoles.roleId))
          .where(
            and(
              eq(schema.adminUserRoles.userId, uid),
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
              eq(schema.adminUserRoles.userId, uid),
              eq(schema.permissions.key, key)
            )
          )
          .limit(1);

        if (match) return true;
      }
    } catch {
      // Ignore DB query errors if running in memory mode
    }

    // 4. Default fallback checks based on profile.role or session.role
    const activeRole = profile?.role || session?.role;
    if (activeRole === "super_admin") {
      return true;
    }

    if (activeRole === "admin") {
      const defaultAdminKeys = [
        "organizers.view",
        "organizers.review",
        "organizers.revoke",
        "organizers.delete",
        "disputes.view",
        "disputes.resolve",
        "disputes.delete",
        "tournaments.view",
        "tournaments.requests",
        "tournaments.requests.delete",
        "tournaments.manage",
        "tournaments.delete",
        "games.view",
        "games.manage",
        "games.delete",
        "wallet.view",
        "deposits.view",
        "withdrawals.view",
        "wallet.payouts",
        "wallet.reject_payout",
        "ledger.adjust",
        "transactions.void",
        "limits.manage",
        "users.view",
        "users.edit",
        "users.suspend",
        "users.delete",
        "admins.view",
        "admins.manage",
        "admins.delete",
        "roles.view",
        "roles.manage",
        "roles.delete",
        "mechanics.view",
        "mechanics.manage",
        "mechanics.fund",
        "mechanics.create",
        "mechanics.delete",
        "communications.view",
        "communications.send",
        "communications.delete",
        "audit.view",
        "audit.export",
        "audit.delete",
        "system.settings.view",
        "system.settings.edit",
        "system.settings.delete",
        "system.backup",
      ];
      if (defaultAdminKeys.includes(key)) return true;
    } else if (activeRole === "treasurer") {
      const treasurerKeys = [
        "wallet.view",
        "deposits.view",
        "withdrawals.view",
        "wallet.payouts",
        "wallet.reject_payout",
        "ledger.adjust",
        "transactions.void",
        "limits.manage",
        "audit.view",
        "audit.export",
      ];
      if (treasurerKeys.includes(key)) return true;
    } else if (activeRole === "facilitator") {
      const facilitatorKeys = [
        "tournaments.view",
        "tournaments.manage",
        "tournaments.requests",
        "organizers.view",
        "organizers.review",
        "disputes.view",
        "disputes.resolve",
        "audit.view",
      ];
      if (facilitatorKeys.includes(key)) return true;
    }

    return false;
  } catch (err) {
    console.error(`[damii][permissions] hasPermission check error for ${userIdOrToken} on ${key}:`, err);
    return false;
  }
}

/**
 * Retrieves all permission keys, roleTitle, roleNames and Super Admin status for an admin user.
 */
export async function getAdminPermissions(userIdOrToken: string): Promise<{
  isSuperAdmin: boolean;
  permissionKeys: string[];
  roleTitle: string;
  roleNames: string[];
}> {
  if (!userIdOrToken || typeof userIdOrToken !== "string") {
    return { isSuperAdmin: false, permissionKeys: [], roleTitle: "Administrator", roleNames: [] };
  }
  const identifier = userIdOrToken.trim();
  if (!identifier) {
    return { isSuperAdmin: false, permissionKeys: [], roleTitle: "Administrator", roleNames: [] };
  }

  try {
    const session = await dbRepository.getSession(identifier).catch(() => null);
    const resolvedUserId = session?.userId || identifier;

    let profile = await dbRepository.getProfile(resolvedUserId).catch(() => null);
    if (!profile && resolvedUserId !== identifier) {
      profile = await dbRepository.getProfile(identifier).catch(() => null);
    }

    if (profile?.role === "super_admin" || session?.role === "super_admin") {
      return {
        isSuperAdmin: true,
        roleTitle: "Super Admin",
        roleNames: ["Super Admin"],
        permissionKeys: SYSTEM_PERMISSIONS.map((p) => p.key),
      };
    }

    const checkIds = Array.from(new Set([resolvedUserId, identifier, profile?.token, profile?.id].filter(Boolean) as string[]));
    const keysSet = new Set<string>();
    const roleNamesSet = new Set<string>();

    // 1. Check admin_profiles table
    for (const uid of checkIds) {
      try {
        const adminProf = await dbRepository.getAdminProfile(uid).catch(() => null);
        if (adminProf) {
          if (adminProf.isSuperAdmin) {
            return {
              isSuperAdmin: true,
              roleTitle: "Super Admin",
              roleNames: ["Super Admin"],
              permissionKeys: SYSTEM_PERMISSIONS.map((p) => p.key),
            };
          }
          if (Array.isArray(adminProf.permissions)) {
            adminProf.permissions.forEach((p) => keysSet.add(p));
          }
        }
      } catch {
        // Continue
      }
    }

    // 2. Check assigned RBAC roles from repository
    try {
      let assignedRoleIds: string[] = [];
      for (const uid of checkIds) {
        const roles = await dbRepository.getAdminUserRoleAssignments(uid).catch(() => []);
        if (roles && roles.length > 0) {
          assignedRoleIds = Array.from(new Set([...assignedRoleIds, ...roles]));
        }
      }

      if (assignedRoleIds.length > 0) {
        const allRoles = await dbRepository.listRoles().catch(() => []);
        const userRoles = allRoles.filter((r) => assignedRoleIds.includes(r.id));

        if (userRoles.some((r) => r.isSystemRole)) {
          return {
            isSuperAdmin: true,
            roleTitle: "Super Admin",
            roleNames: ["Super Admin"],
            permissionKeys: SYSTEM_PERMISSIONS.map((p) => p.key),
          };
        }

        for (const r of userRoles) {
          if (r.name) roleNamesSet.add(r.name);
          if (r.permissionKeys) {
            r.permissionKeys.forEach((k) => keysSet.add(k));
          }
        }
      }
    } catch {
      // Continue to DB or fallbacks
    }

    // 3. Direct DB fallback
    try {
      const db = getDb();

      for (const uid of checkIds) {
        const assignedRoles = await db
          .select({
            roleId: schema.roles.id,
            roleName: schema.roles.name,
            isSystemRole: schema.roles.isSystemRole,
          })
          .from(schema.adminUserRoles)
          .innerJoin(schema.roles, eq(schema.roles.id, schema.adminUserRoles.roleId))
          .where(eq(schema.adminUserRoles.userId, uid));

        if (assignedRoles.some((r) => r.isSystemRole === 1)) {
          return {
            isSuperAdmin: true,
            roleTitle: "Super Admin",
            roleNames: ["Super Admin"],
            permissionKeys: SYSTEM_PERMISSIONS.map((p) => p.key),
          };
        }

        assignedRoles.forEach((r) => {
          if (r.roleName) roleNamesSet.add(r.roleName);
        });

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
          .where(eq(schema.adminUserRoles.userId, uid));

        permissionRows.forEach((r) => keysSet.add(r.key));
      }
    } catch {
      // In memory mode
    }

    // 4. Fallbacks if no explicit RBAC assignment yet
    const activeRole = profile?.role || session?.role;
    if (keysSet.size === 0) {
      if (activeRole === "admin") {
        [
          "organizers.view",
          "organizers.review",
          "organizers.revoke",
          "organizers.delete",
          "disputes.view",
          "disputes.resolve",
          "disputes.delete",
          "tournaments.view",
          "tournaments.requests",
          "tournaments.requests.delete",
          "tournaments.manage",
          "tournaments.delete",
          "games.view",
          "games.manage",
          "games.delete",
          "wallet.view",
          "deposits.view",
          "withdrawals.view",
          "wallet.payouts",
          "wallet.reject_payout",
          "ledger.adjust",
          "transactions.void",
          "limits.manage",
          "users.view",
          "users.edit",
          "users.suspend",
          "users.delete",
          "admins.view",
          "admins.manage",
          "admins.delete",
          "roles.view",
          "roles.manage",
          "roles.delete",
          "mechanics.view",
          "mechanics.manage",
          "mechanics.fund",
          "mechanics.create",
          "mechanics.delete",
          "communications.view",
          "communications.send",
          "communications.delete",
          "audit.view",
          "audit.export",
          "audit.delete",
          "system.settings.view",
          "system.settings.edit",
          "system.settings.delete",
          "system.backup",
        ].forEach((k) => keysSet.add(k));
      } else if (activeRole === "treasurer") {
        [
          "wallet.view",
          "deposits.view",
          "withdrawals.view",
          "wallet.payouts",
          "wallet.reject_payout",
          "ledger.adjust",
          "transactions.void",
          "limits.manage",
          "audit.view",
          "audit.export",
        ].forEach((k) => keysSet.add(k));
      } else if (activeRole === "facilitator") {
        [
          "tournaments.view",
          "tournaments.manage",
          "tournaments.requests",
          "organizers.view",
          "organizers.review",
          "disputes.view",
          "disputes.resolve",
          "audit.view",
        ].forEach((k) => keysSet.add(k));
      }
    }

    const roleNames = Array.from(roleNamesSet);
    let roleTitle = "Administrator";
    if (roleNames.length > 0) {
      roleTitle = roleNames.join(", ");
    } else if (activeRole === "super_admin") {
      roleTitle = "Super Admin";
    } else if (activeRole === "treasurer") {
      roleTitle = "Finance Admin";
    } else if (activeRole === "facilitator") {
      roleTitle = "Tournament Arbiter";
    } else if (activeRole === "admin") {
      roleTitle = "Administrator";
    }

    return {
      isSuperAdmin: false,
      roleTitle,
      roleNames,
      permissionKeys: Array.from(keysSet),
    };
  } catch (err) {
    console.error(`[damii][permissions] getAdminPermissions error for ${userIdOrToken}:`, err);
    return { isSuperAdmin: false, permissionKeys: [], roleTitle: "Administrator", roleNames: [] };
  }
}

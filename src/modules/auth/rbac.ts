import type { UserRole } from "./types";

export const ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
  VIEWER: "VIEWER",
} as const;

export const WORKSPACE_ROLES: readonly string[] = [ROLES.OWNER];
export const BILLING_ROLES: readonly string[] = [ROLES.OWNER, ROLES.ADMIN];
export const MUTATE_LEDGER_ROLES: readonly string[] = [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER];
export const READ_ROLES: readonly string[] = [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER, ROLES.VIEWER];

/**
 * Returns true if the user role has full workspace ownership privileges.
 */
export function canManageWorkspace(role: string): boolean {
  return role === ROLES.OWNER;
}

/**
 * Returns true if the user role can manage billing, invoices, and payments.
 */
export function canManageBilling(role: string): boolean {
  return role === ROLES.OWNER || role === ROLES.ADMIN;
}

/**
 * Returns true if the user role can create or edit ledger entries (invoices, expenses).
 */
export function canMutateLedger(role: string): boolean {
  return role === ROLES.OWNER || role === ROLES.ADMIN || role === ROLES.MEMBER;
}

/**
 * Returns true if the user role has read access to workspace financial data.
 */
export function canRead(role: string): boolean {
  return (
    role === ROLES.OWNER ||
    role === ROLES.ADMIN ||
    role === ROLES.MEMBER ||
    role === ROLES.VIEWER
  );
}

/**
 * Asserts that the role can manage workspace settings (OWNER only).
 * Throws an authorization error if the check fails.
 */
export function assertCanManageWorkspace(role: string): void {
  if (!canManageWorkspace(role)) {
    throw new Error("Forbidden: Only workspace owners can perform this action.");
  }
}

/**
 * Asserts that the role can manage billing and financial settlements (OWNER, ADMIN).
 * Throws an authorization error if the check fails.
 */
export function assertCanManageBilling(role: string): void {
  if (!canManageBilling(role)) {
    throw new Error("Forbidden: Insufficient permissions to manage billing and payments.");
  }
}

/**
 * Asserts that the role can mutate ledger items (OWNER, ADMIN, MEMBER).
 * Throws an authorization error if the check fails.
 */
export function assertCanMutateLedger(role: string): void {
  if (!canMutateLedger(role)) {
    throw new Error("Forbidden: Insufficient permissions to modify invoices or expenses.");
  }
}

/**
 * Asserts that the role can read workspace items (OWNER, ADMIN, MEMBER, VIEWER).
 * Throws an authorization error if the check fails.
 */
export function assertCanRead(role: string): void {
  if (!canRead(role)) {
    throw new Error("Forbidden: Insufficient permissions to access this workspace resource.");
  }
}

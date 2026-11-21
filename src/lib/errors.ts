/**
 * FinFlow Centralized Error Classification & User-Facing Sanitization System
 *
 * Prevents technical database connection strings, stack traces, and internal
 * server infrastructure details (e.g. Neon endpoints) from leaking to end users.
 * Converts raw database, network, and validation exceptions into elegant,
 * actionable, human-readable notifications.
 */

import { ZodError } from "zod";

export type AppErrorCode =
  | "DATABASE_UNAVAILABLE"
  | "DATABASE_TIMEOUT"
  | "NETWORK_OFFLINE"
  | "CONFLICT_DUPLICATE"
  | "RECORD_NOT_FOUND"
  | "FOREIGN_KEY_RESTRICTION"
  | "AUTH_UNAUTHORIZED"
  | "AUTH_SESSION_EXPIRED"
  | "VALIDATION_ERROR"
  | "GENERIC_ERROR";

export interface ParsedAppError {
  code: AppErrorCode;
  userMessage: string;
  isNetworkOrDb: boolean;
  technicalDetails?: string;
}

/**
 * Checks if a string or error message contains database or network connectivity signals.
 */
function hasConnectionKeywords(str: string): boolean {
  const lower = str.toLowerCase();
  return (
    lower.includes("can't reach database") ||
    lower.includes("cant reach database") ||
    lower.includes("cannot reach database") ||
    lower.includes("database server") ||
    lower.includes("pgbouncer") ||
    lower.includes("connection closed") ||
    lower.includes("connection terminated") ||
    lower.includes("connection refused") ||
    lower.includes("connection timed out") ||
    lower.includes("timed out fetching a new connection") ||
    lower.includes("enotfound") ||
    lower.includes("econnrefused") ||
    lower.includes("etimedout") ||
    lower.includes("econnreset") ||
    lower.includes("eai_again") ||
    lower.includes("fetch failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("network error") ||
    lower.includes("offline") ||
    lower.includes("neon.tech")
  );
}

/**
 * Checks if a message indicates a database transaction timeout.
 */
function hasTimeoutKeywords(str: string): boolean {
  const lower = str.toLowerCase();
  return (
    lower.includes("transaction api error") ||
    lower.includes("transaction already closed") ||
    lower.includes("transaction timed out") ||
    lower.includes("operations timed out") ||
    lower.includes("timeout") ||
    lower.includes("timed out")
  );
}

interface PrismaLikeError {
  name?: string;
  code?: string;
  errorCode?: string;
  message?: string;
  meta?: { target?: unknown };
}

/**
 * Categorizes any caught error into a safe, structured AppError.
 */
export function categorizeError(err: unknown): ParsedAppError {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0]?.message || "Invalid input parameters.";
    return {
      code: "VALIDATION_ERROR",
      userMessage: `Please check your inputs: ${firstIssue}`,
      isNetworkOrDb: false,
      technicalDetails: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }

  const errObj = (typeof err === "object" && err !== null ? err : {}) as PrismaLikeError;
  const errName =
    errObj.name ||
    (err instanceof Error ? err.constructor?.name : "") ||
    "";
  const errCode = typeof errObj.code === "string" ? errObj.code : "";
  const errMsg =
    typeof errObj.message === "string"
      ? errObj.message
      : err instanceof Error
      ? err.message
      : String(err || "");

  // 2. Prisma Client Initialization Error (Database unreachable / offline / DNS fail)
  if (errName === "PrismaClientInitializationError") {
    return {
      code: "DATABASE_UNAVAILABLE",
      userMessage: "Unable to connect to the database. Please check your internet connection and try again.",
      isNetworkOrDb: true,
      technicalDetails: `PrismaClientInitializationError: ${errObj.errorCode || "UNREACHABLE"}`,
    };
  }

  // 3. Prisma Client Known Request Errors (P1001, P1002, P2002, P2025, etc.)
  if (errName === "PrismaClientKnownRequestError") {
    switch (errCode) {
      case "P1001":
      case "P1017":
      case "P2024":
        return {
          code: "DATABASE_UNAVAILABLE",
          userMessage: "Unable to reach the database server. Please verify your internet connection and try again.",
          isNetworkOrDb: true,
          technicalDetails: `Prisma ${errCode}: Database connection unavailable`,
        };

      case "P1002":
      case "P1008":
      case "P2028":
        return {
          code: "DATABASE_TIMEOUT",
          userMessage: "The request took longer than expected due to network latency. Please try again.",
          isNetworkOrDb: true,
          technicalDetails: `Prisma ${errCode}: Transaction or operation timeout`,
        };

      case "P2002": {
        const target = Array.isArray(errObj.meta?.target) ? (errObj.meta.target as string[]).join(", ") : "record";
        return {
          code: "CONFLICT_DUPLICATE",
          userMessage: `A ${target} with this information already exists in your company.`,
          isNetworkOrDb: false,
          technicalDetails: `Prisma P2002 unique constraint failed on [${target}]`,
        };
      }

      case "P2003":
        return {
          code: "FOREIGN_KEY_RESTRICTION",
          userMessage: "Cannot complete this action because dependent financial records are linked to this item.",
          isNetworkOrDb: false,
          technicalDetails: "Prisma P2003: Foreign key constraint violation",
        };

      case "P2025":
        return {
          code: "RECORD_NOT_FOUND",
          userMessage: "The requested record could not be found or has already been removed.",
          isNetworkOrDb: false,
          technicalDetails: "Prisma P2025: Record to update or delete not found",
        };

      default:
        if (hasConnectionKeywords(errMsg)) {
          return {
            code: "DATABASE_UNAVAILABLE",
            userMessage: "Unable to connect to the database. Please check your internet connection and try again.",
            isNetworkOrDb: true,
            technicalDetails: `Prisma ${errCode}`,
          };
        }
        return {
          code: "GENERIC_ERROR",
          userMessage: "A database error occurred while processing your request. Please try again.",
          isNetworkOrDb: false,
          technicalDetails: `Prisma ${errCode}`,
        };
    }
  }

  // 4. Prisma Rust Panic or Unknown Request
  if (
    errName === "PrismaClientRustPanicError" ||
    errName === "PrismaClientUnknownRequestError"
  ) {
    return {
      code: "DATABASE_UNAVAILABLE",
      userMessage: "The database service encountered an unexpected issue. Please retry in a few moments.",
      isNetworkOrDb: true,
      technicalDetails: "Prisma Unknown/Panic Error",
    };
  }

  // 5. Standard Error parsing with keyword matching
  if (err instanceof Error) {
    const msg = err.message || "";

    // Auth errors
    if (msg.includes("Forbidden")) {
      return {
        code: "AUTH_UNAUTHORIZED",
        userMessage: msg,
        isNetworkOrDb: false,
      };
    }
    if (msg.includes("Unauthorized") || msg.includes("Please sign in")) {
      return {
        code: "AUTH_UNAUTHORIZED",
        userMessage: "You must be signed in to perform this action.",
        isNetworkOrDb: false,
      };
    }
    if (msg.includes("Session expired") || msg.includes("invalid token")) {
      return {
        code: "AUTH_SESSION_EXPIRED",
        userMessage: "Your session has expired. Please sign in again.",
        isNetworkOrDb: false,
      };
    }

    // Network / Database connectivity detection
    if (hasConnectionKeywords(msg)) {
      return {
        code: "DATABASE_UNAVAILABLE",
        userMessage: "Unable to connect to the database. Please check your internet connection and try again.",
        isNetworkOrDb: true,
        technicalDetails: "Network/Database unreachable",
      };
    }

    // Timeout detection
    if (hasTimeoutKeywords(msg)) {
      return {
        code: "DATABASE_TIMEOUT",
        userMessage: "The operation timed out. Please verify your connection and try again.",
        isNetworkOrDb: true,
        technicalDetails: "Operation timeout",
      };
    }

    // If message is clean, short, and does not leak system paths or database credentials, use it
    const isSafeMessage =
      !msg.includes("prisma") &&
      !msg.includes("SELECT") &&
      !msg.includes("INSERT") &&
      !msg.includes("UPDATE") &&
      !msg.includes("DELETE") &&
      !msg.includes("FROM") &&
      !msg.includes("neon.tech") &&
      !msg.includes("postgres://") &&
      !msg.includes("node_modules") &&
      !msg.includes("at ");

    if (isSafeMessage && msg.length < 150) {
      return {
        code: "VALIDATION_ERROR",
        userMessage: msg,
        isNetworkOrDb: false,
      };
    }
  }

  // Fallback
  return {
    code: "GENERIC_ERROR",
    userMessage: "An unexpected error occurred. Please try again.",
    isNetworkOrDb: false,
  };
}

/**
 * Returns a clean, user-facing error message suitable for UI display.
 * Strips all database hostnames, credentials, and raw stack traces.
 */
export function formatUserError(err: unknown, fallbackMessage?: string): string {
  const parsed = categorizeError(err);
  if (parsed.code === "GENERIC_ERROR" && fallbackMessage) {
    return fallbackMessage;
  }
  return parsed.userMessage;
}

/**
 * Returns true if the error is caused by database connectivity loss or offline network state.
 */
export function isDatabaseOrNetworkError(err: unknown): boolean {
  return categorizeError(err).isNetworkOrDb;
}

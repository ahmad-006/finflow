"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { ZodError } from "zod";
import { formatUserError } from "@/lib/errors";
import {
  getSessionTokenFromCookies,
  verifySessionToken,
  getSession,
} from "@/modules/auth/session";
import type { SessionPayload } from "@/modules/auth/types";
import { assertCanManageWorkspace } from "@/modules/auth/rbac";
import {
  updateTreasurySettings,
  get30DayForecast,
} from "./service";
import {
  updateTreasurySettingsSchema,
  forecastQuerySchema,
} from "./validation";
import type {
  ForecastMode,
  ForecastQueryInput,
  ForecastSummary,
  TreasuryActionResult,
  TreasurySettings,
  UpdateTreasurySettingsInput,
} from "./types";

/**
 * Extracts key-value pairs from FormData or plain objects.
 */
function extractData(input: unknown): Record<string, unknown> {
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    const obj: Record<string, unknown> = {};
    for (const [key, val] of input.entries()) {
      obj[key] = val;
    }
    return obj;
  }
  if (typeof input === "object" && input !== null) {
    return input as Record<string, unknown>;
  }
  return {};
}

/**
 * Verifies session token and extracts authenticated tenant identity.
 */
export async function requireAuthSession(
  sessionOverride?: SessionPayload
): Promise<SessionPayload> {
  if (sessionOverride?.userId && sessionOverride?.companyId) {
    return sessionOverride;
  }

  const session = await getSession();
  if (session?.userId && session?.companyId) {
    return session;
  }

  let token: string | null = null;
  try {
    token = await getSessionTokenFromCookies();
  } catch {
    token = null;
  }
  if (!token) {
    throw new Error("Unauthorized: Please sign in to manage treasury settings.");
  }

  const verified = await verifySessionToken(token);
  if (!verified || !verified.companyId) {
    throw new Error("Session expired or invalid: Please sign in again.");
  }

  return verified;
}

/**
 * Formats Zod validation issues into field error arrays.
 */
function formatZodErrors(err: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const field = issue.path.join(".") || "form";
    if (!fieldErrors[field]) {
      fieldErrors[field] = [];
    }
    fieldErrors[field].push(issue.message);
  }
  return fieldErrors;
}

/**
 * Invalidates multi-tenant cache tags with fallback.
 */
function invalidateTreasuryTags(companyId: string) {
  const tags = [
    `treasury-${companyId}`,
    `dashboard-${companyId}`,
    `kpis-${companyId}`,
  ];

  for (const tag of tags) {
    try {
      updateTag(tag);
    } catch {
      try {
        revalidateTag(tag, { expire: 0 });
      } catch {
        // Best effort tag invalidation
      }
    }
  }
}

/**
 * Server Action: Updates company liquid reserve and safety buffer thresholds.
 */
export async function updateTreasurySettingsAction(
  input: UpdateTreasurySettingsInput | FormData,
  sessionOverride?: SessionPayload
): Promise<TreasuryActionResult<TreasurySettings>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    assertCanManageWorkspace(session.role);

    const rawData = extractData(input);
    const validated = updateTreasurySettingsSchema.parse(rawData);

    const result = await updateTreasurySettings(
      session.companyId,
      validated,
      session.userId
    );

    invalidateTreasuryTags(session.companyId);
    for (const path of ["/dashboard", "/cash-flow", "/calendar"]) {
      try {
        revalidatePath(path);
      } catch {
        // Best effort revalidation
      }
    }

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return {
        success: false,
        error: "Please correct the highlighted treasury settings.",
        errors: formatZodErrors(err),
      };
    }
    return {
      success: false,
      error: formatUserError(err, "Failed to update treasury settings."),
    };
  }
}

/**
 * Server Action: Fetches 30-day rolling cash forecast for mode switching.
 */
export async function getForecastAction(
  input?: ForecastQueryInput | ForecastMode
): Promise<TreasuryActionResult<ForecastSummary>> {
  try {
    const session = await requireAuthSession();

    const queryObj =
      typeof input === "string"
        ? { mode: input }
        : (input ?? {});

    const validated = forecastQuerySchema.parse(queryObj);

    const forecast = await get30DayForecast(
      session.companyId,
      validated.mode
    );

    return {
      success: true,
      data: forecast,
    };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return {
        success: false,
        error: "Invalid forecast query parameters.",
        errors: formatZodErrors(err),
      };
    }
    return {
      success: false,
      error: formatUserError(err, "Failed to calculate cash flow forecast."),
    };
  }
}

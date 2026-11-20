"use server";

import { ZodError } from "zod";
import { formatUserError } from "@/lib/errors";
import {
  getSessionTokenFromCookies,
  verifySessionToken,
} from "@/modules/auth/session";
import type { SessionPayload } from "@/modules/auth/types";
import { getCachedMonthCalendar } from "./service";
import { calendarQuerySchema } from "./validation";
import type { CalendarMonthData, CalendarQueryInput } from "./types";

export interface CalendarActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function requireAuthSession(): Promise<SessionPayload> {
  let token: string | null = null;
  try {
    token = await getSessionTokenFromCookies();
  } catch {
    token = null;
  }
  if (!token) {
    throw new Error("Unauthorized: Please sign in to view the calendar.");
  }

  const session = await verifySessionToken(token);
  if (!session || !session.companyId) {
    throw new Error("Invalid session. Please sign in again.");
  }

  return session;
}

export async function getCalendarMonthAction(
  input?: CalendarQueryInput
): Promise<CalendarActionResult<CalendarMonthData>> {
  try {
    const session = await requireAuthSession();
    const validated = calendarQuerySchema.parse(input || {});
    const data = await getCachedMonthCalendar(
      session.companyId,
      validated.year,
      validated.month
    );
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) {
        fieldErrors[issue.path.join(".")] = issue.message;
      }
      return {
        success: false,
        error: "Validation error on calendar query parameters.",
        fieldErrors,
      };
    }
    return {
      success: false,
      error: formatUserError(error),
    };
  }
}

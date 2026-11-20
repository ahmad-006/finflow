"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { ZodError } from "zod";
import { formatUserError } from "@/lib/errors";
import {
  getSessionTokenFromCookies,
  verifySessionToken,
} from "@/modules/auth/session";
import type { SessionPayload } from "@/modules/auth/types";
import { sendInvoicePaymentReminder } from "./service";
import { sendReminderSchema } from "./validation";
import type { SendReminderActionResult } from "./types";

/**
 * Extracts payload data whether input is FormData, a dictionary, or an invoice ID string.
 */
function extractData(input: unknown): Record<string, unknown> {
  if (input instanceof FormData) {
    const obj: Record<string, unknown> = {};
    for (const [key, val] of input.entries()) {
      obj[key] = val;
    }
    return obj;
  }
  if (typeof input === "string") {
    return { invoiceId: input };
  }
  if (typeof input === "object" && input !== null) {
    return input as Record<string, unknown>;
  }
  return {};
}

/**
 * Verifies session cookie and extracts authenticated user's company tenancy.
 */
async function requireAuthSession(): Promise<SessionPayload> {
  const token = await getSessionTokenFromCookies();
  if (!token) {
    throw new Error("Unauthorized: Please sign in to send payment reminders.");
  }

  const session = await verifySessionToken(token);
  if (!session || !session.companyId) {
    throw new Error("Session expired or invalid: Please sign in again.");
  }

  return session;
}

/**
 * Formats Zod errors into a field-by-field record for frontend form feedback.
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
 * Safely invalidates Next.js multi-tenant cache tags with fallback.
 */
function invalidateTenantTags(companyId: string, invoiceId?: string) {
  const tags = [
    `invoices-${companyId}`,
    `aging-${companyId}`,
    `kpis-${companyId}`,
  ];
  if (invoiceId) {
    tags.push(`invoice-${invoiceId}`);
  }

  for (const tag of tags) {
    try {
      updateTag(tag);
    } catch {
      try {
        revalidateTag(tag, { expire: 0 });
      } catch {
        // Tag invalidation best effort
      }
    }
  }
}

/**
 * Server Action: Sends a client payment reminder email for an outstanding invoice.
 * Supports both standard React 19 form actions and programmatic invocations.
 */
export async function sendInvoiceReminderAction(
  prevStateOrData?: unknown,
  formDataOrUndefined?: FormData
): Promise<SendReminderActionResult> {
  try {
    const session = await requireAuthSession();

    const rawData = formDataOrUndefined
      ? extractData(formDataOrUndefined)
      : extractData(prevStateOrData);

    const validated = sendReminderSchema.parse({
      invoiceId: String(rawData.invoiceId || "").trim(),
    });

    const result = await sendInvoicePaymentReminder(
      session.companyId,
      validated.invoiceId,
      session.userId
    );

    invalidateTenantTags(session.companyId, validated.invoiceId);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${validated.invoiceId}`);

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return {
        success: false,
        error: "Invalid reminder request: Please provide a valid invoice ID.",
        errors: formatZodErrors(err),
      };
    }
    return {
      success: false,
      error: formatUserError(err, "Failed to send payment reminder."),
    };
  }
}

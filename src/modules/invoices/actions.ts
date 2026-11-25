"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { ZodError, z } from "zod";
import { formatUserError } from "@/lib/errors";
import {
  getSessionTokenFromCookies,
  verifySessionToken,
  getSession,
} from "@/modules/auth/session";
import type { SessionPayload } from "@/modules/auth/types";
import {
  assertCanMutateLedger,
  assertCanManageBilling,
} from "@/modules/auth/rbac";
import {
  createInvoice,
  updateInvoice,
  markInvoiceSent,
  recordInvoicePayment,
  cancelInvoice,
  bulkImportInvoices,
} from "./service";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  recordPaymentSchema,
} from "./validation";
import type {
  InvoiceActionResult,
  InvoiceWithItemsAndClient,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  RecordPaymentInput,
  BulkInvoiceRowInput,
  BulkImportInvoicesOptions,
  BulkImportInvoicesResult,
} from "./types";

/**
 * Verifies session cookie and extracts authenticated user's company tenancy.
 */
async function requireAuthSession(sessionOverride?: SessionPayload): Promise<SessionPayload> {
  if (sessionOverride?.userId && sessionOverride?.companyId) {
    return sessionOverride;
  }

  const session = await getSession();
  if (session?.userId && session?.companyId) {
    return session;
  }

  const token = await getSessionTokenFromCookies();
  if (!token) {
    throw new Error("Unauthorized: Please sign in to manage invoices.");
  }

  const verified = await verifySessionToken(token);
  if (!verified || !verified.companyId) {
    throw new Error("Session expired or invalid: Please sign in again.");
  }

  return verified;
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
function invalidateTenantTags(companyId: string, extraTags: string[] = []) {
  const tags = [
    `invoices-${companyId}`,
    `clients-${companyId}`,
    `aging-${companyId}`,
    `kpis-${companyId}`,
    `treasury-${companyId}`,
    `dashboard-${companyId}`,
    `calendar-${companyId}`,
    ...extraTags,
  ];

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
 * Safely revalidates invoice-related routes across Next.js App Router and test environments.
 */
function revalidateInvoicePaths(extraPaths: string[] = []) {
  const paths = [
    "/invoices",
    "/clients",
    "/dashboard",
    "/cash-flow",
    "/calendar",
    ...extraPaths,
  ];
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // Best effort revalidation
    }
  }
}

const bulkImportInvoicesOptionsSchema = z
  .object({
    autoCreateMissingClients: z.boolean().optional(),
  })
  .optional();

/**
 * Server Action: Creates a new invoice with atomic sequential numbering.
 */
export async function createInvoiceAction(
  data: CreateInvoiceInput,
  sessionOverride?: SessionPayload
): Promise<InvoiceActionResult<InvoiceWithItemsAndClient>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    assertCanMutateLedger(session.role);
    const validated = createInvoiceSchema.parse(data);

    const invoice = await createInvoice(session.companyId, validated);

    invalidateTenantTags(session.companyId);
    revalidateInvoicePaths();

    return {
      success: true,
      data: invoice,
    };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return {
        success: false,
        error: "Please correct the highlighted errors.",
        errors: formatZodErrors(err),
      };
    }
    return {
      success: false,
      error: formatUserError(err, "Failed to create invoice."),
    };
  }
}

/**
 * Server Action: Updates an existing invoice (modifications restricted to DRAFT).
 */
export async function updateInvoiceAction(
  data: UpdateInvoiceInput,
  sessionOverride?: SessionPayload
): Promise<InvoiceActionResult<InvoiceWithItemsAndClient>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    assertCanMutateLedger(session.role);
    const validated = updateInvoiceSchema.parse(data);

    const invoice = await updateInvoice(session.companyId, validated);

    invalidateTenantTags(session.companyId, [`invoice-${session.companyId}-${data.id}`]);
    revalidateInvoicePaths([`/invoices/${data.id}`]);

    return {
      success: true,
      data: invoice,
    };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return {
        success: false,
        error: "Please correct the highlighted errors.",
        errors: formatZodErrors(err),
      };
    }
    return {
      success: false,
      error: formatUserError(err, "Failed to update invoice."),
    };
  }
}

/**
 * Server Action: Marks an invoice as SENT.
 */
export async function markInvoiceSentAction(
  invoiceId: string,
  sessionOverride?: SessionPayload
): Promise<InvoiceActionResult<InvoiceWithItemsAndClient>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    assertCanMutateLedger(session.role);

    if (!invoiceId) {
      return { success: false, error: "Invoice ID is required." };
    }

    const invoice = await markInvoiceSent(session.companyId, invoiceId);

    invalidateTenantTags(session.companyId, [`invoice-${session.companyId}-${invoiceId}`]);
    revalidateInvoicePaths([`/invoices/${invoiceId}`]);

    return {
      success: true,
      data: invoice,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: formatUserError(err, "Failed to mark invoice as sent."),
    };
  }
}

/**
 * Server Action: Records a payment against an invoice and emits an INFLOW transaction.
 */
export async function recordPaymentAction(
  data: RecordPaymentInput,
  sessionOverride?: SessionPayload
): Promise<InvoiceActionResult<InvoiceWithItemsAndClient>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    assertCanManageBilling(session.role);
    const validated = recordPaymentSchema.parse(data);

    const invoice = await recordInvoicePayment(session.companyId, validated);

    invalidateTenantTags(session.companyId, [`invoice-${session.companyId}-${data.invoiceId}`]);
    revalidateInvoicePaths([`/invoices/${data.invoiceId}`]);

    return {
      success: true,
      data: invoice,
    };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return {
        success: false,
        error: "Please correct the payment amount.",
        errors: formatZodErrors(err),
      };
    }
    return {
      success: false,
      error: formatUserError(err, "Failed to record payment."),
    };
  }
}

/**
 * Server Action: Cancels an invoice.
 */
export async function cancelInvoiceAction(
  invoiceId: string,
  sessionOverride?: SessionPayload
): Promise<InvoiceActionResult<InvoiceWithItemsAndClient>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    assertCanMutateLedger(session.role);

    if (!invoiceId) {
      return { success: false, error: "Invoice ID is required." };
    }

    const invoice = await cancelInvoice(session.companyId, invoiceId);

    invalidateTenantTags(session.companyId, [`invoice-${session.companyId}-${invoiceId}`]);
    revalidateInvoicePaths([`/invoices/${invoiceId}`]);

    return {
      success: true,
      data: invoice,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: formatUserError(err, "Failed to cancel invoice."),
    };
  }
}

/**
 * Server Action: Bulk imports up to 500 invoice rows from CSV.
 */
export async function bulkImportInvoicesAction(
  rows: BulkInvoiceRowInput[],
  options?: BulkImportInvoicesOptions,
  sessionOverride?: SessionPayload
): Promise<InvoiceActionResult<BulkImportInvoicesResult>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    assertCanMutateLedger(session.role);

    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        success: false,
        error: "At least one invoice row is required for import.",
      };
    }

    if (rows.length > 500) {
      return {
        success: false,
        error: "Maximum 500 invoice rows allowed per import.",
      };
    }

    const parsedOptions = bulkImportInvoicesOptionsSchema.parse(options);
    const result = await bulkImportInvoices(
      session.companyId,
      rows,
      parsedOptions,
      session.userId
    );

    if (result.createdCount > 0) {
      invalidateTenantTags(session.companyId);
      revalidateInvoicePaths();
    }

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return {
        success: false,
        error: "Please check your import options.",
        errors: formatZodErrors(err),
      };
    }
    return {
      success: false,
      error: formatUserError(err, "Failed to import invoices."),
    };
  }
}

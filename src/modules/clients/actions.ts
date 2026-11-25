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
import { assertCanMutateLedger } from "@/modules/auth/rbac";
import {
  createClient,
  updateClient,
  softDeleteClient,
  bulkImportClients,
} from "./service";
import {
  createClientSchema,
  updateClientSchema,
  parsePaymentTerms,
} from "./validation";
import type {
  ClientActionResult,
  ClientRecord,
  CreateClientInput,
  UpdateClientInput,
  BulkClientRowInput,
  BulkImportClientsOptions,
  BulkImportClientsResult,
} from "./types";

/**
 * Extracts key-value pairs whether given FormData or a plain JS object.
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
    throw new Error("Unauthorized: Please sign in to manage clients.");
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
    `clients-${companyId}`,
    `aging-${companyId}`,
    `treasury-${companyId}`,
    `dashboard-${companyId}`,
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
 * Safely revalidates client-related routes across Next.js App Router and test environments.
 */
function revalidateClientPaths(extraPaths: string[] = []) {
  const paths = ["/clients", "/invoices", "/invoices/new", "/dashboard", ...extraPaths];
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // Best effort revalidation
    }
  }
}

const bulkImportClientsOptionsSchema = z
  .object({
    duplicateMode: z.enum(["skip", "fail"]).optional(),
  })
  .optional();

/**
 * Server Action: Creates a new client profile under the user's company tenant,
 * revalidates related caches, and returns the created record.
 */
export async function createClientAction(
  prevStateOrData: unknown,
  formDataOrUndefined?: FormData,
  sessionOverride?: SessionPayload
): Promise<ClientActionResult<ClientRecord>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    assertCanMutateLedger(session.role);

    const rawData =
      typeof FormData !== "undefined" && formDataOrUndefined instanceof FormData
        ? extractData(formDataOrUndefined)
        : extractData(prevStateOrData);

    const input: CreateClientInput = {
      clientName: String(rawData.clientName || "").trim(),
      email: String(rawData.email || "").trim(),
      phone: rawData.phone ? String(rawData.phone).trim() : null,
      address: rawData.address ? String(rawData.address).trim() : null,
      paymentTermsDays: parsePaymentTerms(rawData.paymentTermsDays),
    };

    const validated = createClientSchema.parse(input);
    const client = await createClient(session.companyId, validated);

    invalidateTenantTags(session.companyId);
    revalidateClientPaths();

    return {
      success: true,
      data: client,
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
      error: formatUserError(err, "Failed to create client."),
    };
  }
}

/**
 * Server Action: Updates an existing client's details with tenant verification.
 */
export async function updateClientAction(
  prevStateOrData: unknown,
  formDataOrUndefined?: FormData,
  sessionOverride?: SessionPayload
): Promise<ClientActionResult<ClientRecord>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    assertCanMutateLedger(session.role);

    const rawData =
      typeof FormData !== "undefined" && formDataOrUndefined instanceof FormData
        ? extractData(formDataOrUndefined)
        : extractData(prevStateOrData);

    const input: UpdateClientInput = {
      id: String(rawData.id || "").trim(),
      ...(rawData.clientName !== undefined && { clientName: String(rawData.clientName).trim() }),
      ...(rawData.email !== undefined && { email: String(rawData.email).trim() }),
      ...(rawData.phone !== undefined && { phone: rawData.phone ? String(rawData.phone).trim() : null }),
      ...(rawData.address !== undefined && { address: rawData.address ? String(rawData.address).trim() : null }),
      ...(rawData.paymentTermsDays !== undefined && rawData.paymentTermsDays !== ""
        ? { paymentTermsDays: parsePaymentTerms(rawData.paymentTermsDays) }
        : {}),
    };

    const validated = updateClientSchema.parse(input);
    const updated = await updateClient(session.companyId, validated);

    invalidateTenantTags(session.companyId, [`client-${session.companyId}-${updated.id}`]);
    revalidateClientPaths([`/clients/${updated.id}`]);

    return {
      success: true,
      data: updated,
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
      error: formatUserError(err, "Failed to update client."),
    };
  }
}

/**
 * Server Action: Soft-deletes a client profile, preserving historical ledger integrity.
 */
export async function deleteClientAction(
  clientId: string,
  sessionOverride?: SessionPayload
): Promise<ClientActionResult<{ id: string }>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    assertCanMutateLedger(session.role);

    if (!clientId || typeof clientId !== "string") {
      return {
        success: false,
        error: "Client ID is required.",
      };
    }

    const deleted = await softDeleteClient(session.companyId, clientId);

    invalidateTenantTags(session.companyId, [`client-${session.companyId}-${clientId}`]);
    revalidateClientPaths([`/clients/${clientId}`]);

    return {
      success: true,
      data: { id: deleted.id },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: formatUserError(err, "Failed to delete client."),
    };
  }
}

/**
 * Server Action: Bulk imports up to 500 clients from parsed CSV rows.
 */
export async function bulkImportClientsAction(
  rows: BulkClientRowInput[],
  options?: BulkImportClientsOptions,
  sessionOverride?: SessionPayload
): Promise<ClientActionResult<BulkImportClientsResult>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    assertCanMutateLedger(session.role);

    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        success: false,
        error: "At least one client row is required for import.",
      };
    }

    if (rows.length > 500) {
      return {
        success: false,
        error: "Maximum 500 client rows allowed per import.",
      };
    }

    const parsedOptions = bulkImportClientsOptionsSchema.parse(options);
    const result = await bulkImportClients(
      session.companyId,
      rows,
      parsedOptions,
      session.userId
    );

    if (result.createdCount > 0) {
      invalidateTenantTags(session.companyId);
      revalidateClientPaths();
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
      error: formatUserError(err, "Failed to import clients."),
    };
  }
}

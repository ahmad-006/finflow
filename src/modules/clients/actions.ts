"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { ZodError } from "zod";
import { formatUserError } from "@/lib/errors";
import {
  getSessionTokenFromCookies,
  verifySessionToken,
} from "@/modules/auth/session";
import type { SessionPayload } from "@/modules/auth/types";
import {
  createClient,
  updateClient,
  softDeleteClient,
} from "./service";
import {
  createClientSchema,
  updateClientSchema,
} from "./validation";
import type {
  ClientActionResult,
  ClientRecord,
  CreateClientInput,
  UpdateClientInput,
} from "./types";

/**
 * Extracts key-value pairs whether given FormData or a plain JS object.
 */
function extractData(input: unknown): Record<string, unknown> {
  if (input instanceof FormData) {
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
async function requireAuthSession(): Promise<SessionPayload> {
  const token = await getSessionTokenFromCookies();
  if (!token) {
    throw new Error("Unauthorized: Please sign in to manage clients.");
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
 * Server Action: Creates a new client profile under the user's company tenant,
 * revalidates the /clients page cache, and returns the created record.
 */
export async function createClientAction(
  prevStateOrData: unknown,
  formDataOrUndefined?: FormData
): Promise<ClientActionResult<ClientRecord>> {
  try {
    const session = await requireAuthSession();
    const rawData = formDataOrUndefined
      ? extractData(formDataOrUndefined)
      : extractData(prevStateOrData);

    const input: CreateClientInput = {
      clientName: String(rawData.clientName || "").trim(),
      email: String(rawData.email || "").trim(),
      phone: rawData.phone ? String(rawData.phone).trim() : null,
      address: rawData.address ? String(rawData.address).trim() : null,
      paymentTermsDays: rawData.paymentTermsDays !== undefined && rawData.paymentTermsDays !== ""
        ? Number(rawData.paymentTermsDays)
        : 30,
    };

    const validated = createClientSchema.parse(input);
    const client = await createClient(session.companyId, validated);

    // Invalidate multi-tenant cache tags
    try {
      updateTag(`clients-${session.companyId}`);
      updateTag(`aging-${session.companyId}`);
    } catch {
      revalidateTag(`clients-${session.companyId}`, { expire: 0 });
      revalidateTag(`aging-${session.companyId}`, { expire: 0 });
    }
    revalidatePath("/clients");

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
  formDataOrUndefined?: FormData
): Promise<ClientActionResult<ClientRecord>> {
  try {
    const session = await requireAuthSession();
    const rawData = formDataOrUndefined
      ? extractData(formDataOrUndefined)
      : extractData(prevStateOrData);

    const input: UpdateClientInput = {
      id: String(rawData.id || "").trim(),
      ...(rawData.clientName !== undefined && { clientName: String(rawData.clientName).trim() }),
      ...(rawData.email !== undefined && { email: String(rawData.email).trim() }),
      ...(rawData.phone !== undefined && { phone: rawData.phone ? String(rawData.phone).trim() : null }),
      ...(rawData.address !== undefined && { address: rawData.address ? String(rawData.address).trim() : null }),
      ...(rawData.paymentTermsDays !== undefined && rawData.paymentTermsDays !== ""
        ? { paymentTermsDays: Number(rawData.paymentTermsDays) }
        : {}),
    };

    const validated = updateClientSchema.parse(input);
    const updated = await updateClient(session.companyId, validated);

    // Invalidate multi-tenant cache tags
    try {
      updateTag(`clients-${session.companyId}`);
      updateTag(`aging-${session.companyId}`);
      updateTag(`client-${session.companyId}-${updated.id}`);
    } catch {
      revalidateTag(`clients-${session.companyId}`, { expire: 0 });
      revalidateTag(`aging-${session.companyId}`, { expire: 0 });
      revalidateTag(`client-${session.companyId}-${updated.id}`, { expire: 0 });
    }
    revalidatePath("/clients");
    revalidatePath(`/clients/${updated.id}`);

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
  clientId: string
): Promise<ClientActionResult<{ id: string }>> {
  try {
    const session = await requireAuthSession();
    if (!clientId || typeof clientId !== "string") {
      return {
        success: false,
        error: "Client ID is required.",
      };
    }

    const deleted = await softDeleteClient(session.companyId, clientId);

    // Invalidate multi-tenant cache tags
    try {
      updateTag(`clients-${session.companyId}`);
      updateTag(`aging-${session.companyId}`);
      updateTag(`client-${session.companyId}-${clientId}`);
    } catch {
      revalidateTag(`clients-${session.companyId}`, { expire: 0 });
      revalidateTag(`aging-${session.companyId}`, { expire: 0 });
      revalidateTag(`client-${session.companyId}-${clientId}`, { expire: 0 });
    }
    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}`);

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

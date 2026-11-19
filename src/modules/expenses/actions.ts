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
  createExpense,
  updateExpense,
  deleteExpense,
  markExpenseAsPaid,
} from "./service";
import {
  createExpenseSchema,
  updateExpenseSchema,
  markExpensePaidSchema,
} from "./validation";
import type {
  ExpenseActionResult,
  ExpenseRecord,
  CreateExpenseInput,
  UpdateExpenseInput,
  MarkExpensePaidInput,
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
export async function requireAuthSession(): Promise<SessionPayload> {
  const token = await getSessionTokenFromCookies();
  if (!token) {
    throw new Error("Unauthorized: Please sign in to manage expenses.");
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
function invalidateTenantTags(companyId: string, extraTags: string[] = []) {
  const tags = [
    `expenses-${companyId}`,
    `kpis-${companyId}`,
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

  try {
    revalidateTag(`expenses-${companyId}`, { expire: 0 });
  } catch {
    // Best effort
  }
}

/**
 * Server Action: Creates a new expense under the user's company tenant.
 * Accepts either a CreateExpenseInput object or FormData (for form actions).
 */
export async function createExpenseAction(
  prevStateOrData: unknown,
  formDataOrUndefined?: FormData
): Promise<ExpenseActionResult<ExpenseRecord>> {
  try {
    const session = await requireAuthSession();

    let rawData: Record<string, unknown>;
    if (formDataOrUndefined instanceof FormData) {
      rawData = extractData(formDataOrUndefined);
    } else if (prevStateOrData instanceof FormData) {
      rawData = extractData(prevStateOrData);
    } else {
      rawData = extractData(prevStateOrData);
    }

    const input: CreateExpenseInput = {
      title: String(rawData.title || "").trim(),
      category: rawData.category as CreateExpenseInput["category"],
      amount: Number(rawData.amount),
      dueDate: rawData.dueDate as string | Date,
      recurrence: rawData.recurrence as CreateExpenseInput["recurrence"],
      notes: rawData.notes ? String(rawData.notes).trim() : null,
    };

    const validated = createExpenseSchema.parse(input);

    const expense = await createExpense(session.companyId, validated);

    invalidateTenantTags(session.companyId);
    revalidatePath("/expenses");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: expense,
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
      error: formatUserError(err, "Failed to create expense."),
    };
  }
}

/**
 * Server Action: Updates an existing unpaid expense.
 */
export async function updateExpenseAction(
  idOrInputOrPrevState: string | UpdateExpenseInput | unknown,
  maybeData?: UpdateExpenseInput | FormData
): Promise<ExpenseActionResult<ExpenseRecord>> {
  try {
    const session = await requireAuthSession();

    let expenseId = "";
    let rawData: Record<string, unknown> = {};

    if (typeof idOrInputOrPrevState === "string") {
      expenseId = idOrInputOrPrevState;
      rawData = extractData(maybeData);
    } else if (maybeData instanceof FormData) {
      rawData = extractData(maybeData);
      expenseId = String(rawData.id || "");
    } else {
      rawData = extractData(idOrInputOrPrevState);
      expenseId = String(rawData.id || "");
    }

    if (!expenseId) {
      return {
        success: false,
        error: "Expense ID is required for update.",
      };
    }

    const input: UpdateExpenseInput = {
      id: expenseId,
      title: rawData.title !== undefined ? String(rawData.title).trim() : undefined,
      category: rawData.category as UpdateExpenseInput["category"],
      amount: rawData.amount !== undefined ? Number(rawData.amount) : undefined,
      dueDate: rawData.dueDate as string | Date | undefined,
      recurrence: rawData.recurrence as UpdateExpenseInput["recurrence"],
      notes: rawData.notes !== undefined ? (rawData.notes ? String(rawData.notes).trim() : null) : undefined,
    };

    const validated = updateExpenseSchema.parse(input);

    const expense = await updateExpense(session.companyId, expenseId, validated);

    invalidateTenantTags(session.companyId, [`expense-${session.companyId}-${expenseId}`]);
    revalidatePath("/expenses");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: expense,
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
      error: formatUserError(err, "Failed to update expense."),
    };
  }
}

/**
 * Server Action: Deletes an unpaid expense.
 */
export async function deleteExpenseAction(
  expenseId: string
): Promise<ExpenseActionResult<{ success: boolean; id: string }>> {
  try {
    const session = await requireAuthSession();

    if (!expenseId || typeof expenseId !== "string") {
      return {
        success: false,
        error: "Expense ID is required for deletion.",
      };
    }

    const result = await deleteExpense(session.companyId, expenseId);

    invalidateTenantTags(session.companyId, [`expense-${session.companyId}-${expenseId}`]);
    revalidatePath("/expenses");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: formatUserError(err, "Failed to delete expense."),
    };
  }
}

/**
 * Server Action: Atomically marks an expense as paid, creates an OUTFLOW transaction,
 * writes an audit log, and advances recurring schedules.
 */
export async function markExpensePaidAction(
  expenseId: string,
  paymentData?: MarkExpensePaidInput
): Promise<ExpenseActionResult<ExpenseRecord>> {
  try {
    const session = await requireAuthSession();

    if (!expenseId || typeof expenseId !== "string") {
      return {
        success: false,
        error: "Expense ID is required to mark as paid.",
      };
    }

    const validated = paymentData ? markExpensePaidSchema.parse(paymentData) : undefined;

    const result = await markExpenseAsPaid(
      session.companyId,
      expenseId,
      validated,
      session.userId
    );

    invalidateTenantTags(session.companyId, [`expense-${session.companyId}-${expenseId}`]);
    revalidatePath("/expenses");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: result.expense || result,
    };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return {
        success: false,
        error: "Please correct the highlighted payment details.",
        errors: formatZodErrors(err),
      };
    }
    return {
      success: false,
      error: formatUserError(err, "Failed to mark expense as paid."),
    };
  }
}

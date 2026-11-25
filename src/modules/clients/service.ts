import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { unstable_cache } from "next/cache";
import { toDecimal } from "@/modules/invoices/currency";
import {
  createClientSchema,
  updateClientSchema,
  parsePaymentTerms,
  type ClientFilterSchemaInput,
} from "./validation";
import type {
  ClientRecord,
  ClientWithMetrics,
  ClientDetailWithInvoices,
  ClientMetrics,
  ARAgingBuckets,
  CreateClientInput,
  UpdateClientInput,
  ClientRiskStatus,
  BulkClientRowInput,
  BulkClientRowFeedback,
  BulkImportClientsOptions,
  BulkImportClientsResult,
} from "./types";

interface InvoiceRecordForMetrics {
  id: string;
  status: string;
  dueDate: Date;
  paidAt: Date | null;
  totalAmount?: Prisma.Decimal | number | string;
  baseTotalAmount: Prisma.Decimal | number | string;
  paidAmount: Prisma.Decimal | number | string;
}

/**
 * Sanitizes a Prisma client entity into a strict ClientRecord domain object.
 */
function sanitizeClientRecord(client: {
  id: string;
  companyId: string;
  clientName: string;
  email: string;
  phone: string | null;
  address: string | null;
  paymentTermsDays: number;
  riskStatus: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ClientRecord {
  return {
    id: client.id,
    companyId: client.companyId,
    clientName: client.clientName,
    email: client.email,
    phone: client.phone,
    address: client.address,
    paymentTermsDays: client.paymentTermsDays,
    riskStatus: (["HEALTHY", "WATCHLIST", "CRITICAL"].includes(client.riskStatus)
      ? client.riskStatus
      : "HEALTHY") as ClientRiskStatus,
    deletedAt: client.deletedAt,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

/**
 * Pure calculation function: computes financial performance, average latency (delay in days),
 * and dynamic risk status for a client based on their invoices.
 */
export function calculateClientMetrics(invoices: InvoiceRecordForMetrics[]): ClientMetrics {
  let totalBilled = new Decimal(0);
  let totalPaid = new Decimal(0);
  let outstandingBalance = new Decimal(0);
  let overdueAmount = new Decimal(0);
  let settledInvoicesCount = 0;
  let openInvoicesCount = 0;
  let overdueInvoicesCount = 0;
  let totalDelayDays = 0;

  const now = new Date();

  for (const inv of invoices) {
    if (inv.status === "CANCELLED") continue;

    const baseTotal = toDecimal(inv.baseTotalAmount);
    const nativePaid = toDecimal(inv.paidAmount);
    const nativeTotal =
      inv.totalAmount !== undefined && inv.totalAmount !== null
        ? toDecimal(inv.totalAmount)
        : null;

    const basePaid =
      nativeTotal && nativeTotal.gt(0)
        ? nativePaid.div(nativeTotal).mul(baseTotal)
        : nativePaid;

    const remaining = Decimal.max(new Decimal(0), baseTotal.sub(basePaid));

    totalBilled = totalBilled.plus(baseTotal);
    totalPaid = totalPaid.plus(basePaid);

    const isSettled =
      inv.status === "PAID" ||
      remaining.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).lte(0);

    if (isSettled) {
      settledInvoicesCount++;
      if (inv.paidAt && inv.dueDate) {
        const paidTime = new Date(inv.paidAt).getTime();
        const dueTime = new Date(inv.dueDate).getTime();
        const delayDays = Math.round((paidTime - dueTime) / (1000 * 60 * 60 * 24));
        // Non-negative latency: paying early (<=0) counts as 0 delay days
        totalDelayDays += Math.max(0, delayDays);
      }
    } else {
      // Open / Pending invoice
      openInvoicesCount++;
      outstandingBalance = outstandingBalance.plus(remaining);

      const isOverdue = inv.status === "OVERDUE" || new Date(inv.dueDate).getTime() < now.getTime();
      if (isOverdue) {
        overdueInvoicesCount++;
        overdueAmount = overdueAmount.plus(remaining);
      }
    }
  }

  const avgPaymentDelayDays =
    settledInvoicesCount > 0 ? Math.round((totalDelayDays / settledInvoicesCount) * 10) / 10 : 0;

  const roundedOverdue = overdueAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

  // Determine dynamic risk status:
  // - CRITICAL: overdue balance AND average delay > 14 days, or severe delay > 21 days
  // - WATCHLIST: overdue balance OR average delay > 3 days
  // - HEALTHY: timely settlements (<= 3 days delay) and zero overdue invoices
  let riskStatus: ClientRiskStatus = "HEALTHY";
  if ((roundedOverdue > 0 && avgPaymentDelayDays > 14) || avgPaymentDelayDays > 21) {
    riskStatus = "CRITICAL";
  } else if (roundedOverdue > 0 || avgPaymentDelayDays > 3) {
    riskStatus = "WATCHLIST";
  }

  return {
    totalBilled: totalBilled.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    totalPaid: totalPaid.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    outstandingBalance: outstandingBalance.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    overdueAmount: roundedOverdue,
    avgPaymentDelayDays,
    settledInvoicesCount,
    openInvoicesCount,
    overdueInvoicesCount,
    riskStatus,
  };
}

/**
 * Creates a new client within the tenant's company boundary.
 */
export async function createClient(
  companyId: string,
  rawInput: CreateClientInput
): Promise<ClientRecord> {
  const validated = createClientSchema.parse(rawInput);

  // Guard against duplicate active clients with the same billing email in this company
  const existing = await db.client.findFirst({
    where: {
      companyId,
      email: validated.email,
      deletedAt: null,
    },
  });

  if (existing) {
    throw new Error(`A client with billing email "${validated.email}" already exists.`);
  }

  const client = await db.client.create({
    data: {
      companyId,
      clientName: validated.clientName,
      email: validated.email,
      phone: validated.phone || null,
      address: validated.address || null,
      paymentTermsDays: validated.paymentTermsDays,
      riskStatus: "HEALTHY",
    },
  });

  return sanitizeClientRecord(client);
}

/**
 * Updates an existing client with company tenancy validation.
 */
export async function updateClient(
  companyId: string,
  rawInput: UpdateClientInput
): Promise<ClientRecord> {
  const validated = updateClientSchema.parse(rawInput);

  const existing = await db.client.findFirst({
    where: {
      id: validated.id,
      companyId,
      deletedAt: null,
    },
  });

  if (!existing) {
    throw new Error("Client not found or access denied.");
  }

  // If email is changing, verify no other active client in this company has it
  if (validated.email && validated.email !== existing.email) {
    const duplicate = await db.client.findFirst({
      where: {
        companyId,
        email: validated.email,
        id: { not: validated.id },
        deletedAt: null,
      },
    });

    if (duplicate) {
      throw new Error(`Another client with email "${validated.email}" already exists.`);
    }
  }

  const updated = await db.client.update({
    where: { id: validated.id },
    data: {
      ...(validated.clientName !== undefined && { clientName: validated.clientName }),
      ...(validated.email !== undefined && { email: validated.email }),
      ...(validated.phone !== undefined && { phone: validated.phone || null }),
      ...(validated.address !== undefined && { address: validated.address || null }),
      ...(validated.paymentTermsDays !== undefined && { paymentTermsDays: validated.paymentTermsDays }),
    },
  });

  return sanitizeClientRecord(updated);
}

/**
 * Soft deletes a client by setting deletedAt.
 * Preserves financial integrity and historical invoice relationships.
 */
export async function softDeleteClient(
  companyId: string,
  clientId: string
): Promise<ClientRecord> {
  const existing = await db.client.findFirst({
    where: {
      id: clientId,
      companyId,
      deletedAt: null,
    },
  });

  if (!existing) {
    throw new Error("Client not found or access denied.");
  }

  const deleted = await db.client.update({
    where: { id: clientId },
    data: {
      deletedAt: new Date(),
    },
  });

  return sanitizeClientRecord(deleted);
}

/**
 * Fetches a single client by ID with computed metrics and invoice ledger history.
 */
export async function getClientById(
  companyId: string,
  clientId: string
): Promise<ClientDetailWithInvoices | null> {
  const client = await db.client.findFirst({
    where: {
      id: clientId,
      companyId,
      deletedAt: null,
    },
    include: {
      invoices: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { issueDate: "desc" },
      },
    },
  });

  if (!client) return null;

  const metrics = calculateClientMetrics(client.invoices);
  const clientRecord = sanitizeClientRecord(client);

  const now = Date.now();
  const invoices = client.invoices.map((inv) => {
    let delayDays = 0;
    if (inv.paidAt && inv.dueDate) {
      delayDays = Math.max(
        0,
        Math.round((new Date(inv.paidAt).getTime() - new Date(inv.dueDate).getTime()) / 86400000)
      );
    } else if (inv.dueDate && new Date(inv.dueDate).getTime() < now) {
      delayDays = Math.max(
        0,
        Math.round((now - new Date(inv.dueDate).getTime()) / 86400000)
      );
    }

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      currency: inv.currency,
      totalAmount: Number(inv.totalAmount) || 0,
      baseTotalAmount: Number(inv.baseTotalAmount) || 0,
      paidAmount: Number(inv.paidAmount) || 0,
      status: inv.status,
      viewToken: inv.viewToken,
      delayDays,
    };
  });

  return {
    ...clientRecord,
    metrics,
    invoices,
  };
}

/**
 * Retrieves all active clients for a company with metrics, filtering, and sorting.
 */
export async function getClients(
  companyId: string,
  filters?: Partial<ClientFilterSchemaInput>
): Promise<ClientWithMetrics[]> {
  const search = filters?.search?.trim();

  const whereClause: Prisma.ClientWhereInput = {
    companyId,
    deletedAt: null,
  };

  if (search) {
    whereClause.OR = [
      { clientName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const clients = await db.client.findMany({
    where: whereClause,
    include: {
      invoices: {
        where: { status: { not: "CANCELLED" } },
        select: {
          id: true,
          status: true,
          dueDate: true,
          paidAt: true,
          totalAmount: true,
          baseTotalAmount: true,
          paidAmount: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let enriched: ClientWithMetrics[] = clients.map((client) => {
    const metrics = calculateClientMetrics(client.invoices);
    return {
      ...sanitizeClientRecord(client),
      metrics,
    };
  });

  // Filter by riskStatus
  if (filters?.riskStatus && filters.riskStatus !== "ALL") {
    enriched = enriched.filter((c) => c.metrics.riskStatus === filters.riskStatus);
  }

  // Sort results
  const sortBy = filters?.sortBy || "createdAt";
  const sortOrder = filters?.sortOrder || "desc";

  enriched.sort((a, b) => {
    let comparison = 0;
    if (sortBy === "name") {
      comparison = a.clientName.localeCompare(b.clientName);
    } else if (sortBy === "latency") {
      comparison = a.metrics.avgPaymentDelayDays - b.metrics.avgPaymentDelayDays;
    } else if (sortBy === "outstanding") {
      comparison = a.metrics.outstandingBalance - b.metrics.outstandingBalance;
    } else {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  return enriched;
}

/**
 * Calculates Accounts Receivable (A/R) Aging Buckets across all active clients for a company.
 * Categorizes unpaid invoices into Current, 1-30, 31-60, 61-90, and 90+ days past due.
 */
export async function getARAgingBuckets(companyId: string): Promise<ARAgingBuckets> {
  const openInvoices = await db.invoice.findMany({
    where: {
      companyId,
      status: { in: ["SENT", "OVERDUE"] },
      client: { deletedAt: null },
    },
    select: {
      dueDate: true,
      totalAmount: true,
      baseTotalAmount: true,
      paidAmount: true,
    },
  });

  const now = new Date();
  let current = new Decimal(0);
  let days1to30 = new Decimal(0);
  let days31to60 = new Decimal(0);
  let days61to90 = new Decimal(0);
  let days90Plus = new Decimal(0);
  let totalOutstanding = new Decimal(0);
  let totalOverdue = new Decimal(0);

  for (const inv of openInvoices) {
    const baseTotal = toDecimal(inv.baseTotalAmount);
    const nativePaid = toDecimal(inv.paidAmount);
    const nativeTotal =
      inv.totalAmount !== undefined && inv.totalAmount !== null
        ? toDecimal(inv.totalAmount)
        : null;

    const basePaid =
      nativeTotal && nativeTotal.gt(0)
        ? nativePaid.div(nativeTotal).mul(baseTotal)
        : nativePaid;

    const remaining = Decimal.max(new Decimal(0), baseTotal.sub(basePaid));

    if (remaining.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).lte(0)) continue;

    totalOutstanding = totalOutstanding.plus(remaining);

    const dueTime = new Date(inv.dueDate).getTime();
    const diffDays = Math.floor((now.getTime() - dueTime) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      current = current.plus(remaining);
    } else {
      totalOverdue = totalOverdue.plus(remaining);
      if (diffDays <= 30) {
        days1to30 = days1to30.plus(remaining);
      } else if (diffDays <= 60) {
        days31to60 = days31to60.plus(remaining);
      } else if (diffDays <= 90) {
        days61to90 = days61to90.plus(remaining);
      } else {
        days90Plus = days90Plus.plus(remaining);
      }
    }
  }

  return {
    current: current.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    days1to30: days1to30.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    days31to60: days31to60.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    days61to90: days61to90.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    days90Plus: days90Plus.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    totalOutstanding: totalOutstanding.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    totalOverdue: totalOverdue.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
  };
}

/**
 * Bulk imports up to 500 clients in a single database transaction with duplicate handling and audit logging.
 */
export async function bulkImportClients(
  companyId: string,
  rows: BulkClientRowInput[],
  options?: BulkImportClientsOptions,
  userId?: string
): Promise<BulkImportClientsResult> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("At least one client row is required for import.");
  }
  if (rows.length > 500) {
    throw new Error("Maximum 500 client rows allowed per import.");
  }

  const duplicateMode = options?.duplicateMode === "fail" ? "fail" : "skip";

  const existingClients = await db.client.findMany({
    where: {
      companyId,
      deletedAt: null,
    },
    select: {
      email: true,
    },
  });

  const existingEmailSet = new Set(
    existingClients.map((c) => c.email.trim().toLowerCase())
  );
  const seenCsvEmails = new Set<string>();

  const skipped: BulkClientRowFeedback[] = [];
  const errors: BulkClientRowFeedback[] = [];
  const validRows: Array<{
    clientName: string;
    email: string;
    phone: string | null;
    address: string | null;
    paymentTermsDays: number;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = row.rowNumber ?? i + 2;
    const normalizedTerms = parsePaymentTerms(row.paymentTermsDays);

    const parsed = createClientSchema.safeParse({
      clientName: row.clientName,
      email: row.email,
      phone: row.phone ?? null,
      address: row.address ?? null,
      paymentTermsDays: normalizedTerms,
    });

    if (!parsed.success) {
      errors.push({
        rowNumber,
        clientName: typeof row.clientName === "string" ? row.clientName : undefined,
        email: typeof row.email === "string" ? row.email : undefined,
        message: parsed.error.issues[0]?.message || "Invalid client row.",
      });
      continue;
    }

    const normalizedEmail = parsed.data.email.toLowerCase();

    if (seenCsvEmails.has(normalizedEmail)) {
      errors.push({
        rowNumber,
        clientName: parsed.data.clientName,
        email: normalizedEmail,
        message: `Duplicate email "${normalizedEmail}" found in CSV.`,
      });
      continue;
    }
    seenCsvEmails.add(normalizedEmail);

    if (existingEmailSet.has(normalizedEmail)) {
      if (duplicateMode === "fail") {
        errors.push({
          rowNumber,
          clientName: parsed.data.clientName,
          email: normalizedEmail,
          message: `A client with billing email "${normalizedEmail}" already exists.`,
        });
      } else {
        skipped.push({
          rowNumber,
          clientName: parsed.data.clientName,
          email: normalizedEmail,
          message: `Client with email "${normalizedEmail}" already exists (skipped).`,
        });
      }
      continue;
    }

    validRows.push({
      clientName: parsed.data.clientName,
      email: normalizedEmail,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      paymentTermsDays: parsed.data.paymentTermsDays,
    });
  }

  let createdClients: ClientRecord[] = [];

  if (validRows.length > 0) {
    createdClients = await db.$transaction(
      async (tx) => {
        const inserted = await tx.client.createManyAndReturn({
          data: validRows.map((item) => ({
            companyId,
            clientName: item.clientName,
            email: item.email,
            phone: item.phone,
            address: item.address,
            paymentTermsDays: item.paymentTermsDays,
            riskStatus: "HEALTHY",
          })),
        });

        const sanitized = inserted.map(sanitizeClientRecord);

        await tx.auditLog.create({
          data: {
            companyId,
            userId: userId || null,
            entityType: "CLIENT",
            entityId: sanitized[0]?.id || companyId,
            action: "CREATE",
            details: JSON.stringify({
              source: "CSV_BULK_IMPORT",
              createdCount: sanitized.length,
              skippedCount: skipped.length,
              failedCount: errors.length,
            }),
          },
        });

        return sanitized;
      },
      { maxWait: 15000, timeout: 30000 }
    );
  }

  return {
    createdCount: createdClients.length,
    skippedCount: skipped.length,
    failedCount: errors.length,
    createdClients,
    skipped,
    errors,
  };
}

/**
 * Next.js High-Performance Cached Queries (Multi-Tenant Tagged):
 * - Keyed by tenant companyId and query parameters
 * - Tagged with `clients-${companyId}` and `aging-${companyId}`
 * - Stored in memory/Edge cache across requests; revalidated on-demand on writes.
 */

export function getCachedClients(
  companyId: string,
  filters?: Partial<ClientFilterSchemaInput>
): Promise<ClientWithMetrics[]> {
  const search = filters?.search?.trim() || "";
  const riskStatus = filters?.riskStatus || "ALL";
  const sortBy = filters?.sortBy || "createdAt";
  const sortOrder = filters?.sortOrder || "desc";

  return unstable_cache(
    async () => getClients(companyId, filters),
    ["clients-list", companyId, search, riskStatus, sortBy, sortOrder],
    {
      tags: [`clients-${companyId}`],
      revalidate: 3600,
    }
  )();
}

export function getCachedARAgingBuckets(companyId: string): Promise<ARAgingBuckets> {
  return unstable_cache(
    async () => getARAgingBuckets(companyId),
    ["aging-buckets", companyId],
    {
      tags: [`aging-${companyId}`],
      revalidate: 3600,
    }
  )();
}

export function getCachedClientById(
  companyId: string,
  clientId: string
): Promise<ClientDetailWithInvoices | null> {
  return unstable_cache(
    async () => getClientById(companyId, clientId),
    ["client-detail", companyId, clientId],
    {
      tags: [`client-${companyId}-${clientId}`, `clients-${companyId}`],
      revalidate: 3600,
    }
  )();
}

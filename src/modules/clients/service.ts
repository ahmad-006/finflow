import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createClientSchema, updateClientSchema, type ClientFilterSchemaInput } from "./validation";
import type {
  ClientRecord,
  ClientWithMetrics,
  ClientDetailWithInvoices,
  ClientMetrics,
  ARAgingBuckets,
  CreateClientInput,
  UpdateClientInput,
  ClientRiskStatus,
} from "./types";

interface InvoiceRecordForMetrics {
  id: string;
  status: string;
  dueDate: Date;
  paidAt: Date | null;
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
  let totalBilled = 0;
  let totalPaid = 0;
  let outstandingBalance = 0;
  let overdueAmount = 0;
  let settledInvoicesCount = 0;
  let openInvoicesCount = 0;
  let overdueInvoicesCount = 0;
  let totalDelayDays = 0;

  const now = new Date();

  for (const inv of invoices) {
    if (inv.status === "CANCELLED") continue;

    const total = Number(inv.baseTotalAmount) || 0;
    const paid = Number(inv.paidAmount) || 0;
    const remaining = Math.max(0, total - paid);

    totalBilled += total;
    totalPaid += paid;

    const isSettled = inv.status === "PAID" || remaining <= 0;

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
      outstandingBalance += remaining;

      const isOverdue = inv.status === "OVERDUE" || new Date(inv.dueDate).getTime() < now.getTime();
      if (isOverdue) {
        overdueInvoicesCount++;
        overdueAmount += remaining;
      }
    }
  }

  const avgPaymentDelayDays =
    settledInvoicesCount > 0 ? Math.round((totalDelayDays / settledInvoicesCount) * 10) / 10 : 0;

  // Determine dynamic risk status:
  // - CRITICAL: overdue balance AND average delay > 14 days, or severe delay > 21 days
  // - WATCHLIST: overdue balance OR average delay > 3 days
  // - HEALTHY: timely settlements (<= 3 days delay) and zero overdue invoices
  let riskStatus: ClientRiskStatus = "HEALTHY";
  if ((overdueAmount > 0 && avgPaymentDelayDays > 14) || avgPaymentDelayDays > 21) {
    riskStatus = "CRITICAL";
  } else if (overdueAmount > 0 || avgPaymentDelayDays > 3) {
    riskStatus = "WATCHLIST";
  }

  return {
    totalBilled: Math.round(totalBilled * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    outstandingBalance: Math.round(outstandingBalance * 100) / 100,
    overdueAmount: Math.round(overdueAmount * 100) / 100,
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
      baseTotalAmount: true,
      paidAmount: true,
    },
  });

  const now = new Date();
  const buckets: ARAgingBuckets = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days90Plus: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
  };

  for (const inv of openInvoices) {
    const total = Number(inv.baseTotalAmount) || 0;
    const paid = Number(inv.paidAmount) || 0;
    const remaining = Math.max(0, total - paid);

    if (remaining <= 0) continue;

    buckets.totalOutstanding += remaining;

    const dueTime = new Date(inv.dueDate).getTime();
    const diffDays = Math.floor((now.getTime() - dueTime) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      buckets.current += remaining;
    } else {
      buckets.totalOverdue += remaining;
      if (diffDays <= 30) {
        buckets.days1to30 += remaining;
      } else if (diffDays <= 60) {
        buckets.days31to60 += remaining;
      } else if (diffDays <= 90) {
        buckets.days61to90 += remaining;
      } else {
        buckets.days90Plus += remaining;
      }
    }
  }

  buckets.current = Math.round(buckets.current * 100) / 100;
  buckets.days1to30 = Math.round(buckets.days1to30 * 100) / 100;
  buckets.days31to60 = Math.round(buckets.days31to60 * 100) / 100;
  buckets.days61to90 = Math.round(buckets.days61to90 * 100) / 100;
  buckets.days90Plus = Math.round(buckets.days90Plus * 100) / 100;
  buckets.totalOutstanding = Math.round(buckets.totalOutstanding * 100) / 100;
  buckets.totalOverdue = Math.round(buckets.totalOverdue * 100) / 100;

  return buckets;
}

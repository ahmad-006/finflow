import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import {
  calculateInvoiceTotals,
  toDecimal,
  roundMoney,
  DEFAULT_EXCHANGE_RATES,
} from "./currency";
import { getLiveExchangeRates } from "./rates";
import type {
  InvoiceWithItemsAndClient,
  InvoiceItemRecord,
  InvoiceStatus,
  InvoiceCurrency,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  RecordPaymentInput,
  InvoiceFilters,
  InvoiceKPIs,
  BulkInvoiceRowInput,
  BulkInvoiceRowFeedback,
  BulkImportInvoicesOptions,
  BulkImportInvoicesResult,
} from "./types";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  recordPaymentSchema,
  bulkInvoiceRowSchema,
} from "./validation";

type PrismaInvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    client: {
      select: {
        id: true;
        clientName: true;
        email: true;
        paymentTermsDays: true;
        phone: true;
        address: true;
      };
    };
    items: true;
  };
}>;

/**
 * Sanitizes an invoice item from Prisma Decimal to standard JS numbers.
 */
function sanitizeInvoiceItem(item: {
  id: string;
  companyId: string;
  invoiceId: string;
  description: string;
  quantity: Prisma.Decimal | number;
  unitPrice: Prisma.Decimal | number;
  lineTotal: Prisma.Decimal | number;
}): InvoiceItemRecord {
  return {
    id: item.id,
    companyId: item.companyId,
    invoiceId: item.invoiceId,
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    lineTotal: Number(item.lineTotal),
  };
}

/**
 * Sanitizes a Prisma invoice entity and dynamically resolves OVERDUE status for unpaid invoices past due date.
 */
export function sanitizeInvoice(raw: PrismaInvoiceWithRelations): InvoiceWithItemsAndClient {
  const now = new Date();
  let status = raw.status as InvoiceStatus;

  // Dynamically resolve OVERDUE if invoice is SENT, not fully paid, and due date has passed
  if (status === "SENT" && Number(raw.paidAmount) < Number(raw.totalAmount)) {
    if (new Date(raw.dueDate).getTime() < now.getTime()) {
      status = "OVERDUE";
    }
  }

  return {
    id: raw.id,
    companyId: raw.companyId,
    clientId: raw.clientId,
    invoiceNumber: raw.invoiceNumber,
    viewToken: raw.viewToken,
    currency: raw.currency as InvoiceCurrency,
    exchangeRate: Number(raw.exchangeRate),
    issueDate: raw.issueDate,
    dueDate: raw.dueDate,
    subtotal: Number(raw.subtotal),
    taxRate: Number(raw.taxRate),
    taxAmount: Number(raw.taxAmount),
    totalAmount: Number(raw.totalAmount),
    baseTotalAmount: Number(raw.baseTotalAmount),
    paidAmount: Number(raw.paidAmount),
    status,
    notes: raw.notes,
    paidAt: raw.paidAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    client: {
      id: raw.client.id,
      clientName: raw.client.clientName,
      email: raw.client.email,
      paymentTermsDays: raw.client.paymentTermsDays,
      phone: raw.client.phone,
      address: raw.client.address,
    },
    items: (raw.items || []).map(sanitizeInvoiceItem),
  };
}

/**
 * Generates an atomic, sequential invoice number per company and calendar year: INV-YYYY-XXXX.
 */
export async function generateInvoiceNumber(
  tx: Prisma.TransactionClient | typeof db,
  companyId: string,
  issueDate: Date | string = new Date()
): Promise<string> {
  const date = new Date(issueDate);
  const year = isNaN(date.getFullYear()) ? new Date().getFullYear() : date.getFullYear();
  const prefix = `INV-${year}-`;

  const latest = await tx.invoice.findFirst({
    where: {
      companyId,
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: "desc",
    },
    select: {
      invoiceNumber: true,
    },
  });

  let nextSequence = 1;
  if (latest?.invoiceNumber) {
    const parts = latest.invoiceNumber.split("-");
    const lastNumStr = parts[parts.length - 1];
    const parsed = parseInt(lastNumStr, 10);
    if (!isNaN(parsed)) {
      nextSequence = parsed + 1;
    }
  }

  const padded = String(nextSequence).padStart(4, "0");
  return `${prefix}${padded}`;
}

/**
 * Creates a new invoice with atomic sequential numbering, line item calculations, and multi-currency normalization.
 */
export async function createInvoice(
  companyId: string,
  input: CreateInvoiceInput
): Promise<InvoiceWithItemsAndClient> {
  const validated = createInvoiceSchema.parse(input);

  // Verify client exists and belongs to the company, and fetch company baseCurrency
  const [client, company] = await Promise.all([
    db.client.findFirst({
      where: {
        id: validated.clientId,
        companyId,
        deletedAt: null,
      },
    }),
    db.company.findUnique({
      where: { id: companyId },
      select: { baseCurrency: true },
    }),
  ]);

  if (!client) {
    throw new Error("Client not found or does not belong to your organization.");
  }

  const baseCurrency = ((company?.baseCurrency || "PKR").toUpperCase()) as InvoiceCurrency;

  // Calculate totals and base currency conversion
  const calc = calculateInvoiceTotals(
    validated.items,
    validated.taxRate,
    validated.currency,
    validated.exchangeRate,
    baseCurrency
  );

  return await db.$transaction(
    async (tx) => {
      const invoiceNumber = await generateInvoiceNumber(tx, companyId, validated.issueDate);
      const viewToken = crypto.randomUUID();

      const created = await tx.invoice.create({
        data: {
          companyId,
          clientId: validated.clientId,
          invoiceNumber,
          viewToken,
          currency: validated.currency,
          exchangeRate: new Prisma.Decimal(calc.exchangeRate),
          issueDate: new Date(validated.issueDate),
          dueDate: new Date(validated.dueDate),
          subtotal: new Prisma.Decimal(calc.subtotal),
          taxRate: new Prisma.Decimal(calc.taxRate),
          taxAmount: new Prisma.Decimal(calc.taxAmount),
          totalAmount: new Prisma.Decimal(calc.totalAmount),
          baseTotalAmount: new Prisma.Decimal(calc.baseTotalAmount),
          paidAmount: new Prisma.Decimal(0),
          status: "DRAFT",
          notes: validated.notes || null,
          items: {
            create: calc.lineItems.map((item, idx) => ({
              companyId,
              description: validated.items[idx].description.trim(),
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              lineTotal: new Prisma.Decimal(item.lineTotal),
            })),
          },
        },
        include: {
          client: {
            select: {
              id: true,
              clientName: true,
              email: true,
              paymentTermsDays: true,
              phone: true,
              address: true,
            },
          },
          items: true,
        },
      });

      return sanitizeInvoice(created);
    },
    { maxWait: 15000, timeout: 30000 }
  );
}

/**
 * Updates an invoice (financial details only modifiable while in DRAFT status).
 */
export async function updateInvoice(
  companyId: string,
  input: UpdateInvoiceInput
): Promise<InvoiceWithItemsAndClient> {
  const validated = updateInvoiceSchema.parse(input);

  const existing = await db.invoice.findFirst({
    where: {
      id: validated.id,
      companyId,
    },
    include: {
      items: true,
      client: true,
      company: {
        select: { baseCurrency: true },
      },
    },
  });

  if (!existing) {
    throw new Error("Invoice not found.");
  }

  if (existing.status === "PAID" || existing.status === "CANCELLED") {
    throw new Error(`Cannot modify an invoice with status ${existing.status}.`);
  }

  const baseCurrency = ((existing.company?.baseCurrency || "PKR").toUpperCase()) as InvoiceCurrency;

  return await db.$transaction(async (tx) => {
    // If line items or financial parameters are being updated
    if (validated.items || validated.taxRate !== undefined || validated.currency || validated.exchangeRate) {
      const itemsToCalculate = validated.items || existing.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
      }));

      const currency = (validated.currency || existing.currency) as InvoiceCurrency;
      const taxRate = validated.taxRate !== undefined ? validated.taxRate : Number(existing.taxRate);
      const exchangeRate = validated.exchangeRate !== undefined ? validated.exchangeRate : Number(existing.exchangeRate);

      const calc = calculateInvoiceTotals(
        itemsToCalculate,
        taxRate,
        currency,
        exchangeRate,
        baseCurrency
      );

      // Recreate items if provided
      if (validated.items) {
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: existing.id, companyId },
        });

        await tx.invoiceItem.createMany({
          data: calc.lineItems.map((item, idx) => ({
            companyId,
            invoiceId: existing.id,
            description: validated.items![idx].description.trim(),
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            lineTotal: new Prisma.Decimal(item.lineTotal),
          })),
        });
      }

      const updated = await tx.invoice.update({
        where: { id: existing.id },
        data: {
          clientId: validated.clientId || existing.clientId,
          currency,
          exchangeRate: new Prisma.Decimal(calc.exchangeRate),
          issueDate: validated.issueDate ? new Date(validated.issueDate) : existing.issueDate,
          dueDate: validated.dueDate ? new Date(validated.dueDate) : existing.dueDate,
          subtotal: new Prisma.Decimal(calc.subtotal),
          taxRate: new Prisma.Decimal(calc.taxRate),
          taxAmount: new Prisma.Decimal(calc.taxAmount),
          totalAmount: new Prisma.Decimal(calc.totalAmount),
          baseTotalAmount: new Prisma.Decimal(calc.baseTotalAmount),
          notes: validated.notes !== undefined ? validated.notes : existing.notes,
        },
        include: {
          client: {
            select: {
              id: true,
              clientName: true,
              email: true,
              paymentTermsDays: true,
              phone: true,
              address: true,
            },
          },
          items: true,
        },
      });

      return sanitizeInvoice(updated);
    }

    // Simple metadata update (notes, dates)
    const updated = await tx.invoice.update({
      where: { id: existing.id },
      data: {
        clientId: validated.clientId || existing.clientId,
        issueDate: validated.issueDate ? new Date(validated.issueDate) : existing.issueDate,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : existing.dueDate,
        notes: validated.notes !== undefined ? validated.notes : existing.notes,
      },
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            email: true,
            paymentTermsDays: true,
            phone: true,
            address: true,
          },
        },
        items: true,
      },
    });

    return sanitizeInvoice(updated);
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Transitions an invoice from DRAFT to SENT.
 */
export async function markInvoiceSent(
  companyId: string,
  invoiceId: string
): Promise<InvoiceWithItemsAndClient> {
  const existing = await db.invoice.findFirst({
    where: { id: invoiceId, companyId },
  });

  if (!existing) {
    throw new Error("Invoice not found.");
  }

  if (existing.status !== "DRAFT") {
    throw new Error(`Only DRAFT invoices can be marked as SENT. Current status: ${existing.status}`);
  }

  const now = new Date();
  const isOverdue = new Date(existing.dueDate).getTime() < now.getTime();
  const nextStatus = isOverdue ? "OVERDUE" : "SENT";

  const updated = await db.invoice.update({
    where: { id: invoiceId },
    data: { status: nextStatus },
    include: {
      client: {
        select: {
          id: true,
          clientName: true,
          email: true,
          paymentTermsDays: true,
          phone: true,
          address: true,
        },
      },
      items: true,
    },
  });

  return sanitizeInvoice(updated);
}

/**
 * Records a payment against an invoice, adjusting status to PAID and generating an INFLOW transaction.
 */
export async function recordInvoicePayment(
  companyId: string,
  input: RecordPaymentInput
): Promise<InvoiceWithItemsAndClient> {
  const validated = recordPaymentSchema.parse(input);

  return await db.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: { id: validated.invoiceId, companyId },
    });

    if (!existing) {
      throw new Error("Invoice not found.");
    }

    if (existing.status === "PAID") {
      throw new Error("Invoice is already fully paid.");
    }

    if (existing.status === "CANCELLED") {
      throw new Error("Cannot record payment on a cancelled invoice.");
    }

    const currentPaid = Number(existing.paidAmount) || 0;
    const newPaid = currentPaid + validated.paidAmount;
    const total = Number(existing.totalAmount);
    const isFullyPaid = newPaid >= total;
    const paymentDate = validated.paidAt ? new Date(validated.paidAt) : new Date();

    const updated = await tx.invoice.update({
      where: { id: existing.id },
      data: {
        paidAmount: new Prisma.Decimal(newPaid),
        status: isFullyPaid ? "PAID" : existing.status === "DRAFT" ? "SENT" : existing.status,
        paidAt: isFullyPaid ? paymentDate : existing.paidAt,
      },
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            email: true,
            paymentTermsDays: true,
            phone: true,
            address: true,
          },
        },
        items: true,
      },
    });

    // Record cash inflow transaction
    const basePaymentAmount = roundMoney(
      toDecimal(validated.paidAmount).mul(toDecimal(Number(existing.exchangeRate)))
    ).toNumber();

    await tx.transaction.create({
      data: {
        companyId,
        invoiceId: existing.id,
        type: "INFLOW",
        amount: new Prisma.Decimal(validated.paidAmount),
        baseAmount: new Prisma.Decimal(basePaymentAmount),
        transactionDate: paymentDate,
        category: "INVOICE_PAYMENT",
        paymentMethod: "BANK_TRANSFER",
        reference: `Payment for ${existing.invoiceNumber}${validated.notes ? ` - ${validated.notes}` : ""}`,
      },
    });

    return sanitizeInvoice(updated);
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Cancels an invoice.
 */
export async function cancelInvoice(
  companyId: string,
  invoiceId: string
): Promise<InvoiceWithItemsAndClient> {
  const existing = await db.invoice.findFirst({
    where: { id: invoiceId, companyId },
  });

  if (!existing) {
    throw new Error("Invoice not found.");
  }

  if (existing.status === "PAID") {
    throw new Error("Cannot cancel an already settled invoice. Please process a refund or credit note.");
  }

  const updated = await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "CANCELLED" },
    include: {
      client: {
        select: {
          id: true,
          clientName: true,
          email: true,
          paymentTermsDays: true,
          phone: true,
          address: true,
        },
      },
      items: true,
    },
  });

  return sanitizeInvoice(updated);
}

export interface GetInvoicesResult {
  invoices: InvoiceWithItemsAndClient[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Retrieves a filtered, paginated list of invoices for the company.
 */
export async function getInvoices(
  companyId: string,
  filters?: InvoiceFilters
): Promise<GetInvoicesResult> {
  const page = Math.max(1, filters?.page || 1);
  const limit = Math.min(100, Math.max(1, filters?.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.InvoiceWhereInput = {
    companyId,
  };

  if (filters?.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters?.currency && filters.currency !== "ALL") {
    where.currency = filters.currency;
  }

  if (filters?.startDate || filters?.endDate) {
    where.issueDate = {};
    if (filters.startDate) {
      where.issueDate.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.issueDate.lte = new Date(filters.endDate);
    }
  }

  if (filters?.search && filters.search.trim() !== "") {
    const term = filters.search.trim();
    where.OR = [
      { invoiceNumber: { contains: term, mode: "insensitive" } },
      { client: { clientName: { contains: term, mode: "insensitive" } } },
    ];
  }

  const orderByField = filters?.sortBy || "issueDate";
  const orderDirection = filters?.sortOrder || "desc";

  const [rawInvoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            email: true,
            paymentTermsDays: true,
            phone: true,
            address: true,
          },
        },
        items: filters?.includeItems ? true : false,
      },
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    db.invoice.count({ where }),
  ]);

  return {
    invoices: rawInvoices.map(sanitizeInvoice),
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Retrieves a single invoice by its ID within the tenant company boundary.
 */
export async function getInvoiceById(
  companyId: string,
  invoiceId: string
): Promise<InvoiceWithItemsAndClient | null> {
  const invoice = await db.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
    include: {
      client: {
        select: {
          id: true,
          clientName: true,
          email: true,
          paymentTermsDays: true,
          phone: true,
          address: true,
        },
      },
      items: true,
    },
  });

  if (!invoice) return null;
  return sanitizeInvoice(invoice);
}

export interface PublicInvoiceGuestView {
  invoice: InvoiceWithItemsAndClient;
  company: {
    id: string;
    name: string;
    baseCurrency: string;
  };
}

/**
 * Public/Guest link lookup via unique unguessable viewToken.
 */
export async function getInvoiceByViewToken(viewToken: string): Promise<PublicInvoiceGuestView | null> {
  const invoice = await db.invoice.findUnique({
    where: { viewToken },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          baseCurrency: true,
        },
      },
      client: {
        select: {
          id: true,
          clientName: true,
          email: true,
          paymentTermsDays: true,
          phone: true,
          address: true,
        },
      },
      items: true,
    },
  });

  if (!invoice) return null;

  return {
    invoice: sanitizeInvoice(invoice),
    company: invoice.company,
  };
}

/**
 * Computes executive KPI summary metrics for the invoices dashboard.
 */
export async function getInvoiceKPIs(companyId: string): Promise<InvoiceKPIs> {
  const invoices = await db.invoice.findMany({
    where: { companyId },
    select: {
      status: true,
      dueDate: true,
      totalAmount: true,
      baseTotalAmount: true,
      paidAmount: true,
      paidAt: true,
    },
  });

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let totalOutstanding = 0;
  let totalOverdue = 0;
  let totalPaidThisMonth = 0;
  let totalDrafts = 0;
  let activeCount = 0;
  let overdueCount = 0;

  for (const inv of invoices) {
    if (inv.status === "CANCELLED") continue;

    const total = Number(inv.totalAmount) || 0;
    const baseTotal = Number(inv.baseTotalAmount) || 0;
    const paid = Number(inv.paidAmount) || 0;
    // Calculate base paid proportion in company base currency
    const basePaid = total > 0 ? (paid / total) * baseTotal : 0;
    const remaining = Math.max(0, baseTotal - basePaid);

    if (inv.status === "DRAFT") {
      totalDrafts += baseTotal;
      continue;
    }

    if (inv.status === "PAID" || remaining <= 0) {
      if (inv.paidAt) {
        const pDate = new Date(inv.paidAt);
        if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
          totalPaidThisMonth += basePaid;
        }
      }
      continue;
    }

    // Active / Open invoice (SENT or OVERDUE)
    activeCount++;
    totalOutstanding += remaining;

    const isOverdue = inv.status === "OVERDUE" || new Date(inv.dueDate).getTime() < now.getTime();
    if (isOverdue) {
      overdueCount++;
      totalOverdue += remaining;
    }
  }

  return {
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    totalOverdue: Math.round(totalOverdue * 100) / 100,
    totalPaidThisMonth: Math.round(totalPaidThisMonth * 100) / 100,
    totalDrafts: Math.round(totalDrafts * 100) / 100,
    activeCount,
    overdueCount,
  };
}

/**
 * Next.js Tagged Cached Queries for High-Performance Rendering.
 */
export function getCachedInvoices(
  companyId: string,
  filters?: InvoiceFilters
): Promise<GetInvoicesResult> {
  const key = [
    "invoices-list",
    companyId,
    filters?.status || "ALL",
    filters?.clientId || "",
    filters?.currency || "ALL",
    filters?.search || "",
    String(filters?.page || 1),
    String(filters?.limit || 20),
    filters?.sortBy || "issueDate",
    filters?.sortOrder || "desc",
  ];

  return unstable_cache(
    async () => getInvoices(companyId, filters),
    key,
    {
      tags: [`invoices-${companyId}`],
      revalidate: 3600,
    }
  )();
}

export function getCachedInvoiceById(
  companyId: string,
  invoiceId: string
): Promise<InvoiceWithItemsAndClient | null> {
  return unstable_cache(
    async () => getInvoiceById(companyId, invoiceId),
    ["invoice-detail", companyId, invoiceId],
    {
      tags: [`invoice-${companyId}-${invoiceId}`, `invoices-${companyId}`],
      revalidate: 3600,
    }
  )();
}

export function getCachedInvoiceKPIs(companyId: string): Promise<InvoiceKPIs> {
  return unstable_cache(
    async () => getInvoiceKPIs(companyId),
    ["invoice-kpis", companyId],
    {
      tags: [`invoices-${companyId}`, `kpis-${companyId}`],
      revalidate: 3600,
    }
  )();
}

/**
 * Bulk imports up to 500 invoice line-item rows (grouped by invoiceGroup or standalone)
 * in a single atomic transaction with sequential numbering and audit logging.
 */
export async function bulkImportInvoices(
  companyId: string,
  rows: BulkInvoiceRowInput[],
  options?: BulkImportInvoicesOptions,
  userId?: string
): Promise<BulkImportInvoicesResult> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("At least one invoice row is required for import.");
  }
  if (rows.length > 500) {
    throw new Error("Maximum 500 invoice rows allowed per import.");
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, baseCurrency: true },
  });
  if (!company) {
    throw new Error("Company not found.");
  }

  const baseCurrency = ((company.baseCurrency || "PKR").toUpperCase()) as InvoiceCurrency;
  const liveRates = await getLiveExchangeRates(baseCurrency);

  const activeClients = await db.client.findMany({
    where: {
      companyId,
      deletedAt: null,
    },
    select: {
      id: true,
      clientName: true,
      email: true,
      paymentTermsDays: true,
    },
  });

  const clientsByEmail = new Map<string, (typeof activeClients)[number]>();
  for (const c of activeClients) {
    clientsByEmail.set(c.email.trim().toLowerCase(), c);
  }

  interface RowEntry {
    rowNumber: number;
    raw: BulkInvoiceRowInput;
  }

  interface GroupBucket {
    groupKey: string;
    invoiceGroup?: string;
    entries: RowEntry[];
  }

  const buckets: GroupBucket[] = [];
  const groupBucketMap = new Map<string, GroupBucket>();

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNumber = raw.rowNumber ?? i + 2;
    const rawGroup = typeof raw.invoiceGroup === "string" ? raw.invoiceGroup.trim() : "";

    if (rawGroup !== "") {
      const groupKey = `group:${rawGroup.toLowerCase()}`;
      let bucket = groupBucketMap.get(groupKey);
      if (!bucket) {
        bucket = {
          groupKey,
          invoiceGroup: rawGroup,
          entries: [],
        };
        groupBucketMap.set(groupKey, bucket);
        buckets.push(bucket);
      }
      bucket.entries.push({ rowNumber, raw });
    } else {
      buckets.push({
        groupKey: `single:${i}`,
        entries: [{ rowNumber, raw }],
      });
    }
  }

  const errors: BulkInvoiceRowFeedback[] = [];
  const pendingNewClients = new Map<string, { clientName: string; email: string }>();
  const autoCreateEnabled = options?.autoCreateMissingClients === true;

  interface PreparedInvoice {
    clientEmail: string;
    existingClientId?: string;
    currency: InvoiceCurrency;
    issueDate: Date;
    dueDate: Date;
    status: InvoiceStatus;
    notes: string | null;
    calc: ReturnType<typeof calculateInvoiceTotals>;
    items: Array<{ description: string; quantity: number; unitPrice: number }>;
  }

  const preparedInvoices: PreparedInvoice[] = [];

  for (const bucket of buckets) {
    const parsedEntries: Array<{
      rowNumber: number;
      rawStatusPresent: boolean;
      data: ReturnType<typeof bulkInvoiceRowSchema.parse>;
    }> = [];
    let bucketHasValidationError = false;

    for (const entry of bucket.entries) {
      const parsed = bulkInvoiceRowSchema.safeParse(entry.raw);
      if (!parsed.success) {
        bucketHasValidationError = true;
        errors.push({
          rowNumber: entry.rowNumber,
          invoiceGroup: bucket.invoiceGroup,
          clientEmail: typeof entry.raw.clientEmail === "string" ? entry.raw.clientEmail : undefined,
          message: parsed.error.issues[0]?.message || "Invalid invoice row.",
        });
      } else {
        const rawStatus = typeof entry.raw.status === "string" ? entry.raw.status.trim() : "";
        parsedEntries.push({
          rowNumber: entry.rowNumber,
          rawStatusPresent: rawStatus.length > 0,
          data: parsed.data,
        });
      }
    }

    if (bucketHasValidationError || parsedEntries.length === 0) {
      continue;
    }

    const firstEmail = parsedEntries[0].data.clientEmail.toLowerCase();
    const mixedEmailEntry = parsedEntries.find(
      (e) => e.data.clientEmail.toLowerCase() !== firstEmail
    );
    if (mixedEmailEntry) {
      errors.push({
        rowNumber: mixedEmailEntry.rowNumber,
        invoiceGroup: bucket.invoiceGroup,
        clientEmail: mixedEmailEntry.data.clientEmail,
        message: `Invoice group "${bucket.invoiceGroup}" has mixed client emails (${firstEmail} vs ${mixedEmailEntry.data.clientEmail}).`,
      });
      continue;
    }

    const firstRowNumber = parsedEntries[0].rowNumber;
    const validClientName = parsedEntries
      .map((e) => (e.data.clientName ? e.data.clientName.trim() : ""))
      .find((name) => name.length >= 2);

    const existingClient = clientsByEmail.get(firstEmail);
    let paymentTermsDays = 30;

    if (existingClient) {
      paymentTermsDays = existingClient.paymentTermsDays;
    } else if (autoCreateEnabled) {
      if (!pendingNewClients.has(firstEmail)) {
        if (!validClientName) {
          errors.push({
            rowNumber: firstRowNumber,
            invoiceGroup: bucket.invoiceGroup,
            clientEmail: firstEmail,
            message: `Client "${firstEmail}" not found and requires a clientName (at least 2 characters) to auto-create.`,
          });
          continue;
        }
        pendingNewClients.set(firstEmail, {
          clientName: validClientName,
          email: firstEmail,
        });
      }
    } else {
      errors.push({
        rowNumber: firstRowNumber,
        invoiceGroup: bucket.invoiceGroup,
        clientEmail: firstEmail,
        message: `Client with email "${firstEmail}" not found.`,
      });
      continue;
    }

    const currency =
      (parsedEntries.find((e) => e.data.currency !== undefined)?.data.currency as
        | InvoiceCurrency
        | undefined) ?? baseCurrency;

    const customExchangeRate = parsedEntries.find(
      (e) => e.data.exchangeRate !== undefined
    )?.data.exchangeRate;

    const issueDate = new Date(parsedEntries[0].data.issueDate);
    const explicitDueDate = parsedEntries.find((e) => e.data.dueDate !== undefined)?.data.dueDate;
    const dueDate = explicitDueDate
      ? new Date(explicitDueDate)
      : new Date(issueDate.getTime() + paymentTermsDays * 86400000);

    const issueDay = new Date(issueDate).setHours(0, 0, 0, 0);
    const dueDay = new Date(dueDate).setHours(0, 0, 0, 0);
    if (dueDay < issueDay) {
      errors.push({
        rowNumber: firstRowNumber,
        invoiceGroup: bucket.invoiceGroup,
        clientEmail: firstEmail,
        message: "Due date cannot be earlier than issue date.",
      });
      continue;
    }

    const taxRate = parsedEntries[0].data.taxRate;
    const explicitStatusEntry = parsedEntries.find((e) => e.rawStatusPresent);
    let resolvedStatus: InvoiceStatus = explicitStatusEntry
      ? explicitStatusEntry.data.status
      : parsedEntries[0].data.status;

    if (resolvedStatus === "SENT" && dueDate.getTime() < Date.now()) {
      resolvedStatus = "OVERDUE";
    }

    const notes =
      parsedEntries
        .map((e) => (e.data.notes ? e.data.notes.trim() : ""))
        .find((n) => n.length > 0) || null;

    const resolvedRate =
      currency === baseCurrency
        ? 1.0
        : (customExchangeRate ??
          liveRates[currency] ??
          DEFAULT_EXCHANGE_RATES[currency] ??
          1.0);

    const items = parsedEntries.map((e) => ({
      description: e.data.description.trim(),
      quantity: e.data.quantity,
      unitPrice: e.data.unitPrice,
    }));

    const calc = calculateInvoiceTotals(items, taxRate, currency, resolvedRate, baseCurrency);

    preparedInvoices.push({
      clientEmail: firstEmail,
      existingClientId: existingClient?.id,
      currency,
      issueDate,
      dueDate,
      status: resolvedStatus,
      notes,
      calc,
      items,
    });
  }

  let createdInvoices: InvoiceWithItemsAndClient[] = [];
  let autoCreatedClientsCount = 0;

  if (preparedInvoices.length > 0) {
    const txResult = await db.$transaction(
      async (tx) => {
        const autoCreatedIdByEmail = new Map<string, string>();
        const referencedEmails = new Set(preparedInvoices.map((p) => p.clientEmail));
        const clientsToCreate = Array.from(pendingNewClients.values()).filter((c) =>
          referencedEmails.has(c.email)
        );

        if (clientsToCreate.length > 0) {
          const insertedClients = await tx.client.createManyAndReturn({
            data: clientsToCreate.map((c) => ({
              companyId,
              clientName: c.clientName,
              email: c.email,
              paymentTermsDays: 30,
              riskStatus: "HEALTHY",
            })),
            select: {
              id: true,
              email: true,
            },
          });
          for (const createdClient of insertedClients) {
            autoCreatedIdByEmail.set(createdClient.email.toLowerCase(), createdClient.id);
          }
        }

        // Query latest invoice number ONCE per distinct calendar year
        const distinctYears = Array.from(
          new Set(
            preparedInvoices.map((inv) => {
              const y = inv.issueDate.getFullYear();
              return isNaN(y) ? new Date().getFullYear() : y;
            })
          )
        );

        const yearSequenceMap = new Map<number, number>();
        for (const year of distinctYears) {
          const prefix = `INV-${year}-`;
          const latest = await tx.invoice.findFirst({
            where: {
              companyId,
              invoiceNumber: { startsWith: prefix },
            },
            orderBy: { invoiceNumber: "desc" },
            select: { invoiceNumber: true },
          });

          let lastSeq = 0;
          if (latest?.invoiceNumber) {
            const parts = latest.invoiceNumber.split("-");
            const parsedSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(parsedSeq)) {
              lastSeq = parsedSeq;
            }
          }
          yearSequenceMap.set(year, lastSeq);
        }

        const createdIds: string[] = [];
        const invoiceRowsToInsert: Prisma.InvoiceCreateManyInput[] = [];
        const itemRowsToInsert: Prisma.InvoiceItemCreateManyInput[] = [];

        for (const prep of preparedInvoices) {
          const clientId = prep.existingClientId ?? autoCreatedIdByEmail.get(prep.clientEmail);
          if (!clientId) {
            throw new Error(`Failed to resolve client for "${prep.clientEmail}".`);
          }

          const rawYear = prep.issueDate.getFullYear();
          const year = isNaN(rawYear) ? new Date().getFullYear() : rawYear;
          const nextSeq = (yearSequenceMap.get(year) ?? 0) + 1;
          yearSequenceMap.set(year, nextSeq);
          const invoiceNumber = `INV-${year}-${String(nextSeq).padStart(4, "0")}`;

          const invoiceId = crypto.randomUUID();
          createdIds.push(invoiceId);

          invoiceRowsToInsert.push({
            id: invoiceId,
            companyId,
            clientId,
            invoiceNumber,
            viewToken: crypto.randomUUID(),
            currency: prep.currency,
            exchangeRate: new Prisma.Decimal(prep.calc.exchangeRate),
            issueDate: prep.issueDate,
            dueDate: prep.dueDate,
            subtotal: new Prisma.Decimal(prep.calc.subtotal),
            taxRate: new Prisma.Decimal(prep.calc.taxRate),
            taxAmount: new Prisma.Decimal(prep.calc.taxAmount),
            totalAmount: new Prisma.Decimal(prep.calc.totalAmount),
            baseTotalAmount: new Prisma.Decimal(prep.calc.baseTotalAmount),
            paidAmount: new Prisma.Decimal(0),
            status: prep.status,
            notes: prep.notes,
          });

          prep.calc.lineItems.forEach((calcItem, idx) => {
            itemRowsToInsert.push({
              id: crypto.randomUUID(),
              companyId,
              invoiceId,
              description: prep.items[idx].description,
              quantity: new Prisma.Decimal(calcItem.quantity),
              unitPrice: new Prisma.Decimal(calcItem.unitPrice),
              lineTotal: new Prisma.Decimal(calcItem.lineTotal),
            });
          });
        }

        await tx.invoice.createMany({ data: invoiceRowsToInsert });
        await tx.invoiceItem.createMany({ data: itemRowsToInsert });

        const insertedInvoices = await tx.invoice.findMany({
          where: {
            id: { in: createdIds },
            companyId,
          },
          include: {
            client: {
              select: {
                id: true,
                clientName: true,
                email: true,
                paymentTermsDays: true,
                phone: true,
                address: true,
              },
            },
            items: true,
          },
        });

        const byId = new Map(insertedInvoices.map((inv) => [inv.id, sanitizeInvoice(inv)]));
        const ordered = createdIds
          .map((id) => byId.get(id))
          .filter((inv): inv is InvoiceWithItemsAndClient => Boolean(inv));

        await tx.auditLog.create({
          data: {
            companyId,
            userId: userId || null,
            entityType: "INVOICE",
            entityId: ordered[0]?.id || companyId,
            action: "CREATE",
            details: JSON.stringify({
              source: "CSV_BULK_IMPORT",
              createdCount: ordered.length,
              autoCreatedClientsCount: autoCreatedIdByEmail.size,
              failedCount: errors.length,
            }),
          },
        });

        return {
          createdInvoices: ordered,
          autoCreatedClientsCount: autoCreatedIdByEmail.size,
        };
      },
      { maxWait: 15000, timeout: 45000 }
    );

    createdInvoices = txResult.createdInvoices;
    autoCreatedClientsCount = txResult.autoCreatedClientsCount;
  }

  return {
    createdCount: createdInvoices.length,
    autoCreatedClientsCount,
    failedCount: errors.length,
    createdInvoices,
    errors,
  };
}

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { calculateInvoiceTotals, toDecimal, roundMoney } from "./currency";
import type {
  InvoiceRecord,
  InvoiceWithItemsAndClient,
  InvoiceItemRecord,
  InvoiceStatus,
  InvoiceCurrency,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  RecordPaymentInput,
  InvoiceFilters,
  InvoiceKPIs,
} from "./types";
import { createInvoiceSchema, updateInvoiceSchema, recordPaymentSchema } from "./validation";

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

  // Verify client exists and belongs to the company
  const client = await db.client.findFirst({
    where: {
      id: validated.clientId,
      companyId,
      deletedAt: null,
    },
  });

  if (!client) {
    throw new Error("Client not found or does not belong to your organization.");
  }

  // Calculate totals and base currency conversion
  const calc = calculateInvoiceTotals(
    validated.items,
    validated.taxRate,
    validated.currency,
    validated.exchangeRate
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
    },
  });

  if (!existing) {
    throw new Error("Invoice not found.");
  }

  if (existing.status === "PAID" || existing.status === "CANCELLED") {
    throw new Error(`Cannot modify an invoice with status ${existing.status}.`);
  }

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

      const calc = calculateInvoiceTotals(itemsToCalculate, taxRate, currency, exchangeRate);

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

  const existing = await db.invoice.findFirst({
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

  return await db.$transaction(async (tx) => {
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
        items: true,
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

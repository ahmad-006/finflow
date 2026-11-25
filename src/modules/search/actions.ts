"use server";

import { getSession } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export interface QuickSearchClientItem {
  id: string;
  clientName: string;
  email: string;
  riskStatus: string;
}

export interface QuickSearchInvoiceItem {
  id: string;
  invoiceNumber: string;
  clientName: string;
  status: string;
  currency: string;
  formattedTotal: string;
}

export interface QuickSearchResult {
  clients: QuickSearchClientItem[];
  invoices: QuickSearchInvoiceItem[];
  error?: string;
}

/**
 * Searches tenant-isolated clients and invoices for the global command palette.
 * Returns up to 6 matches per entity type.
 */
export async function quickSearchAction(
  query: string
): Promise<QuickSearchResult> {
  const session = await getSession();
  if (!session?.companyId) {
    return {
      clients: [],
      invoices: [],
      error: "Sign in to search workspace records.",
    };
  }

  const term = typeof query === "string" ? query.trim().slice(0, 100) : "";
  if (!term) {
    return {
      clients: [],
      invoices: [],
    };
  }

  try {
    const [clients, invoices] = await Promise.all([
      db.client.findMany({
        where: {
          companyId: session.companyId,
          deletedAt: null,
          OR: [
            { clientName: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          clientName: true,
          email: true,
          riskStatus: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      db.invoice.findMany({
        where: {
          companyId: session.companyId,
          OR: [
            { invoiceNumber: { contains: term, mode: "insensitive" } },
            { client: { clientName: { contains: term, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          currency: true,
          totalAmount: true,
          client: {
            select: {
              clientName: true,
            },
          },
        },
        orderBy: { issueDate: "desc" },
        take: 6,
      }),
    ]);

    return {
      clients: clients.map((client) => ({
        id: client.id,
        clientName: client.clientName,
        email: client.email,
        riskStatus: client.riskStatus,
      })),
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.client.clientName,
        status: invoice.status,
        currency: invoice.currency,
        formattedTotal: formatMoney(
          invoice.totalAmount.toString(),
          invoice.currency
        ),
      })),
    };
  } catch {
    return {
      clients: [],
      invoices: [],
      error: "Unable to complete search right now.",
    };
  }
}

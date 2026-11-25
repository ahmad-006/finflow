import * as React from "react";
import { redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/modules/auth";
import { getCachedInvoices, getCachedInvoiceKPIs } from "@/modules/invoices/service";
import { getCachedClients } from "@/modules/clients/service";
import { getLiveExchangeRates } from "@/modules/invoices/rates";
import { SUPPORTED_CURRENCIES } from "@/modules/invoices/currency";
import type { InvoiceCurrency, InvoiceStatus } from "@/modules/invoices/types";
import { InvoiceDirectoryView } from "@/components/invoices/InvoiceDirectoryView";
import { InvoiceDirectorySkeleton } from "@/components/invoices/InvoiceDirectorySkeleton";
import { Band } from "@/components/shell/Band";

export const metadata = {
  title: "Invoices & Billing | FinFlow",
  description: "Multi-currency commercial invoicing, spot rate freezing, and real-time payment reconciliation.",
};

const VALID_STATUSES: readonly InvoiceStatus[] = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"];

interface InvoicesPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    currency?: string;
    search?: string;
  }>;
}

async function InvoiceDirectoryDataLoader({
  searchParams,
}: {
  searchParams: InvoicesPageProps["searchParams"];
}) {
  const [resolvedParams, session] = await Promise.all([searchParams, getSession()]);

  if (!session) {
    redirect("/login");
  }

  const page = Math.max(1, Number.parseInt(resolvedParams.page || "1", 10) || 1);
  const rawStatus = (resolvedParams.status || "ALL").toUpperCase();
  const status: InvoiceStatus | "ALL" = (VALID_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as InvoiceStatus)
    : "ALL";
  const rawCurrency = (resolvedParams.currency || "ALL").toUpperCase();
  const currency: InvoiceCurrency | "ALL" = (SUPPORTED_CURRENCIES as readonly string[]).includes(
    rawCurrency
  )
    ? (rawCurrency as InvoiceCurrency)
    : "ALL";
  const search = resolvedParams.search?.trim() || "";

  const currentUser = await getCurrentUser();
  const companyName = currentUser?.company?.name || "FinFlow Commercial Services";
  const baseCurrency = (currentUser?.company?.baseCurrency || "PKR") as InvoiceCurrency;
  const role = currentUser?.role || session.role || "MEMBER";

  const [invoicesData, kpis, clients, liveRates] = await Promise.all([
    getCachedInvoices(session.companyId, {
      page,
      limit: 20,
      status,
      currency,
      search: search || undefined,
    }),
    getCachedInvoiceKPIs(session.companyId),
    getCachedClients(session.companyId),
    getLiveExchangeRates(baseCurrency),
  ]);

  const clientOptions = clients.map((c) => ({
    id: c.id,
    clientName: c.clientName,
    email: c.email,
    paymentTermsDays: c.paymentTermsDays,
  }));

  return (
    <InvoiceDirectoryView
      initialInvoices={invoicesData.invoices}
      kpis={kpis}
      baseCurrency={baseCurrency}
      companyName={companyName}
      role={role}
      clients={clientOptions}
      initialExchangeRates={liveRates}
      totalCount={invoicesData.total}
      currentPage={invoicesData.page}
      totalPages={invoicesData.totalPages}
      initialStatus={status}
      initialCurrency={currency}
      initialSearch={search}
    />
  );
}

export default function InvoicesPage({ searchParams }: InvoicesPageProps) {
  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <React.Suspense fallback={<InvoiceDirectorySkeleton />}>
          <InvoiceDirectoryDataLoader searchParams={searchParams} />
        </React.Suspense>
      </Band>
    </main>
  );
}

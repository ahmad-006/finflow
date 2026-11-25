import * as React from "react";
import { redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/modules/auth";
import { getCachedInvoices, getCachedInvoiceKPIs } from "@/modules/invoices/service";
import { getCachedClients } from "@/modules/clients/service";
import { getLiveExchangeRates } from "@/modules/invoices/rates";
import type { InvoiceCurrency } from "@/modules/invoices/types";
import { InvoiceDirectoryView } from "@/components/invoices/InvoiceDirectoryView";
import { InvoiceDirectorySkeleton } from "@/components/invoices/InvoiceDirectorySkeleton";
import { Band } from "@/components/shell/Band";

export const metadata = {
  title: "Invoices & Billing | FinFlow",
  description: "Multi-currency commercial invoicing, spot rate freezing, and real-time payment reconciliation.",
};

async function InvoiceDirectoryDataLoader() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
  const companyName = currentUser?.company?.name || "FinFlow Commercial Services";
  const baseCurrency = (currentUser?.company?.baseCurrency || "PKR") as InvoiceCurrency;
  const role = currentUser?.role || session.role || "MEMBER";

  const [invoicesData, kpis, clients, liveRates] = await Promise.all([
    getCachedInvoices(session.companyId),
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
    />
  );
}

export default function InvoicesPage() {
  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <React.Suspense fallback={<InvoiceDirectorySkeleton />}>
          <InvoiceDirectoryDataLoader />
        </React.Suspense>
      </Band>
    </main>
  );
}

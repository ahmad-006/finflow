import * as React from "react";
import { redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/modules/auth";
import { getCachedInvoices, getCachedInvoiceKPIs } from "@/modules/invoices/service";
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
  const baseCurrency = currentUser?.company?.baseCurrency || "PKR";

  const [invoicesData, kpis] = await Promise.all([
    getCachedInvoices(session.companyId),
    getCachedInvoiceKPIs(session.companyId),
  ]);

  return (
    <InvoiceDirectoryView
      initialInvoices={invoicesData.invoices}
      kpis={kpis}
      baseCurrency={baseCurrency}
      companyName={companyName}
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

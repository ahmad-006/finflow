import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/modules/auth";
import { canMutateLedger } from "@/modules/auth/rbac";
import { getCachedInvoiceById } from "@/modules/invoices/service";
import { getCachedClients } from "@/modules/clients/service";
import { getLiveExchangeRates } from "@/modules/invoices/rates";
import type { InvoiceCurrency } from "@/modules/invoices/types";
import { InvoiceBuilderView } from "@/components/invoices/InvoiceBuilderView";
import { Band } from "@/components/shell/Band";

export const metadata = {
  title: "Edit Draft Invoice | FinFlow",
  description: "Edit draft invoice line items, client selection, spot rate, and terms before issuing.",
};

interface EditInvoicePageProps {
  params: Promise<{ id: string }>;
}

async function EditInvoiceDataLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, getSession()]);

  if (!session) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
  const role = currentUser?.role || session.role || "MEMBER";

  if (!canMutateLedger(role)) {
    redirect(`/invoices/${id}`);
  }

  const baseCurrency = (currentUser?.company?.baseCurrency || "PKR") as InvoiceCurrency;

  const [invoice, clients, liveRates] = await Promise.all([
    getCachedInvoiceById(session.companyId, id),
    getCachedClients(session.companyId),
    getLiveExchangeRates(baseCurrency),
  ]);

  if (!invoice) {
    notFound();
  }

  if (invoice.status !== "DRAFT") {
    redirect(`/invoices/${invoice.id}`);
  }

  const clientOptions = clients.map((c) => ({
    id: c.id,
    clientName: c.clientName,
    email: c.email,
    paymentTermsDays: c.paymentTermsDays,
  }));

  return (
    <InvoiceBuilderView
      clients={clientOptions}
      baseCurrency={baseCurrency}
      initialExchangeRates={liveRates}
      invoiceToEdit={invoice}
    />
  );
}

function EditInvoiceSkeleton() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto animate-pulse select-none">
      <div className="h-12 w-72 rounded bg-fog" />
      <div className="h-36 w-full rounded-[10px] bg-fog" />
      <div className="h-64 w-full rounded-[10px] bg-fog" />
    </div>
  );
}

export default function EditInvoicePage({ params }: EditInvoicePageProps) {
  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <React.Suspense fallback={<EditInvoiceSkeleton />}>
          <EditInvoiceDataLoader params={params} />
        </React.Suspense>
      </Band>
    </main>
  );
}

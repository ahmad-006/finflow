import * as React from "react";
import { redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/modules/auth";
import { canMutateLedger } from "@/modules/auth/rbac";
import { getCachedClients } from "@/modules/clients/service";
import { InvoiceBuilderView } from "@/components/invoices/InvoiceBuilderView";
import { getLiveExchangeRates } from "@/modules/invoices/rates";
import type { InvoiceCurrency } from "@/modules/invoices/types";
import { Band } from "@/components/shell/Band";

export const metadata = {
  title: "New Commercial Invoice | FinFlow",
  description: "Create an arbitrary-precision multi-currency invoice with frozen spot exchange rates.",
};

interface NewInvoicePageProps {
  searchParams: Promise<{ clientId?: string }>;
}

async function NewInvoiceDataLoader({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const [{ clientId }, session] = await Promise.all([
    searchParams,
    getSession(),
  ]);

  if (!session) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
  const role = currentUser?.role || session.role || "MEMBER";

  if (!canMutateLedger(role)) {
    redirect("/invoices");
  }

  const baseCurrency = (currentUser?.company?.baseCurrency || "PKR") as InvoiceCurrency;

  const [clients, liveRates] = await Promise.all([
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
    <InvoiceBuilderView
      clients={clientOptions}
      baseCurrency={baseCurrency}
      initialExchangeRates={liveRates}
      initialClientId={clientId}
    />
  );
}

function NewInvoiceSkeleton() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto animate-pulse select-none">
      <div className="h-12 w-72 rounded bg-fog" />
      <div className="h-36 w-full rounded-[10px] bg-fog" />
      <div className="h-64 w-full rounded-[10px] bg-fog" />
    </div>
  );
}

export default function NewInvoicePage({ searchParams }: NewInvoicePageProps) {
  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <React.Suspense fallback={<NewInvoiceSkeleton />}>
          <NewInvoiceDataLoader searchParams={searchParams} />
        </React.Suspense>
      </Band>
    </main>
  );
}

import * as React from "react";
import { redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/modules/auth";
import { getCachedClients } from "@/modules/clients/service";
import { InvoiceBuilderView } from "@/components/invoices/InvoiceBuilderView";
import { getLiveExchangeRates } from "@/modules/invoices/rates";
import type { InvoiceCurrency } from "@/modules/invoices/types";
import { Band } from "@/components/shell/Band";

export const metadata = {
  title: "New Commercial Invoice | FinFlow",
  description: "Create an arbitrary-precision multi-currency invoice with frozen spot exchange rates.",
};

export default async function NewInvoicePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
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
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <InvoiceBuilderView
          clients={clientOptions}
          baseCurrency={baseCurrency}
          initialExchangeRates={liveRates}
        />
      </Band>
    </main>
  );
}

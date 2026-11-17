import * as React from "react";
import { redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/modules/auth";
import { getClients, getARAgingBuckets } from "@/modules/clients/service";
import { ClientDirectoryView } from "@/components/clients/ClientDirectoryView";
import { Band } from "@/components/shell/Band";

export const metadata = {
  title: "Clients & Accounts Receivable | FinFlow",
  description: "Client directory, payment latency intelligence, and accounts receivable aging ledger.",
};

export default async function ClientsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
  const currency = currentUser?.company?.baseCurrency || "PKR";

  // Fetch company-scoped clients and A/R aging schedule directly on the server
  const [clients, aging] = await Promise.all([
    getClients(session.companyId),
    getARAgingBuckets(session.companyId),
  ]);

  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <ClientDirectoryView
          initialClients={clients}
          aging={aging}
          currency={currency}
        />
      </Band>
    </main>
  );
}

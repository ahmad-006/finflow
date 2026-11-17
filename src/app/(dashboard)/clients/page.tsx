import * as React from "react";
import { redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/modules/auth";
import { getCachedClients, getCachedARAgingBuckets } from "@/modules/clients/service";
import { ClientDirectoryView } from "@/components/clients/ClientDirectoryView";
import { ClientDirectorySkeleton } from "@/components/clients/ClientDirectorySkeleton";
import { Band } from "@/components/shell/Band";

export const metadata = {
  title: "Clients & Accounts Receivable | FinFlow",
  description: "Client directory, payment latency intelligence, and accounts receivable aging ledger.",
};

/**
 * Async data streaming component: runs inside Suspense boundary.
 * Dynamic request cookies, session verification, and DB queries are deferred here,
 * allowing Next.js to statically prerender the outer page shell and skeleton.
 */
async function ClientDirectoryDataLoader() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
  const currency = currentUser?.company?.baseCurrency || "PKR";

  const [clients, aging] = await Promise.all([
    getCachedClients(session.companyId),
    getCachedARAgingBuckets(session.companyId),
  ]);

  return (
    <ClientDirectoryView
      initialClients={clients}
      aging={aging}
      currency={currency}
    />
  );
}

export default function ClientsPage() {
  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <React.Suspense fallback={<ClientDirectorySkeleton />}>
          <ClientDirectoryDataLoader />
        </React.Suspense>
      </Band>
    </main>
  );
}

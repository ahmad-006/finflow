import * as React from "react";
import { notFound } from "next/navigation";
import { getInvoiceByViewToken } from "@/modules/invoices/service";
import { GuestPayView } from "@/components/invoices/GuestPayView";

interface GuestPayPageProps {
  params: Promise<{ token: string }>;
}

async function GuestPayDataLoader({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getInvoiceByViewToken(token);

  if (!result) {
    notFound();
  }

  const { invoice, company } = result;

  return <GuestPayView invoice={invoice} company={company} />;
}

function GuestPaySkeleton() {
  return (
    <div className="max-w-3xl mx-auto rounded-lg border border-line bg-white p-8 animate-pulse select-none flex flex-col gap-6">
      <div className="h-8 w-48 rounded bg-fog" />
      <div className="h-20 w-full rounded bg-fog" />
      <div className="h-40 w-full rounded bg-fog" />
    </div>
  );
}

export default function GuestPayPage({ params }: GuestPayPageProps) {
  return (
    <main className="min-h-screen bg-fog/20 py-8 sm:py-16">
      <React.Suspense fallback={<GuestPaySkeleton />}>
        <GuestPayDataLoader params={params} />
      </React.Suspense>
    </main>
  );
}

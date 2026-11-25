import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/modules/auth";
import { getCachedInvoiceById } from "@/modules/invoices/service";
import { InvoiceDetailCockpit } from "@/components/invoices/InvoiceDetailCockpit";
import { Band } from "@/components/shell/Band";

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

async function InvoiceDetailDataLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
  const companyName = currentUser?.company?.name || "FinFlow Commercial Services";
  const baseCurrency = currentUser?.company?.baseCurrency || "PKR";
  const role = currentUser?.role || session.role || "MEMBER";

  const invoice = await getCachedInvoiceById(session.companyId, id);

  if (!invoice) {
    notFound();
  }

  return (
    <InvoiceDetailCockpit
      invoice={invoice}
      companyName={companyName}
      baseCurrency={baseCurrency}
      role={role}
    />
  );
}

function InvoiceDetailSkeleton() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto animate-pulse select-none">
      <div className="h-10 w-48 rounded-full bg-fog" />
      <div className="border border-line rounded-[10px] p-8 flex flex-col gap-6">
        <div className="flex justify-between">
          <div className="h-8 w-44 rounded bg-fog" />
          <div className="h-6 w-32 rounded bg-fog" />
        </div>
        <div className="h-24 w-full rounded bg-fog" />
        <div className="h-48 w-full rounded bg-fog" />
      </div>
    </div>
  );
}

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <React.Suspense fallback={<InvoiceDetailSkeleton />}>
          <InvoiceDetailDataLoader params={params} />
        </React.Suspense>
      </Band>
    </main>
  );
}

import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/modules/auth";
import { getCachedInvoiceById } from "@/modules/invoices/service";
import { PrintInvoiceDocument } from "@/components/invoices/PrintInvoiceDocument";

interface InvoicePrintPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Print Invoice | FinFlow",
  description: "Official commercial document printable A4 view.",
};

async function InvoicePrintDataLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const [currentUser, invoice] = await Promise.all([
    getCurrentUser(),
    getCachedInvoiceById(session.companyId, id),
  ]);

  if (!invoice) {
    notFound();
  }

  const companyName = currentUser?.company?.name || "FinFlow Commercial Services";
  const baseCurrency = currentUser?.company?.baseCurrency || "PKR";
  const companyEmail = currentUser?.company?.billingEmail || null;
  const companyPhone = currentUser?.company?.phone || null;
  const companyAddress = currentUser?.company?.address || null;
  const companyTaxId = currentUser?.company?.taxId || null;
  const wireRemittanceNotes = currentUser?.company?.remittanceInstructions || null;

  return (
    <PrintInvoiceDocument
      invoice={invoice}
      companyName={companyName}
      baseCurrency={baseCurrency}
      companyEmail={companyEmail}
      companyPhone={companyPhone}
      companyAddress={companyAddress}
      companyTaxId={companyTaxId}
      wireRemittanceNotes={wireRemittanceNotes}
    />
  );
}

function InvoicePrintSkeleton() {
  return (
    <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-[20mm] border border-line animate-pulse select-none flex flex-col gap-6">
      <div className="flex justify-between">
        <div className="h-8 w-48 rounded bg-fog" />
        <div className="h-8 w-24 rounded bg-fog" />
      </div>
      <div className="h-24 w-full rounded bg-fog" />
      <div className="h-48 w-full rounded bg-fog" />
    </div>
  );
}

export default function InvoicePrintPage({ params }: InvoicePrintPageProps) {
  return (
    <main className="w-full bg-white print:p-0">
      <React.Suspense fallback={<InvoicePrintSkeleton />}>
        <InvoicePrintDataLoader params={params} />
      </React.Suspense>
    </main>
  );
}

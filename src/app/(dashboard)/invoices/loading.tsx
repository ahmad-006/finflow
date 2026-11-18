import * as React from "react";
import { InvoiceDirectorySkeleton } from "@/components/invoices/InvoiceDirectorySkeleton";
import { Band } from "@/components/shell/Band";

export default function InvoicesLoading() {
  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <InvoiceDirectorySkeleton />
      </Band>
    </main>
  );
}

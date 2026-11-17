import * as React from "react";
import { Band } from "@/components/shell/Band";
import { ClientStatementSkeleton } from "@/components/clients/ClientStatementSkeleton";

export default function ClientDetailLoading() {
  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <ClientStatementSkeleton />
      </Band>
    </main>
  );
}

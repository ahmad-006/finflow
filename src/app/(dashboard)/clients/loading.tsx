import * as React from "react";
import { Band } from "@/components/shell/Band";
import { ClientDirectorySkeleton } from "@/components/clients/ClientDirectorySkeleton";

export default function ClientsLoading() {
  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <ClientDirectorySkeleton />
      </Band>
    </main>
  );
}

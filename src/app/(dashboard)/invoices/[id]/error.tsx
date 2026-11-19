"use client";

import * as React from "react";
import { ErrorState } from "@/components/shell/ErrorState";
import { Band } from "@/components/shell/Band";

export default function InvoiceDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[FinFlow Invoice Detail Error Caught]", error);
  }, [error]);

  return (
    <Band tone="white" className="py-12 md:py-16">
      <ErrorState
        title="Unable to Load Invoice Dossier"
        description="FinFlow could not retrieve this invoice from the database. Please verify your connection or return to the directory."
        error={error}
        onRetry={reset}
        homeHref="/invoices"
      />
    </Band>
  );
}

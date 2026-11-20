"use client";

import * as React from "react";
import { ErrorState } from "@/components/shell/ErrorState";
import { Band } from "@/components/shell/Band";

export default function CashFlowError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[FinFlow Cash Flow Error Caught]", error);
  }, [error]);

  return (
    <Band tone="white" className="py-12 md:py-16">
      <ErrorState
        title="Unable to Load Cash Flow Forecast"
        description="FinFlow could not calculate your forward treasury projections from the database. Check your network connection and retry."
        error={error}
        onRetry={reset}
        homeHref="/dashboard"
      />
    </Band>
  );
}

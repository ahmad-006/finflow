"use client";

import * as React from "react";
import { ErrorState } from "@/components/shell/ErrorState";
import { Band } from "@/components/shell/Band";

export default function CashFlowDayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[FinFlow Cash Flow Day Error Caught]", error);
  }, [error]);

  return (
    <Band tone="white" className="py-12 md:py-16">
      <ErrorState
        title="Unable to Load Day Cash Breakdown"
        description="FinFlow could not retrieve the transaction breakdown for this date. Check that the date falls within the 30-day forecast horizon and retry."
        error={error}
        onRetry={reset}
        homeHref="/cash-flow"
      />
    </Band>
  );
}

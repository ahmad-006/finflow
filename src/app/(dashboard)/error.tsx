"use client";

import * as React from "react";
import { ErrorState } from "@/components/shell/ErrorState";
import { Band } from "@/components/shell/Band";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log sanitized error for client monitoring
    console.error("[FinFlow Dashboard Error Caught]", error);
  }, [error]);

  return (
    <Band tone="white" className="py-12 md:py-16">
      <ErrorState
        title="Unable to Load Dashboard Data"
        error={error}
        onRetry={reset}
        homeHref="/dashboard"
      />
    </Band>
  );
}

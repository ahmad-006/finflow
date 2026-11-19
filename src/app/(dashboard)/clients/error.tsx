"use client";

import * as React from "react";
import { ErrorState } from "@/components/shell/ErrorState";
import { Band } from "@/components/shell/Band";

export default function ClientsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[FinFlow Clients Error Caught]", error);
  }, [error]);

  return (
    <Band tone="white" className="py-12 md:py-16">
      <ErrorState
        title="Unable to Load Clients Directory"
        description="FinFlow could not retrieve client records from the database. Please check your network connection and retry."
        error={error}
        onRetry={reset}
        homeHref="/dashboard"
      />
    </Band>
  );
}

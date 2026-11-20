"use client";

import * as React from "react";
import { ErrorState } from "@/components/shell/ErrorState";
import { Band } from "@/components/shell/Band";

export default function CalendarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[FinFlow Calendar Error Caught]", error);
  }, [error]);

  return (
    <Band tone="white" className="py-12 md:py-16">
      <ErrorState
        title="Unable to Load Financial Calendar"
        description="FinFlow could not retrieve your scheduled receivables and payables from the database. Check your connection and retry."
        error={error}
        onRetry={reset}
        homeHref="/dashboard"
      />
    </Band>
  );
}

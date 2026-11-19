"use client";

import * as React from "react";
import { ErrorState } from "@/components/shell/ErrorState";

export default function GuestPayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[FinFlow Guest Portal Error Caught]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
      <ErrorState
        title="Unable to Load Commercial Invoice"
        description="The invoice could not be retrieved from the database. Please verify your internet connection and reload the page."
        error={error}
        onRetry={reset}
        homeHref="/"
      />
    </div>
  );
}

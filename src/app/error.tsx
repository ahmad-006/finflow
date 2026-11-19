"use client";

import * as React from "react";
import { ErrorState } from "@/components/shell/ErrorState";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[FinFlow Root Application Error Caught]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans">
      <ErrorState
        title="Application Connection Error"
        error={error}
        onRetry={reset}
        homeHref="/dashboard"
      />
    </div>
  );
}

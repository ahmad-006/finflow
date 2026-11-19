"use client";

import * as React from "react";
import { ErrorState } from "@/components/shell/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[FinFlow Global Root Error Caught]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 font-sans antialiased m-0 p-0">
        <div className="min-h-screen flex items-center justify-center p-4">
          <ErrorState
            title="System Connection Unavailable"
            error={error}
            onRetry={reset}
            homeHref="/"
          />
        </div>
      </body>
    </html>
  );
}

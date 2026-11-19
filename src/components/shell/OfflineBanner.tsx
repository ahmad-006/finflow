"use client";

import * as React from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = React.useState<boolean>(false);
  const [showRestored, setShowRestored] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Check initial online status
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      setIsOffline(!navigator.onLine);
    }

    function handleOnline() {
      setIsOffline(false);
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 4000);
      return () => clearTimeout(timer);
    }

    function handleOffline() {
      setIsOffline(true);
      setShowRestored(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline && !showRestored) {
    return null;
  }

  if (isOffline) {
    return (
      <aside
        aria-live="polite"
        className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-900 text-xs font-medium print:hidden"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Network disconnected:</strong> FinFlow cannot reach the database.
              Actions and changes will resume once your internet connection is restored.
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-[11px] underline font-semibold text-amber-950 hover:text-amber-800 shrink-0"
          >
            Retry Connection
          </button>
        </div>
      </aside>
    );
  }

  if (showRestored) {
    return (
      <aside
        aria-live="polite"
        className="w-full bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-emerald-900 text-xs font-medium transition-opacity duration-300 print:hidden"
      >
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Connection restored:</strong> Back online. FinFlow services are reachable.
          </span>
        </div>
      </aside>
    );
  }

  return null;
}

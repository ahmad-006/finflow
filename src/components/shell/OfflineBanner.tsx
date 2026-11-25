"use client";

import * as React from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";

function subscribeNetworkStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOfflineSnapshot() {
  return typeof navigator !== "undefined" ? !navigator.onLine : false;
}

function getServerOfflineSnapshot() {
  return false;
}

export function OfflineBanner() {
  const isOffline = React.useSyncExternalStore(
    subscribeNetworkStatus,
    getOfflineSnapshot,
    getServerOfflineSnapshot
  );
  const [showRestored, setShowRestored] = React.useState<boolean>(false);

  React.useEffect(() => {
    let restoredTimer: ReturnType<typeof setTimeout> | null = null;

    function handleOnline() {
      setShowRestored(true);
      if (restoredTimer) clearTimeout(restoredTimer);
      restoredTimer = setTimeout(() => {
        setShowRestored(false);
      }, 4000);
    }

    function handleOffline() {
      if (restoredTimer) clearTimeout(restoredTimer);
      setShowRestored(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (restoredTimer) clearTimeout(restoredTimer);
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

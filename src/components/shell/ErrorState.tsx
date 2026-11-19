"use client";

import * as React from "react";
import Link from "next/link";
import { WifiOff, Database, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { isDatabaseOrNetworkError, formatUserError, categorizeError } from "@/lib/errors";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: (Error & { digest?: string }) | unknown;
  onRetry?: () => void;
  homeHref?: string;
  compact?: boolean;
}

export function ErrorState({
  title,
  description,
  error,
  onRetry,
  homeHref = "/dashboard",
  compact = false,
}: ErrorStateProps) {
  const isConn = error ? isDatabaseOrNetworkError(error) : false;
  const parsed = error ? categorizeError(error) : null;
  const sanitizedMsg = error ? formatUserError(error) : "";
  const errorDigest =
    error && typeof error === "object" && "digest" in error
      ? String((error as { digest: unknown }).digest)
      : null;

  const resolvedTitle =
    title ||
    (isConn
      ? "Database Connection Unavailable"
      : "Unable to Load View");

  const resolvedDesc =
    description ||
    (isConn
      ? "FinFlow could not establish a connection to the cloud database. This typically occurs when your internet connection is interrupted or during momentary database cold starts."
      : sanitizedMsg || "An unexpected error occurred while loading this section. Please retry or return to the dashboard.");

  return (
    <div
      className={`w-full max-w-xl mx-auto border border-neutral-200 bg-white rounded-lg p-6 md:p-8 text-neutral-900 ${
        compact ? "my-4" : "my-8 md:my-16"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
            isConn
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-neutral-100 border-neutral-200 text-neutral-700"
          }`}
        >
          {isConn ? (
            <WifiOff className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-neutral-950 tracking-tight">
              {resolvedTitle}
            </h3>
            {isConn && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-amber-100 text-amber-900 border border-amber-300">
                Offline / Disconnected
              </span>
            )}
          </div>

          <p className="mt-2 text-xs md:text-sm text-neutral-600 leading-relaxed">
            {resolvedDesc}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-950 text-white text-xs font-semibold rounded-full hover:bg-neutral-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-neutral-300 text-neutral-700 text-xs font-medium rounded-full hover:bg-neutral-50 transition-colors"
            >
              <span>Reload Page</span>
            </button>

            {homeHref && (
              <Link
                href={homeHref}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-neutral-500 hover:text-neutral-900 text-xs font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </Link>
            )}
          </div>

          {/* Diagnostic Disclosure (Secure, no secrets leaked) */}
          {parsed?.technicalDetails && (
            <details className="mt-5 pt-4 border-t border-neutral-100 group">
              <summary className="text-[11px] font-medium text-neutral-500 cursor-pointer hover:text-neutral-800 select-none">
                Technical Diagnostics (Safe for Inspection)
              </summary>
              <div className="mt-2 p-2.5 bg-neutral-50 border border-neutral-200 rounded font-mono text-[10.5px] text-neutral-700 space-y-1 overflow-x-auto">
                <div>
                  <span className="font-semibold text-neutral-500">Code:</span>{" "}
                  {parsed.code}
                </div>
                <div>
                  <span className="font-semibold text-neutral-500">Details:</span>{" "}
                  {parsed.technicalDetails}
                </div>
                {errorDigest ? (
                  <div>
                    <span className="font-semibold text-neutral-500">Digest:</span>{" "}
                    {errorDigest}
                  </div>
                ) : null}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

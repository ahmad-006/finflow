import * as React from "react";
import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans text-neutral-900">
      <div className="w-full max-w-md border border-neutral-200 rounded-lg p-8 text-center bg-white">
        <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 mx-auto flex items-center justify-center mb-4">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-neutral-950 tracking-tight">
          Page Not Found
        </h2>
        <p className="mt-2 text-xs md:text-sm text-neutral-600 leading-relaxed">
          The page or financial resource you requested could not be located. It may have been moved or deleted.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-950 text-white text-xs font-semibold rounded-full hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

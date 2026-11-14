"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TopNavProps {
  user?: {
    id?: string;
    fullName?: string;
    email?: string;
    role?: string;
  } | null;
  company?: {
    id?: string;
    name?: string;
    baseCurrency?: string;
  } | null;
  onSignOut?: () => Promise<void> | void;
  className?: string;
}

/**
 * Custom 20x20 SVG geometric ledger monogram:
 * #0F3D2E vertical bars of ascending height inside a 1px frame.
 */
export function FinFlowMark({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block shrink-0", className)}
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="19" height="19" rx="3.5" stroke="#E4E4E7" fill="#FAFAFA" />
      <rect x="4" y="11" width="2.5" height="5" rx="0.5" fill="#0F3D2E" />
      <rect x="8.75" y="8" width="2.5" height="8" rx="0.5" fill="#0F3D2E" />
      <rect x="13.5" y="4" width="2.5" height="12" rx="0.5" fill="#0F3D2E" />
    </svg>
  );
}

export function TopNav({ className }: TopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header
      className={cn(
        "h-16 sticky top-0 z-30 bg-[#FAFAFA]/90 backdrop-blur-md border-b border-zinc-200 select-none",
        className
      )}
    >
      <div className="max-w-[1360px] mx-auto h-full px-6 md:px-10 flex items-center justify-between">
        {/* Left: Brand lockup with /finflow-icon.png + FinFlow */}
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label="FinFlow home"
        >
          <Image
            src="/finflow-icon.png"
            alt="FinFlow"
            width={24}
            height={24}
            className="w-6 h-6 rounded-sm object-contain shrink-0"
            priority
          />
          <span className="font-semibold text-base tracking-tight text-gray-900">
            FinFlow
          </span>
        </Link>

        {/* Center Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-7" aria-label="Marketing navigation">
          <Link
            href="/#product"
            className="text-xs font-medium text-zinc-600 hover:text-gray-900 transition-colors"
          >
            Product
          </Link>
          <Link
            href="/#forecasting"
            className="text-xs font-medium text-zinc-600 hover:text-gray-900 transition-colors"
          >
            Forecasting Engine
          </Link>
          <Link
            href="/#multi-currency"
            className="text-xs font-medium text-zinc-600 hover:text-gray-900 transition-colors"
          >
            Multi-Currency
          </Link>
          <Link
            href="/#comparison"
            className="text-xs font-medium text-zinc-600 hover:text-gray-900 transition-colors"
          >
            Comparison
          </Link>
          <Link
            href="/#security"
            className="text-xs font-medium text-zinc-600 hover:text-gray-900 transition-colors"
          >
            Security & Specs
          </Link>
          <Link
            href="/#faq"
            className="text-xs font-medium text-zinc-600 hover:text-gray-900 transition-colors"
          >
            FAQ
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-medium text-zinc-700 hover:text-gray-900 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 h-[38px] px-4 rounded-md bg-zinc-900 text-white text-xs font-medium tracking-tight hover:bg-zinc-800 active:bg-zinc-950 transition-colors"
          >
            Open Treasury
          </Link>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-1.5 -mr-1.5 rounded-md text-zinc-600 hover:text-gray-900 hover:bg-zinc-100 transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 stroke-[1.5]" />
            ) : (
              <Menu className="w-5 h-5 stroke-[1.5]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-zinc-200 bg-[#FAFAFA] px-6 py-4 flex flex-col gap-3">
          <Link
            href="/#product"
            onClick={() => setMobileMenuOpen(false)}
            className="text-xs font-medium text-zinc-600 hover:text-gray-900 transition-colors py-1"
          >
            Product Architecture
          </Link>
          <Link
            href="/#forecasting"
            onClick={() => setMobileMenuOpen(false)}
            className="text-xs font-medium text-zinc-600 hover:text-gray-900 transition-colors py-1"
          >
            Forecasting Engine
          </Link>
          <Link
            href="/#multi-currency"
            onClick={() => setMobileMenuOpen(false)}
            className="text-xs font-medium text-zinc-600 hover:text-gray-900 transition-colors py-1"
          >
            Multi-Currency & FX
          </Link>
          <Link
            href="/#comparison"
            onClick={() => setMobileMenuOpen(false)}
            className="text-xs font-medium text-zinc-600 hover:text-gray-900 transition-colors py-1"
          >
            Ledger Comparison
          </Link>
          <Link
            href="/#security"
            onClick={() => setMobileMenuOpen(false)}
            className="text-xs font-medium text-zinc-600 hover:text-gray-900 transition-colors py-1"
          >
            Security & Specifications
          </Link>
          <Link
            href="/#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="text-xs font-medium text-zinc-600 hover:text-gray-900 transition-colors py-1"
          >
            FAQ
          </Link>
          <div className="pt-3 border-t border-zinc-200 flex items-center justify-between">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs font-medium text-zinc-700 hover:text-gray-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center justify-center gap-2 h-[38px] px-4 rounded-md bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors"
            >
              Open Treasury
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

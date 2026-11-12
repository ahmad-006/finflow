"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Plus } from "lucide-react";
import { UserMenu } from "./UserMenu";
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
}

export function FinFlowMark({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="12"
      viewBox="0 0 28 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d="M1 9 C6 9 7 2 12 2 C17 2 17 10 21 10 C24 10 25 4 27 3"
        stroke="var(--lagoon)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TopNav({ user, company, onSignOut }: TopNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { label: "Overview", href: "/dashboard" },
    { label: "Invoices", href: "/invoices" },
    { label: "Clients", href: "/clients" },
    { label: "Cash flow", href: "/cash-flow" },
    { label: "Calendar", href: "/calendar" },
  ];

  return (
    <header className="h-[72px] bg-canvas border-b border-line sticky top-0 z-20">
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 h-full flex items-center justify-between">
        {/* Left: Brand + Nav links */}
        <div className="flex items-center gap-8 lg:gap-10">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 font-sans font-medium text-[20px] tracking-[-0.02em] text-ink select-none"
          >
            <span>finflow</span>
            <FinFlowMark />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative py-2 text-[15px] font-medium transition-colors select-none",
                    isActive
                      ? "text-ink font-semibold"
                      : "text-ink-2 hover:text-ink"
                  )}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-lagoon rounded-[2px]"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Actions + User Menu */}
        <div className="flex items-center gap-3">
          <Link
            href="/invoices/new"
            className="hidden sm:inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] bg-ink text-white text-[14px] font-medium hover:bg-ink-hover transition-colors select-none"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>New invoice</span>
          </Link>

          <div className="pl-1">
            <UserMenu user={user} company={company} onSignOut={onSignOut} />
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="md:hidden flex items-center justify-center h-10 w-10 rounded-[10px] text-ink-2 hover:bg-sunken"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Mobile Full-Screen Porcelain Sheet Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-sheet p-6 flex flex-col justify-between md:hidden">
          <div>
            <div className="flex items-center justify-between pb-6 border-b border-line">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-1.5 font-sans font-medium text-[20px] tracking-[-0.02em] text-ink"
              >
                <span>finflow</span>
                <FinFlowMark />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="flex items-center justify-center h-10 w-10 rounded-[10px] text-ink-2 hover:bg-sunken"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <nav className="mt-8 flex flex-col gap-6">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "text-[28px] font-light tracking-[-0.03em] transition-colors",
                      isActive ? "text-ink font-normal" : "text-ink-2"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-line">
            <Link
              href="/invoices/new"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center h-11 w-full rounded-[10px] bg-ink text-white text-[15px] font-medium hover:bg-ink-hover"
            >
              New invoice
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

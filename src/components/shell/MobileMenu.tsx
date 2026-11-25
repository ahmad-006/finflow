"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X, LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { canMutateLedger } from "@/modules/auth/rbac";
import { logoutAction } from "@/modules/auth/actions";

export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
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
  isMarketing?: boolean;
}

export function MobileMenu({
  isOpen,
  onClose,
  user,
  company,
  onSignOut,
  isMarketing = false,
}: MobileMenuProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || "";
  const [isLoggingOut, startLogoutTransition] = React.useTransition();
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  // Lock body scroll while menu is open
  React.useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle escape key to close menu
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus close button on open
  React.useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  const handleMobileSignOut = () => {
    startLogoutTransition(async () => {
      onClose();
      try {
        if (onSignOut) {
          await onSignOut();
        } else {
          await logoutAction();
        }
      } catch {
        window.location.assign("/logout");
      }
    });
  };

  if (!isOpen) {
    return null;
  }

  const inAppLinks = [
    { label: "Overview", href: "/dashboard", active: pathname === "/dashboard" },
    { label: "Invoices", href: "/invoices", active: pathname.startsWith("/invoices") },
    { label: "Clients", href: "/clients", active: pathname.startsWith("/clients") },
    { label: "Expenses", href: "/expenses", active: pathname.startsWith("/expenses") },
    { label: "Cash flow", href: "/cash-flow", active: pathname.startsWith("/cash-flow") },
    { label: "Calendar", href: "/calendar", active: pathname.startsWith("/calendar") },
    { label: "Settings", href: "/settings", active: pathname.startsWith("/settings") },
  ];

  const marketingLinks = [
    { label: "Overview", href: "/#overview", active: false },
    { label: "Story", href: "/#story", active: false },
    { label: "Product", href: "/#product", active: false },
    { label: "Capabilities", href: "/#more", active: false },
  ];

  const fullName = user?.fullName || "Treasury User";
  const email = user?.email || "";
  const companyName = company?.name || "Apex Technologies";
  const baseCurrency = company?.baseCurrency || "PKR";

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TU";

  const navLinks = !isMarketing && user ? inAppLinks : marketingLinks;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation"
      id="mobile-navigation-sheet"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-[#0D1B2A]/30 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in sheet */}
      <aside className="relative z-10 flex h-full w-full max-w-[360px] sm:max-w-[400px] flex-col justify-between bg-white border-l border-line overflow-y-auto">
        {/* Sheet header */}
        <div className="flex h-16 items-center justify-between border-b border-line px-5 shrink-0">
          <Link
            href={user ? "/dashboard" : "/"}
            onClick={onClose}
            className="flex items-center hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 rounded-sm"
          >
            <Image
              src="/finflow-logo-on-white.png"
              alt="FinFlow"
              width={131}
              height={30}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="inline-flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-full hover:bg-fog text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            <X className="h-5 w-5 stroke-[1.5]" />
          </button>
        </div>

        {/* User profile and company details */}
        {user ? (
          <div className="border-b border-line px-5 py-4 bg-fog/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-line text-xs font-semibold text-ink select-none">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">
                  {fullName}
                </p>
                {email && (
                  <p className="truncate text-[13px] text-ink-3">
                    {email}
                  </p>
                )}
                <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-2">
                  <span className="truncate font-medium text-ink">{companyName}</span>
                  {baseCurrency && (
                    <>
                      <span className="text-line-strong">·</span>
                      <span className="text-ink-3 font-mono">{baseCurrency}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Navigation links */}
        <nav
          className="flex-1 px-4 py-5 flex flex-col gap-1.5"
          aria-label="Mobile navigation links"
        >
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex items-center justify-between min-h-[44px] h-12 px-4 rounded-full text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
                item.active
                  ? "bg-fog text-ink font-semibold"
                  : "text-ink-2 hover:text-ink hover:bg-fog/60"
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    item.active ? "bg-ink" : "bg-transparent"
                  )}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </span>

              {item.active && (
                <span className="text-xs font-medium text-ink-3">Current</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-line p-5 flex flex-col gap-3 shrink-0">
          {user ? (
            <>
              {(user.role ? canMutateLedger(user.role) : true) && (
                <Link
                  href="/invoices/new"
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] h-12 w-full rounded-full bg-ink text-white font-medium text-[15px] hover:bg-ink-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                >
                  <Plus className="h-4 w-4 stroke-[2]" />
                  <span>New invoice</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleMobileSignOut}
                disabled={isLoggingOut}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] h-12 w-full rounded-full border border-line bg-white hover:bg-fog text-ink font-medium text-[15px] transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              >
                <LogOut className="h-4 w-4 stroke-[1.5]" />
                <span>{isLoggingOut ? "Signing out..." : "Log out"}</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/register"
                onClick={onClose}
                className="inline-flex items-center justify-center min-h-[44px] h-12 w-full rounded-full bg-ink text-white font-medium text-[15px] hover:bg-ink-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              >
                Create workspace
              </Link>
              <Link
                href="/login"
                onClick={onClose}
                className="inline-flex items-center justify-center min-h-[44px] h-12 w-full rounded-full border border-line bg-white hover:bg-fog text-ink font-medium text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </aside>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}

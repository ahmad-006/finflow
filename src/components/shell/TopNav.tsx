"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/modules/auth/actions";

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
  isMarketing?: boolean;
}

export function TopNav({
  user,
  company,
  onSignOut,
  className,
  isMarketing = false,
}: TopNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [isLoggingOut, startLogoutTransition] = React.useTransition();

  const handleMobileSignOut = () => {
    startLogoutTransition(async () => {
      setMobileMenuOpen(false);
      try {
        if (onSignOut) {
          await onSignOut();
        } else {
          await logoutAction();
        }
      } catch (err) {
        window.location.href = "/logout";
      }
    });
  };

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Wayfinding ruler on scroll for marketing
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 8);

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        setScrollProgress(Math.min(1, Math.max(0, scrollY / maxScroll)));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const inAppLinks = [
    { label: "Overview", href: "/dashboard", active: pathname === "/dashboard" },
    { label: "Invoices", href: "/invoices", active: pathname.startsWith("/invoices") },
    { label: "Clients", href: "/clients", active: pathname.startsWith("/clients") },
    { label: "Expenses", href: "/expenses", active: pathname.startsWith("/expenses") },
    { label: "Cash flow", href: "/cash-flow", active: pathname.startsWith("/cash-flow") },
    { label: "Calendar", href: "/calendar", active: pathname.startsWith("/calendar") },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-20 h-14 w-full bg-white/80 backdrop-blur-[20px] transition-colors select-none print:hidden",
        isScrolled && "border-b border-line",
        className
      )}
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-[var(--gutter)]">
        {/* Left: Wordmark */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center hover:opacity-90 transition-opacity"
        >
          <Image
            src="/finflow-logo-on-white.png"
            alt="FinFlow"
            width={131}
            height={30}
            className="h-7 w-auto object-contain shrink-0"
            priority
          />
        </Link>

        {/* Center Links (App) */}
        {!isMarketing && user ? (
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8" aria-label="Application navigation">
            {inAppLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-[15px] transition-colors whitespace-nowrap",
                  item.active
                    ? "font-semibold text-ink"
                    : "font-medium text-ink-2 hover:text-ink"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          {isMarketing ? (
            <>
              {user ? (
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex items-center justify-center h-9 px-[18px] rounded-full bg-ink text-white text-[15px] font-medium hover:bg-ink-hover transition-colors"
                >
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:inline-block text-[15px] font-medium text-ink hover:underline decoration-line-strong hover:decoration-ink transition-colors whitespace-nowrap"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center h-9 px-3.5 sm:px-[18px] rounded-full bg-ink text-white text-[13px] sm:text-[15px] font-medium hover:bg-ink-hover active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
                  >
                    Create workspace
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <Link
                href="/invoices/new"
                className="hidden sm:inline-flex items-center justify-center h-9 px-[18px] rounded-full bg-ink text-white text-[15px] font-medium hover:bg-ink-hover active:scale-[0.98] transition-all"
              >
                New invoice
              </Link>
              <UserMenu user={user} company={company} onSignOut={onSignOut} />
            </>
          )}

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="lg:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 p-1 text-ink"
          >
            <span className="w-5 h-[1.5px] bg-ink block" />
            <span className="w-5 h-[1.5px] bg-ink block" />
          </button>
        </div>
      </div>

      {/* Homepage Scroll Ruler along bottom edge */}
      {isMarketing && (
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-line overflow-hidden">
          <div
            className="h-full bg-ink transition-all duration-75"
            style={{ width: `${(scrollProgress * 100).toFixed(1)}%` }}
          />
        </div>
      )}

      {/* Mobile Full-Screen Overlay (Portaled to document.body to prevent parent stacking/backdrop-filter clipping) */}
      {mounted && mobileMenuOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-between bg-white p-8">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center hover:opacity-90 transition-opacity"
            >
              <Image
                src="/finflow-logo-on-white.png"
                alt="FinFlow"
                width={131}
                height={30}
                className="h-7 w-auto object-contain"
              />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="p-2 text-ink hover:opacity-70 transition-opacity"
            >
              <X className="h-6 w-6 stroke-[1.5]" />
            </button>
          </div>

          <nav className="flex flex-col gap-5 my-auto" aria-label="Mobile navigation">
            {(user ? inAppLinks : [
              { label: "Overview", href: "/#overview", active: false },
              { label: "Story", href: "/#story", active: false },
              { label: "Product", href: "/#product", active: false },
              { label: "Capabilities", href: "/#more", active: false },
            ]).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-4xl font-semibold text-ink tracking-tight hover:opacity-70 transition-opacity"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3 pt-6 border-t border-line">
            {user ? (
              <>
                <Link
                  href="/invoices/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center h-12 w-full rounded-full bg-ink text-white font-medium text-[16px] hover:bg-ink-hover active:scale-[0.98] transition-all"
                >
                  + New invoice
                </Link>
                <Button
                  variant="secondary"
                  size="default"
                  className="w-full h-12 rounded-full"
                  disabled={isLoggingOut}
                  onClick={handleMobileSignOut}
                >
                  {isLoggingOut ? "Signing out..." : "Sign out"}
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center h-12 w-full rounded-full bg-ink text-white font-medium text-[17px]"
                >
                  Create workspace
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center h-12 w-full rounded-full bg-fog text-ink font-medium text-[17px]"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}

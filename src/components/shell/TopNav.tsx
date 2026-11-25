"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { canMutateLedger } from "@/modules/auth/rbac";
import { UserMenu } from "./UserMenu";
import { MobileMenu } from "./MobileMenu";
import { QuickCommandModal } from "./QuickCommandModal";

const emptySubscribe = () => () => {};
function getClientShortcutHint(): string {
  if (typeof navigator === "undefined") return "⌘K";
  const platform = navigator.platform || navigator.userAgent || "";
  return /Mac|iPhone|iPad|iPod/i.test(platform) ? "⌘K" : "Ctrl K";
}
function getServerShortcutHint(): string {
  return "⌘K";
}

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
  const rawPathname = usePathname();
  const pathname = rawPathname || "";
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const shortcutHint = React.useSyncExternalStore(
    emptySubscribe,
    getClientShortcutHint,
    getServerShortcutHint
  );

  // Global Cmd/Ctrl + K shortcut for Quick Command Palette
  React.useEffect(() => {
    if (isMarketing || !user) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMarketing, user]);

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

  if (pathname === "/onboarding") {
    return null;
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-20 h-14 w-full bg-white/80 backdrop-blur-[20px] transition-colors select-none print:hidden",
        isScrolled && "border-b border-line",
        className
      )}
    >
      <div
        className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between px-[clamp(16px,4vw,48px)] box-border min-w-0"
        style={{
          paddingLeft: "clamp(16px, 4vw, 48px)",
          paddingRight: "clamp(16px, 4vw, 48px)",
        }}
      >
        {/* Left: Brand logo */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 rounded-sm shrink-0"
          aria-label="FinFlow home"
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

        {/* Center: Navigation pills (App) */}
        {!isMarketing && user ? (
          <nav
            className="hidden lg:flex items-center gap-1 xl:gap-1.5"
            aria-label="Application navigation"
          >
            {inAppLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-[14px] xl:text-[15px] font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
                  item.active
                    ? "bg-fog text-ink font-semibold"
                    : "text-ink-2 hover:text-ink hover:bg-fog/60"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isMarketing ? (
            <>
              {user ? (
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex items-center justify-center min-h-[36px] h-9 px-4 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-ink-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                >
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:inline-block text-[14px] font-medium text-ink hover:underline decoration-line-strong hover:decoration-ink transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center min-h-[36px] h-9 px-3.5 sm:px-4 rounded-full bg-ink text-white text-[13px] sm:text-[14px] font-medium hover:bg-ink-hover transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                  >
                    Create workspace
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              {user && (
                <button
                  type="button"
                  onClick={() => setCommandOpen(true)}
                  aria-label="Search workspace"
                  aria-haspopup="dialog"
                  aria-expanded={commandOpen}
                  className="inline-flex items-center gap-2 min-h-[36px] h-9 px-3 sm:px-3.5 rounded-full border border-line bg-fog/60 hover:bg-fog text-ink-2 hover:text-ink text-[13px] font-medium transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                >
                  <Search
                    className="h-3.5 w-3.5 text-ink-3 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span>Search</span>
                  <kbd className="hidden md:inline-flex items-center rounded-full border border-line bg-white px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-3 leading-none">
                    {shortcutHint}
                  </kbd>
                </button>
              )}
              {(user?.role ? canMutateLedger(user.role) : true) && (
                <Link
                  href="/invoices/new"
                  className="hidden sm:inline-flex items-center justify-center min-h-[36px] h-9 px-4 rounded-full border border-line bg-white hover:bg-fog text-ink text-[14px] font-medium transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                >
                  New invoice
                </Link>
              )}
              <UserMenu user={user} company={company} onSignOut={onSignOut} />
            </>
          )}

          {/* Clean accessible hamburger button (< 1024px) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-sheet"
            className="lg:hidden inline-flex flex-col justify-center items-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-full hover:bg-fog active:bg-fog-2 text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 shrink-0"
          >
            <span className="sr-only">Open navigation menu</span>
            <span className="w-5 h-[1.5px] bg-ink block rounded-full" />
            <span className="w-5 h-[1.5px] bg-ink block rounded-full mt-1.5" />
          </button>
        </div>
      </div>

      {/* Marketing Scroll Ruler along bottom edge */}
      {isMarketing && (
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-line overflow-hidden">
          <div
            className="h-full bg-ink transition-all duration-75"
            style={{ width: `${(scrollProgress * 100).toFixed(1)}%` }}
          />
        </div>
      )}

      {/* Slide-in Mobile Navigation Sheet */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        company={company}
        onSignOut={onSignOut}
        isMarketing={isMarketing}
      />

      {/* Global Quick Command Palette */}
      {!isMarketing && user && (
        <QuickCommandModal
          isOpen={commandOpen}
          onClose={() => setCommandOpen(false)}
          userRole={user.role}
        />
      )}
    </header>
  );
}

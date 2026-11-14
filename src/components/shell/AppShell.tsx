"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  FileText,
  Building2,
  Calendar,
  SlidersHorizontal,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileDrawer } from "./MobileDrawer";

export interface AppShellProps {
  children: React.ReactNode;
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

export function AppShell({
  children,
  user,
  company,
  onSignOut,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [activeCurrency, setActiveCurrency] = React.useState<"PKR" | "USD" | "EUR">("PKR");

  const companyName = company?.name || "Apex Technologies";
  const baseCurrency = company?.baseCurrency || "PKR";
  const userName = user?.fullName || "Treasury Officer";

  // Derive page title from active route
  const getPageTitle = (path: string): string => {
    if (path === "/dashboard" || path === "/dashboard/") return "Treasury";
    if (path.startsWith("/invoices")) return "Invoices";
    if (path.startsWith("/clients")) return "Clients";
    if (path.startsWith("/calendar")) return "Due Calendar";
    if (path.startsWith("/settings")) return "Settings";
    return "Treasury";
  };

  const pageTitle = getPageTitle(pathname || "/dashboard");

  const navItems = [
    {
      label: "Treasury",
      href: "/dashboard",
      icon: LayoutGrid,
      active: pathname === "/dashboard",
    },
    {
      label: "Invoices",
      href: "/invoices",
      icon: FileText,
      active: pathname.startsWith("/invoices"),
      count: "11",
    },
    {
      label: "Clients",
      href: "/clients",
      icon: Building2,
      active: pathname.startsWith("/clients"),
    },
    {
      label: "Due Calendar",
      href: "/calendar",
      icon: Calendar,
      active: pathname.startsWith("/calendar"),
    },
    {
      label: "Settings",
      href: "/settings",
      icon: SlidersHorizontal,
      active: pathname.startsWith("/settings"),
    },
  ];

  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] min-h-screen bg-white">
      {/* Mobile Drawer Overlay */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        companyName={companyName}
        baseCurrency={baseCurrency}
        userName={userName}
        navItems={navItems}
        onSignOut={onSignOut}
      />

      {/* Desktop Left Sidebar Rail */}
      <aside
        className="w-[220px] bg-[#FAFAFA] border-r border-zinc-200 flex flex-col justify-between p-4 select-none hidden lg:flex"
        aria-label="Application sidebar navigation"
      >
        <div>
          {/* Top Workspace Switcher */}
          <div className="pb-4 mb-4 border-b border-zinc-200">
            <div className="flex items-center gap-2.5">
              <Image
                src="/finflow-icon.png"
                alt="FinFlow"
                width={28}
                height={28}
                className="w-7 h-7 rounded-sm object-contain shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {companyName}
                </div>
                <div className="text-[11px] font-mono text-zinc-500 mt-0.5 truncate">
                  {baseCurrency} Base · Treasury
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Stack */}
          <nav className="flex flex-col gap-1" aria-label="Navigation Stack">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    item.active
                      ? "flex items-center justify-between px-3 py-2 rounded-md bg-zinc-200/70 text-gray-900 text-xs font-medium"
                      : "flex items-center justify-between px-3 py-2 rounded-md text-zinc-600 hover:text-gray-900 hover:bg-zinc-100 text-xs font-medium transition-colors"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 stroke-[1.5]" />
                    <span>{item.label}</span>
                  </div>
                  {item.count && (
                    <span className="text-[11px] font-mono tabular-nums text-zinc-500">
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Rail Block */}
        <div className="pt-4 border-t border-zinc-200">
          <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-zinc-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 shrink-0" aria-hidden="true" />
            <span>1 USD = 278.50 PKR</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-700">
            <span className="truncate font-medium max-w-[140px]" title={userName}>
              {userName}
            </span>
            {onSignOut ? (
              <form action={onSignOut}>
                <button
                  type="submit"
                  aria-label="Log out"
                  title="Log out"
                  className="text-zinc-500 hover:text-gray-900 transition-colors p-1 rounded-md hover:bg-zinc-100"
                >
                  <LogOut className="w-4 h-4 stroke-[1.5]" />
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                aria-label="Log out"
                title="Log out"
                className="text-zinc-500 hover:text-gray-900 transition-colors p-1 rounded-md hover:bg-zinc-100"
              >
                <LogOut className="w-4 h-4 stroke-[1.5]" />
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Right Main Column */}
      <div className="flex flex-col min-w-0 bg-white">
        {/* Sticky Top Utility Bar */}
        <header className="h-14 sticky top-0 z-20 bg-white border-b border-zinc-200 px-6 lg:px-8 flex items-center justify-between select-none">
          {/* Left: Mobile hamburger + Page Title + divider + Period */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open mobile navigation menu"
              className="lg:hidden p-1.5 -ml-1.5 rounded-md text-zinc-600 hover:text-gray-900 hover:bg-zinc-100 transition-colors"
            >
              <Menu className="w-5 h-5 stroke-[1.5]" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-gray-900">
                {pageTitle}
              </h1>
              <span className="text-zinc-300 font-normal select-none">/</span>
              <span className="text-xs text-zinc-500 tabular-nums">Nov 2026</span>
            </div>
          </div>

          {/* Right: Segmented Currency Switcher + Primary CTA */}
          <div className="flex items-center gap-3">
            {/* Segmented Display Currency Switcher */}
            <div
              className="inline-flex items-center p-0.5 rounded-md bg-[#FAFAFA] border border-zinc-200"
              role="group"
              aria-label="Display currency toggle"
            >
              {(["PKR", "USD", "EUR"] as const).map((curr) => {
                const isActive = activeCurrency === curr;
                return (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setActiveCurrency(curr)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-mono transition-colors",
                      isActive
                        ? "rounded-[4px] bg-white border border-zinc-200 font-medium text-gray-900"
                        : "text-zinc-500 hover:text-gray-900"
                    )}
                  >
                    {curr}
                  </button>
                );
              })}
            </div>

            {/* Primary CTA: + Raise Invoice */}
            <Link
              href="/invoices/new"
              className="inline-flex items-center justify-center gap-2 h-[38px] px-4 rounded-md bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors select-none"
            >
              + Raise Invoice
            </Link>
          </div>
        </header>

        {/* Content canvas */}
        <main className="flex-1 min-w-0 bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}

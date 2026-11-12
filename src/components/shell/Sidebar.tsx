"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Users,
  ArrowLeftRight,
  Calendar,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu, type UserMenuProps } from "./UserMenu";

export interface SidebarProps {
  user?: UserMenuProps["user"];
  company?: UserMenuProps["company"];
  onSignOut?: () => Promise<void> | void;
  className?: string;
  onNavigate?: () => void;
}

const navItems = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: Receipt,
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    label: "Cash flow",
    href: "/cash-flow",
    icon: ArrowLeftRight,
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: Calendar,
  },
];

export function Sidebar({
  user,
  company,
  onSignOut,
  className,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-screen w-[240px] xl:w-[248px] flex-col justify-between border-r border-line bg-surface select-none shrink-0",
        className
      )}
    >
      {/* Top section: Wordmark + Navigation */}
      <div className="flex flex-col">
        {/* Wordmark: Source Serif 4, weight 600, 20px, --ink */}
        <div className="flex h-16 items-center px-6">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="font-serif text-[20px] font-semibold text-ink leading-none hover:opacity-90 transition-opacity"
          >
            FinFlow
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="flex flex-col gap-1 px-3 pt-2" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-[6px] px-3 text-[14px] leading-[20px] font-medium transition-colors",
                  isActive
                    ? "bg-brand-tint text-brand font-semibold"
                    : "text-ink-2 hover:bg-sunken hover:text-ink"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom section: Settings + User Menu, pinned, separated by hairline */}
      <div className="flex flex-col border-t border-line p-3 gap-1">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex h-10 items-center gap-2 rounded-[6px] px-3 text-[14px] leading-[20px] font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-brand-tint text-brand font-semibold"
              : "text-ink-2 hover:bg-sunken hover:text-ink"
          )}
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
        >
          <Settings className="h-5 w-5 shrink-0" strokeWidth={1.5} />
          <span>Settings</span>
        </Link>

        <UserMenu user={user} company={company} onSignOut={onSignOut} />
      </div>
    </aside>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileDrawerNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
  count?: string;
}

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  baseCurrency: string;
  userName: string;
  navItems: MobileDrawerNavItem[];
  onSignOut?: () => Promise<void> | void;
}

export function MobileDrawer({
  isOpen,
  onClose,
  companyName,
  baseCurrency,
  userName,
  navItems,
  onSignOut,
}: MobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div
        className="fixed inset-0 bg-zinc-950/20 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed inset-y-0 left-0 z-50 w-[240px] bg-[#FAFAFA] border-r border-zinc-200 flex flex-col justify-between p-4 shadow-[0_16px_36px_-12px_rgba(17,24,39,0.08)] select-none"
        aria-label="Mobile navigation"
      >
        <div>
          {/* Workspace Switcher with close button */}
          <div className="pb-4 mb-4 border-b border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
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
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              className="p-1 rounded-md text-zinc-500 hover:text-gray-900 hover:bg-zinc-200 transition-colors"
            >
              <X className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>

          {/* Navigation Stack */}
          <nav className="flex flex-col gap-1" aria-label="Mobile Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
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
    </div>
  );
}

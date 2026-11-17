"use client";

import * as React from "react";
import Link from "next/link";
import { SlidersHorizontal, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UserMenuProps {
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
  collapsed?: boolean;
  className?: string;
}

export function UserMenu({
  user,
  company,
  onSignOut,
  collapsed = false,
  className,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fullName = user?.fullName || "Treasury User";
  const email = user?.email || "";
  const companyName = company?.name || "Apex Technologies";
  const baseCurrency = company?.baseCurrency || "PKR";

  // Initials (max 2 characters)
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TU";

  return (
    <div className={cn("relative", className)} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
        className={cn(
          "flex items-center gap-2 rounded-md p-1.5 text-xs text-zinc-700 hover:text-gray-900 hover:bg-zinc-100 transition-colors select-none",
          collapsed && "justify-center"
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-medium text-gray-900 select-none">
          {initials}
        </span>
        {!collapsed && (
          <>
            <span className="hidden sm:inline max-w-[120px] truncate text-xs font-medium text-gray-900">
              {fullName}
            </span>
            <ChevronDown
              className={cn(
                "hidden sm:inline h-3.5 w-3.5 text-zinc-500 transition-transform",
                isOpen && "rotate-180"
              )}
              strokeWidth={1.5}
            />
          </>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-50 min-w-[220px] rounded-[18px] border border-line bg-white p-2 shadow-float select-none"
        >
          {/* User & Company summary */}
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-[14px] font-semibold text-ink">
              {fullName}
            </p>
            {email && (
              <p className="truncate text-[12px] text-ink-3 mt-0.5">
                {email}
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-2">
              <span className="truncate font-medium">{companyName}</span>
              <span className="text-ink-3">·</span>
              <span className="text-ink-3">{baseCurrency}</span>
            </div>
          </div>

          <div className="pt-1.5">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-[14px] text-ink-2 hover:text-ink hover:bg-fog transition-colors"
              role="menuitem"
            >
              <SlidersHorizontal className="h-4 w-4 stroke-[1.5]" />
              <span>Settings</span>
            </Link>

            {onSignOut ? (
              <button
                type="button"
                onClick={async () => {
                  setIsOpen(false);
                  await onSignOut();
                }}
                className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-[14px] text-ember-ink hover:bg-ember-tint transition-colors text-left"
                role="menuitem"
              >
                <LogOut className="h-4 w-4 stroke-[1.5]" />
                <span>Log out</span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-[14px] text-ember-ink hover:bg-ember-tint transition-colors text-left"
                role="menuitem"
              >
                <LogOut className="h-4 w-4 stroke-[1.5]" />
                <span>Log out</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

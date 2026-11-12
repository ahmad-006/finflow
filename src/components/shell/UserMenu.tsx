"use client";

import * as React from "react";
import Link from "next/link";
import { Settings, LogOut, ChevronUp } from "lucide-react";
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
}

export function UserMenu({
  user,
  company,
  onSignOut,
  collapsed = false,
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

  const fullName = user?.fullName || "User";
  const email = user?.email || "";
  const companyName = company?.name || "Company";

  // Initials (max 2 characters)
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "FF";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
        className={cn(
          "flex w-full items-center gap-3 rounded-[6px] p-2 text-left transition-colors hover:bg-sunken",
          collapsed && "justify-center p-1"
        )}
      >
        {/* Avatar: 32px on sunken with ink-2 text */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-[13px] font-medium text-ink-2 select-none">
          {initials}
        </div>

        {!collapsed && (
          <>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-medium text-ink leading-[18px]">
                {fullName}
              </span>
              <span className="truncate text-[12px] text-ink-3 leading-[16px]">
                {companyName}
              </span>
            </div>
            <ChevronUp
              className={cn(
                "h-4 w-4 shrink-0 text-ink-3 transition-transform",
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
          className={cn(
            "absolute bottom-full mb-2 z-50 min-w-[220px] rounded-[12px] border border-line bg-surface p-1 shadow-pop",
            collapsed ? "left-0" : "left-0 right-0"
          )}
        >
          {/* User & Company summary */}
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-[13px] font-semibold text-ink leading-[18px]">
              {fullName}
            </p>
            {email && (
              <p className="truncate text-[12px] text-ink-3 leading-[16px]">
                {email}
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-2">
              <span className="font-medium text-ink truncate">{companyName}</span>
              {company?.baseCurrency && (
                <span className="rounded-[3px] bg-sunken px-1.5 py-0.5 font-medium text-ink-3">
                  {company.baseCurrency}
                </span>
              )}
            </div>
          </div>

          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2 text-[13px] font-medium text-ink hover:bg-sunken transition-colors"
              role="menuitem"
            >
              <Settings className="h-4 w-4 text-ink-2" strokeWidth={1.5} />
              <span>Settings</span>
            </Link>

            <form
              action={async () => {
                setIsOpen(false);
                if (onSignOut) {
                  await onSignOut();
                }
              }}
            >
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2 text-[13px] font-medium text-negative hover:bg-negative-tint transition-colors text-left"
                role="menuitem"
              >
                <LogOut className="h-4 w-4 text-negative" strokeWidth={1.5} />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

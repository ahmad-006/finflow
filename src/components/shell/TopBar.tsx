"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { UserMenu, type UserMenuProps } from "./UserMenu";

export interface TopBarProps {
  user?: UserMenuProps["user"];
  company?: UserMenuProps["company"];
  onSignOut?: () => Promise<void> | void;
}

export function TopBar({ user, company, onSignOut }: TopBarProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Close drawer on escape key
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  // Lock body scroll when drawer is open
  React.useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      <header className="flex h-[56px] w-full items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-[6px] text-ink-2 hover:bg-sunken hover:text-ink transition-colors"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <Link
            href="/dashboard"
            className="font-serif text-[20px] font-semibold text-ink leading-none"
          >
            FinFlow
          </Link>
        </div>

        <div className="flex items-center">
          <UserMenu user={user} company={company} onSignOut={onSignOut} collapsed />
        </div>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          {/* Overlay: flat rgba(27,36,51,0.40), no blur */}
          <div
            className="fixed inset-0 bg-ink/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-surface shadow-pop">
            <div className="flex h-[56px] items-center justify-between border-b border-line px-4">
              <span className="font-serif text-[20px] font-semibold text-ink leading-none">
                FinFlow
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-8 w-8 items-center justify-center rounded-[6px] text-ink-2 hover:bg-sunken hover:text-ink transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <Sidebar
              user={user}
              company={company}
              onSignOut={onSignOut}
              className="h-[calc(100vh-56px)] w-full border-r-0"
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

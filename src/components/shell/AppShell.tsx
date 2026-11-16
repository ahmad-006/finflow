"use client";

import * as React from "react";
import { TopNav } from "./TopNav";

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
  return (
    <div className="min-h-screen bg-white text-ink flex flex-col font-sans">
      <TopNav user={user} company={company} onSignOut={onSignOut} />
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}

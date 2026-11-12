import * as React from "react";
import { redirect } from "next/navigation";
import { getSession, getCurrentUser, logoutAction } from "@/modules/auth";
import { TopNav } from "@/components/shell";

export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();

  const user = {
    id: currentUser?.id || session.userId,
    fullName: currentUser?.fullName || session.fullName,
    email: currentUser?.email || session.email,
    role: currentUser?.role || session.role,
  };

  const company = {
    id: currentUser?.companyId || session.companyId,
    name: currentUser?.company?.name || "FinFlow Workspace",
    baseCurrency: currentUser?.company?.baseCurrency || "PKR",
  };

  async function handleSignOut() {
    "use server";
    await logoutAction();
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      {/* Tideline Top Navigation Header (72px) */}
      <TopNav
        user={user}
        company={company}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area (Left-aligned asymmetric 12-column grid) */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-6 lg:px-10 py-10">
        <div className="w-full max-w-[1240px]">
          {children}
        </div>
      </main>
    </div>
  );
}

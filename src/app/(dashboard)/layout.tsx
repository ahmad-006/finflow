import * as React from "react";
import { redirect } from "next/navigation";
import { getSession, getCurrentUser, logoutAction } from "@/modules/auth";
import { Sidebar, TopBar } from "@/components/shell";

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
    <div className="flex min-h-screen bg-canvas">
      {/* Desktop sidebar (248px, hidden below lg) */}
      <Sidebar
        user={user}
        company={company}
        onSignOut={handleSignOut}
        className="hidden lg:flex"
      />

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile / tablet top bar (56px, visible below lg) */}
        <TopBar
          user={user}
          company={company}
          onSignOut={handleSignOut}
        />

        {/* Content area: max-w-[1200px] on desktop, max-w-[1320px] on wide, left-aligned */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-[1200px] xl:max-w-[1320px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

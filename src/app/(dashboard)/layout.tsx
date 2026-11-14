import * as React from "react";
import { redirect } from "next/navigation";
import { getSession, getCurrentUser, logoutAction } from "@/modules/auth";
import { AppShell } from "@/components/shell";

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
    name: currentUser?.company?.name || "Apex Technologies",
    baseCurrency: currentUser?.company?.baseCurrency || "PKR",
  };

  async function handleSignOut() {
    "use server";
    await logoutAction();
  }

  return (
    <AppShell user={user} company={company} onSignOut={handleSignOut}>
      {children}
    </AppShell>
  );
}

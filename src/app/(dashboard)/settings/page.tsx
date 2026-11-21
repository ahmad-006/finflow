import * as React from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/modules/auth";
import { getCompanySettings, getUserProfile } from "@/modules/settings/service";
import { SettingsCockpitView } from "@/components/settings/SettingsCockpitView";
import { SettingsSkeleton } from "@/components/settings/SettingsSkeleton";

export const metadata = {
  title: "Settings — FinFlow",
  description: "Manage company parameters, profile details, and account security.",
};

async function SettingsDataLoader() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const [company, profile] = await Promise.all([
    getCompanySettings(session.companyId),
    getUserProfile(session.userId),
  ]);

  if (!profile) {
    redirect("/login");
  }

  return (
    <SettingsCockpitView
      initialCompany={company}
      initialProfile={profile}
    />
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsDataLoader />
    </Suspense>
  );
}

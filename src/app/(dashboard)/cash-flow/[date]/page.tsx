import * as React from "react";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/modules/auth";
import { getCachedDayForecastDetails } from "@/modules/treasury";
import { CashFlowDayDetailView } from "@/components/treasury/CashFlowDayDetailView";
import { CashFlowDaySkeleton } from "@/components/treasury/CashFlowDaySkeleton";
import { Band } from "@/components/shell/Band";
import type { ForecastMode } from "@/modules/treasury/types";

export const metadata = {
  title: "Day Cash Breakdown | FinFlow",
  description:
    "Daily transaction reconciliation, maturing accounts receivable, scheduled operational payables, and closing cash balance.",
};

interface PageProps {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ mode?: string }>;
}

async function DayDataLoader({
  datePromise,
  searchParamsPromise,
}: {
  datePromise: Promise<{ date: string }>;
  searchParamsPromise: Promise<{ mode?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { date } = await datePromise;
  const { mode: rawMode } = await searchParamsPromise;

  const mode: ForecastMode = rawMode === "onTime" ? "onTime" : "expected";
  const details = await getCachedDayForecastDetails(session.companyId, date, mode);

  if (!details) {
    notFound();
  }

  return <CashFlowDayDetailView day={details} mode={mode} />;
}

export default async function CashFlowDayPage({ params, searchParams }: PageProps) {
  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <React.Suspense fallback={<CashFlowDaySkeleton />}>
          <DayDataLoader
            datePromise={params}
            searchParamsPromise={searchParams}
          />
        </React.Suspense>
      </Band>
    </main>
  );
}

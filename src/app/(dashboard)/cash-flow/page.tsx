import * as React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/modules/auth";
import { getCached30DayForecast } from "@/modules/treasury";
import { CashFlowCockpitView } from "@/components/treasury/CashFlowCockpitView";
import { CashFlowSkeleton } from "@/components/treasury/CashFlowSkeleton";
import { Band } from "@/components/shell/Band";

export const metadata = {
  title: "Cash Flow Forecast | FinFlow",
  description:
    "30-day forward liquidity forecast, latency-adjusted cash flow projections, safety buffer monitoring, and waterfall ledger.",
};

async function CashFlowDataLoader() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const forecast = await getCached30DayForecast(session.companyId);

  return <CashFlowCockpitView initialForecast={forecast} />;
}

export default function CashFlowPage() {
  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <React.Suspense fallback={<CashFlowSkeleton />}>
          <CashFlowDataLoader />
        </React.Suspense>
      </Band>
    </main>
  );
}

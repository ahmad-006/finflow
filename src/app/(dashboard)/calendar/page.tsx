import * as React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/modules/auth";
import { getCachedMonthCalendar } from "@/modules/calendar";
import { CalendarCockpitView } from "@/components/calendar/CalendarCockpitView";
import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton";
import { Band } from "@/components/shell/Band";

export const metadata = {
  title: "Financial Calendar & Due Dates | FinFlow",
  description:
    "Consolidated temporal schedule for accounts receivable maturities, overdue collection targets, and operational expense obligations.",
};

async function CalendarDataLoader() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const calendarData = await getCachedMonthCalendar(session.companyId);

  return <CalendarCockpitView initialData={calendarData} />;
}

export default function CalendarPage() {
  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <React.Suspense fallback={<CalendarSkeleton />}>
          <CalendarDataLoader />
        </React.Suspense>
      </Band>
    </main>
  );
}

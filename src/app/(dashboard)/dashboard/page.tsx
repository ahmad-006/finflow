import * as React from "react";
import { requireAuth, logoutAction } from "@/modules/auth";
import { db } from "@/lib/db";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/data/Money";
import { PositionStrip } from "@/components/data/PositionStrip";
import { formatDate } from "@/lib/format";
import { Building2, User, LogOut } from "lucide-react";

export const instant = false;

export default async function DashboardPage() {
  const session = await requireAuth();

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { company: true },
  });

  if (!user || !user.company) {
    return null;
  }

  const { company } = user;
  const liquidCashNum = Number(company.liquidReserve) || 0;
  const safetyBufferNum = Number(company.safetyBuffer) || 0;
  const currency = company.baseCurrency || "PKR";

  async function handleSignOut() {
    "use server";
    await logoutAction();
  }

  const positionData = {
    liquidCash: liquidCashNum,
    asOf: formatDate(new Date()),
    receivables30d: 0,
    receivablesCount: 0,
    overdue: 0,
    overdueCount: 0,
    currency,
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Tideline Page Opener / Statement Sentence */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-light tracking-[-0.03em] text-ink leading-tight">
            Overview
          </h1>
          <p className="text-[18px] sm:text-[20px] text-ink-2 font-normal mt-2 leading-[28px] max-w-2xl">
            Cash stays above your safety buffer of{" "}
            <span className="font-medium text-ink">
              {currency} {safetyBufferNum.toLocaleString()}
            </span>{" "}
            for the next 30 days.
          </p>
        </div>

        <form action={handleSignOut} className="shrink-0">
          <Button variant="secondary" type="submit" size="compact" className="gap-2">
            <LogOut className="h-4 w-4 text-ink-2" strokeWidth={1.5} />
            <span>Sign out</span>
          </Button>
        </form>
      </div>

      {/* Position Strip on Porcelain Sheet */}
      <PositionStrip data={positionData} />

      {/* Workspace & Identity Profile Sheet */}
      <div className="flex flex-col gap-4">
        <h2 className="text-[20px] font-medium text-ink tracking-[-0.01em]">
          Workspace profile
        </h2>

        <Panel className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Business info */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[15px] font-medium text-ink border-b border-line pb-3">
                <Building2 className="h-4 w-4 text-lagoon-ink" strokeWidth={1.5} />
                <span>Company information</span>
              </div>

              <div className="flex flex-col gap-3 text-[14px]">
                <div className="flex justify-between py-1.5 border-b border-line">
                  <span className="text-ink-2">Company name</span>
                  <span className="font-medium text-ink">{company.name}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-line">
                  <span className="text-ink-2">Base currency</span>
                  <span className="font-medium text-ink rounded-[6px] bg-sunken px-2.5 py-0.5 text-[13px]">
                    {company.baseCurrency}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-line">
                  <span className="text-ink-2">Liquid reserve</span>
                  <Money amount={liquidCashNum} currency={currency} variant="body" />
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-ink-2">Safety buffer</span>
                  <Money amount={safetyBufferNum} currency={currency} variant="body" />
                </div>
              </div>
            </div>

            {/* User profile */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[15px] font-medium text-ink border-b border-line pb-3">
                <User className="h-4 w-4 text-lagoon-ink" strokeWidth={1.5} />
                <span>User profile</span>
              </div>

              <div className="flex flex-col gap-3 text-[14px]">
                <div className="flex justify-between py-1.5 border-b border-line">
                  <span className="text-ink-2">Full name</span>
                  <span className="font-medium text-ink">{user.fullName}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-line">
                  <span className="text-ink-2">Email address</span>
                  <span className="font-medium text-ink">{user.email}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-line">
                  <span className="text-ink-2">Role</span>
                  <span className="font-medium text-ink">{user.role}</span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-ink-2">Member since</span>
                  <span className="font-medium text-ink">{formatDate(user.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

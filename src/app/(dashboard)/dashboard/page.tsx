import * as React from "react";
import { requireAuth, logoutAction } from "@/modules/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell";
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="Your liquid treasury cockpit and working capital position."
        actions={
          <form action={handleSignOut}>
            <Button variant="secondary" type="submit" size="compact" className="gap-2">
              <LogOut className="h-4 w-4 text-ink-2" strokeWidth={1.5} />
              <span>Sign out</span>
            </Button>
          </form>
        }
      />

      {/* Position Strip (Section 8.3) */}
      <PositionStrip data={positionData} />

      {/* Workspace & Identity Profile Panel */}
      <div className="flex flex-col gap-4">
        <h2 className="text-[18px] leading-[26px] font-semibold text-ink">
          Workspace profile
        </h2>

        <Panel className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Business info */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[15px] font-semibold text-ink border-b border-line pb-2">
                <Building2 className="h-4 w-4 text-brand" strokeWidth={1.5} />
                <span>Company information</span>
              </div>

              <div className="flex flex-col gap-2.5 text-[14px]">
                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-ink-2">Company name</span>
                  <span className="font-medium text-ink">{company.name}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-ink-2">Base currency</span>
                  <span className="font-medium text-ink rounded-[3px] bg-sunken px-2 py-0.5 text-[13px]">
                    {company.baseCurrency}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-ink-2">Liquid reserve</span>
                  <Money amount={liquidCashNum} currency={currency} variant="body" />
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-ink-2">Safety buffer</span>
                  <Money amount={safetyBufferNum} currency={currency} variant="body" />
                </div>
              </div>
            </div>

            {/* User profile */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[15px] font-semibold text-ink border-b border-line pb-2">
                <User className="h-4 w-4 text-brand" strokeWidth={1.5} />
                <span>User profile</span>
              </div>

              <div className="flex flex-col gap-2.5 text-[14px]">
                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-ink-2">Full name</span>
                  <span className="font-medium text-ink">{user.fullName}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-ink-2">Email address</span>
                  <span className="font-medium text-ink">{user.email}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-ink-2">Role</span>
                  <span className="font-medium text-ink">{user.role}</span>
                </div>

                <div className="flex justify-between py-1">
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

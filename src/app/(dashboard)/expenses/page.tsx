import * as React from "react";
import { redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/modules/auth";
import { getCachedExpenses, getCachedExpenseKPIs } from "@/modules/expenses/service";
import { ExpenseDirectoryView } from "@/components/expenses/ExpenseDirectoryView";
import { ExpenseDirectorySkeleton } from "@/components/expenses/ExpenseDirectorySkeleton";
import { Band } from "@/components/shell/Band";
import type { ExpenseRecord, ExpenseKPIs } from "@/modules/expenses/types";

export const metadata = {
  title: "Expenses & Scheduled Outflows | FinFlow",
  description:
    "Multi-tenant accounts payable management, recurring operational liabilities, forward liquidity forecasting, and automated outflow settlement.",
};

async function ExpenseDirectoryDataLoader() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
  const companyName = currentUser?.company?.name || "FinFlow Commercial Services";
  const baseCurrency = currentUser?.company?.baseCurrency || "PKR";

  const [rawExpenses, kpis] = await Promise.all([
    getCachedExpenses(session.companyId),
    getCachedExpenseKPIs(session.companyId),
  ]);

  // Support both array and { expenses: ExpenseRecord[] } return contracts safely
  const initialExpenses: ExpenseRecord[] = Array.isArray(rawExpenses)
    ? rawExpenses
    : (rawExpenses as { expenses: ExpenseRecord[] }).expenses || [];

  return (
    <ExpenseDirectoryView
      initialExpenses={initialExpenses}
      kpis={kpis}
      baseCurrency={baseCurrency}
      companyName={companyName}
    />
  );
}

export default function ExpensesPage() {
  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <React.Suspense fallback={<ExpenseDirectorySkeleton />}>
          <ExpenseDirectoryDataLoader />
        </React.Suspense>
      </Band>
    </main>
  );
}

import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import type {
  CalendarMonthData,
  CalendarDay,
  CalendarEvent,
  CalendarSummary,
} from "./types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toUtcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function formatDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Generates the full calendar month grid with itemized receivables and payables.
 */
export async function getMonthCalendar(
  companyId: string,
  year?: number,
  month?: number
): Promise<CalendarMonthData> {
  if (!companyId) {
    throw new Error("Tenant companyId is required.");
  }

  const now = new Date();
  const targetYear = year ?? now.getUTCFullYear();
  const targetMonth = month ?? now.getUTCMonth() + 1; // 1-indexed

  if (targetMonth < 1 || targetMonth > 12) {
    throw new Error("Target month must be between 1 and 12.");
  }

  const todayUtc = toUtcMidnight(now);
  const todayKey = formatDateKey(todayUtc);

  // 1. Fetch company baseCurrency
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, baseCurrency: true },
  });

  if (!company) {
    throw new Error("Company not found.");
  }

  const baseCurrency = company.baseCurrency || "PKR";

  // 2. Compute calendar grid boundaries (Monday start)
  const firstDayOfMonth = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
  const lastDayOfMonth = new Date(Date.UTC(targetYear, targetMonth, 0));
  const daysInMonth = lastDayOfMonth.getUTCDate();

  // Day of week: 0 is Sun, 1 is Mon, ... 6 is Sat
  // For Monday start: Mon=0, Tue=1, ... Sun=6
  const firstDayDow = firstDayOfMonth.getUTCDay();
  const mondayOffset = (firstDayDow + 6) % 7;

  const totalSlotsNeeded = mondayOffset + daysInMonth;
  const totalSlots = totalSlotsNeeded > 35 ? 42 : 35;

  const gridStartDate = new Date(
    firstDayOfMonth.getTime() - mondayOffset * 86400000
  );
  const gridEndDate = new Date(
    gridStartDate.getTime() + totalSlots * 86400000 - 1
  );

  // 3. Query invoices & expenses in visible range concurrently
  const [invoices, expenses] = await Promise.all([
    db.invoice.findMany({
      where: {
        companyId,
        status: { not: "CANCELLED" },
        dueDate: {
          gte: gridStartDate,
          lte: gridEndDate,
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
        dueDate: true,
        currency: true,
        totalAmount: true,
        baseTotalAmount: true,
        status: true,
        client: {
          select: {
            clientName: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
    db.expense.findMany({
      where: {
        companyId,
        dueDate: {
          gte: gridStartDate,
          lte: gridEndDate,
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        amount: true,
        category: true,
        isPaid: true,
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  // 4. Map records into CalendarEvent structure grouped by date key
  const eventsByDate = new Map<string, CalendarEvent[]>();

  for (const inv of invoices) {
    const dueUtc = toUtcMidnight(new Date(inv.dueDate));
    const dateKey = formatDateKey(dueUtc);
    const isOverdue =
      inv.status !== "PAID" && dueUtc.getTime() < todayUtc.getTime();

    const event: CalendarEvent = {
      id: inv.id,
      type: "invoice",
      title: inv.client?.clientName || "Commercial Client",
      referenceNumber: inv.invoiceNumber,
      amount: Number(inv.totalAmount),
      currency: inv.currency,
      baseAmount: Number(inv.baseTotalAmount || inv.totalAmount),
      date: dateKey,
      status: isOverdue ? "OVERDUE" : (inv.status as CalendarEvent["status"]),
      clientName: inv.client?.clientName || "Commercial Client",
      isOverdue,
    };

    const existing = eventsByDate.get(dateKey) || [];
    existing.push(event);
    eventsByDate.set(dateKey, existing);
  }

  for (const exp of expenses) {
    const dueUtc = toUtcMidnight(new Date(exp.dueDate));
    const dateKey = formatDateKey(dueUtc);
    const isOverdue = !exp.isPaid && dueUtc.getTime() < todayUtc.getTime();

    const event: CalendarEvent = {
      id: exp.id,
      type: "expense",
      title: exp.title,
      referenceNumber: exp.title,
      amount: Number(exp.amount),
      currency: baseCurrency,
      baseAmount: Number(exp.amount),
      date: dateKey,
      status: exp.isPaid ? "PAID" : isOverdue ? "OVERDUE" : "PENDING",
      category: exp.category,
      isOverdue,
    };

    const existing = eventsByDate.get(dateKey) || [];
    existing.push(event);
    eventsByDate.set(dateKey, existing);
  }

  // 5. Construct day slots and calculate aggregates
  const days: CalendarDay[] = [];
  let monthTotalInflows = 0;
  let monthTotalOutflows = 0;
  let monthInvoiceCount = 0;
  let monthExpenseCount = 0;
  let monthOverdueCount = 0;

  for (let i = 0; i < totalSlots; i++) {
    const slotDate = new Date(gridStartDate.getTime() + i * 86400000);
    const slotKey = formatDateKey(slotDate);
    const isCurrentMonth = slotDate.getUTCMonth() === targetMonth - 1;
    const isToday = slotKey === todayKey;
    const isPast = slotDate.getTime() < todayUtc.getTime();
    const dayEvents = eventsByDate.get(slotKey) || [];

    let dayInflows = 0;
    let dayOutflows = 0;

    for (const ev of dayEvents) {
      if (ev.type === "invoice") {
        dayInflows += ev.baseAmount;
        if (isCurrentMonth) monthInvoiceCount++;
      } else {
        dayOutflows += ev.baseAmount;
        if (isCurrentMonth) monthExpenseCount++;
      }
      if (isCurrentMonth && ev.isOverdue) {
        monthOverdueCount++;
      }
    }

    if (isCurrentMonth) {
      monthTotalInflows += dayInflows;
      monthTotalOutflows += dayOutflows;
    }

    days.push({
      date: slotKey,
      dayNumber: slotDate.getUTCDate(),
      dayOfWeek: DAY_NAMES[slotDate.getUTCDay()],
      isCurrentMonth,
      isToday,
      isPast,
      inflows: Math.round(dayInflows * 100) / 100,
      outflows: Math.round(dayOutflows * 100) / 100,
      netChange: Math.round((dayInflows - dayOutflows) * 100) / 100,
      events: dayEvents,
    });
  }

  const summary: CalendarSummary = {
    year: targetYear,
    month: targetMonth,
    monthName: MONTH_NAMES[targetMonth - 1],
    totalInflows: Math.round(monthTotalInflows * 100) / 100,
    totalOutflows: Math.round(monthTotalOutflows * 100) / 100,
    netChange: Math.round((monthTotalInflows - monthTotalOutflows) * 100) / 100,
    invoiceCount: monthInvoiceCount,
    expenseCount: monthExpenseCount,
    overdueCount: monthOverdueCount,
  };

  return {
    summary,
    days,
    baseCurrency,
  };
}

/**
 * Cached month calendar retrieval leveraging Next.js unstable_cache.
 */
export async function getCachedMonthCalendar(
  companyId: string,
  year?: number,
  month?: number
): Promise<CalendarMonthData> {
  const now = new Date();
  const targetYear = year ?? now.getUTCFullYear();
  const targetMonth = month ?? now.getUTCMonth() + 1;

  const cacheKey = `calendar-${companyId}-${targetYear}-${targetMonth}`;

  try {
    return await unstable_cache(
      async () => getMonthCalendar(companyId, targetYear, targetMonth),
      [cacheKey],
      {
        revalidate: 60,
        tags: [
          `calendar-${companyId}`,
          `invoices-${companyId}`,
          `expenses-${companyId}`,
        ],
      }
    )();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("incrementalCache missing")) {
      return getMonthCalendar(companyId, targetYear, targetMonth);
    }
    throw err;
  }
}

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { unstable_cache } from "next/cache";
import type {
  ForecastMode,
  InflowForecastEvent,
  OutflowForecastEvent,
  DailyForecastPoint,
  ForecastSummary,
  UpdateTreasurySettingsInput,
  TreasurySettings,
  UnpaidInvoiceDTO,
  UnpaidExpenseDTO,
  DetailedInflowEvent,
  DetailedOutflowEvent,
  DayForecastDetails,
} from "./types";
import { updateTreasurySettingsSchema } from "./validation";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * Rounds monetary amounts to 2 decimal places using half-up arithmetic.
 */
export function roundMoney(val: number | string | Decimal): number {
  return new Decimal(val.toString()).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Normalizes any date to UTC midnight (00:00:00.000Z).
 */
export function toUtcMidnight(date: Date | string | number): Date {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Computes average historical payment latency in days per client.
 * Uses settled invoices (status = PAID with non-null paidAt).
 * Early payments count as zero delay days.
 */
export async function computeClientLatencies(companyId: string): Promise<Map<string, number>> {
  const settledInvoices = await db.invoice.findMany({
    where: {
      companyId,
      status: "PAID",
      paidAt: { not: null },
    },
    select: {
      clientId: true,
      dueDate: true,
      paidAt: true,
    },
  });

  const statsMap = new Map<string, { totalDelayDays: number; count: number }>();

  for (const inv of settledInvoices) {
    if (!inv.clientId || !inv.paidAt || !inv.dueDate) {
      continue;
    }
    const paidMidnight = toUtcMidnight(inv.paidAt).getTime();
    const dueMidnight = toUtcMidnight(inv.dueDate).getTime();
    const diffDays = Math.round((paidMidnight - dueMidnight) / 86400000);
    const delayDays = Math.max(0, diffDays);

    const current = statsMap.get(inv.clientId) ?? { totalDelayDays: 0, count: 0 };
    current.totalDelayDays += delayDays;
    current.count += 1;
    statsMap.set(inv.clientId, current);
  }

  const latencyMap = new Map<string, number>();
  for (const [clientId, stats] of statsMap.entries()) {
    const avg = stats.count > 0 ? Math.round((stats.totalDelayDays / stats.count) * 10) / 10 : 0;
    latencyMap.set(clientId, avg);
  }

  return latencyMap;
}

export type { UnpaidInvoiceDTO, UnpaidExpenseDTO };

export interface ForecastCalculationParams {
  openingBalance: number;
  safetyBuffer: number;
  baseCurrency: string;
  anchorDateUtc: Date;
  unpaidInvoices: UnpaidInvoiceDTO[];
  unpaidExpenses: UnpaidExpenseDTO[];
  clientLatencyMap: Map<string, number>;
  mode?: ForecastMode;
}

/**
 * Pure calculation function for 30-day forecast points and curve series.
 * Generates slots Day 0 through Day 30 relative to tenant anchor date in UTC.
 */
export function buildForecastTrajectory(params: ForecastCalculationParams): {
  dailyPoints: DailyForecastPoint[];
  onTimeCurve: number[];
  expectedCurve: number[];
  overdueInflowsPool: number;
  overdueOutflowsPool: number;
} {
  const {
    openingBalance,
    safetyBuffer,
    anchorDateUtc,
    unpaidInvoices,
    unpaidExpenses,
    clientLatencyMap,
    mode = "expected",
  } = params;

  const tenantTodayMs = anchorDateUtc.getTime();

  // Helper to build daily slots for a specific mode
  const buildPointsForMode = (activeMode: ForecastMode) => {
    // 31 slots: index 0 to 30
    const points: DailyForecastPoint[] = [];
    const dayInflows: InflowForecastEvent[][] = Array.from({ length: 31 }, () => []);
    const dayOutflows: OutflowForecastEvent[][] = Array.from({ length: 31 }, () => []);

    let overdueInflowsSum = new Decimal(0);
    let overdueOutflowsSum = new Decimal(0);

    // 1. Map unpaid invoices
    for (const inv of unpaidInvoices) {
      const paid = Number(inv.paidAmount) || 0;
      let remainingBase: number;
      if (paid > 0) {
        const remainingDoc = Math.max(0, Number(inv.totalAmount) - paid);
        remainingBase = roundMoney(
          new Decimal(remainingDoc).mul(new Decimal(Number(inv.exchangeRate) || 1))
        );
      } else {
        remainingBase = roundMoney(Number(inv.baseTotalAmount) || Number(inv.totalAmount) || 0);
      }

      if (remainingBase <= 0) {
        continue;
      }

      const dueUtc = toUtcMidnight(inv.dueDate);
      const diffFromToday = Math.round((dueUtc.getTime() - tenantTodayMs) / 86400000);

      if (diffFromToday < 0) {
        // Overdue invoice on Day 0 with 0.70 collection haircut factor
        const haircutAmount = roundMoney(new Decimal(remainingBase).mul(0.7));
        overdueInflowsSum = overdueInflowsSum.add(haircutAmount);

        dayInflows[0].push({
          id: inv.id,
          clientName: inv.clientName || "Unknown Client",
          invoiceNumber: inv.invoiceNumber,
          amount: haircutAmount,
          isOverdue: true,
        });
      } else {
        // Maturing invoice
        let slotIndex = diffFromToday;
        if (activeMode === "expected") {
          const latency = Math.round(clientLatencyMap.get(inv.clientId) ?? 0);
          slotIndex = diffFromToday + latency;
        }

        if (slotIndex >= 0 && slotIndex <= 30) {
          dayInflows[slotIndex].push({
            id: inv.id,
            clientName: inv.clientName || "Unknown Client",
            invoiceNumber: inv.invoiceNumber,
            amount: remainingBase,
            isOverdue: false,
          });
        }
      }
    }

    // 2. Map unpaid expenses
    for (const exp of unpaidExpenses) {
      const amount = roundMoney(Number(exp.amount) || 0);
      if (amount <= 0) {
        continue;
      }

      const expDueUtc = toUtcMidnight(exp.dueDate);
      const diffFromToday = Math.round((expDueUtc.getTime() - tenantTodayMs) / 86400000);

      if (diffFromToday < 0) {
        // Overdue expense on Day 0 at 1.00 factor
        overdueOutflowsSum = overdueOutflowsSum.add(amount);

        dayOutflows[0].push({
          id: exp.id,
          title: exp.title,
          category: exp.category,
          amount,
          isOverdue: true,
        });
      } else if (diffFromToday <= 30) {
        // Maturing expense on scheduled day
        dayOutflows[diffFromToday].push({
          id: exp.id,
          title: exp.title,
          category: exp.category,
          amount,
          isOverdue: false,
        });
      }
    }

    // 3. Accumulate closing balance across 31 daily slots
    let runningBalance = roundMoney(openingBalance);

    for (let dayIndex = 0; dayIndex <= 30; dayIndex++) {
      const slotDate = new Date(
        Date.UTC(
          anchorDateUtc.getUTCFullYear(),
          anchorDateUtc.getUTCMonth(),
          anchorDateUtc.getUTCDate() + dayIndex,
          0,
          0,
          0,
          0
        )
      );

      const dateStr = slotDate.toISOString().slice(0, 10);
      const displayDate = `${slotDate.getUTCDate()} ${MONTH_NAMES[slotDate.getUTCMonth()]}`;
      const dayOfWeek = WEEKDAY_NAMES[slotDate.getUTCDay()];

      const inflowEvents = dayInflows[dayIndex];
      const outflowEvents = dayOutflows[dayIndex];

      const inflowsTotal = roundMoney(
        inflowEvents.reduce((acc, e) => acc.add(e.amount), new Decimal(0))
      );
      const outflowsTotal = roundMoney(
        outflowEvents.reduce((acc, e) => acc.add(e.amount), new Decimal(0))
      );

      const netChange = roundMoney(new Decimal(inflowsTotal).sub(outflowsTotal));
      const slotOpening = runningBalance;
      const closingBalance = roundMoney(new Decimal(slotOpening).add(netChange));

      const isBreach = closingBalance < safetyBuffer;
      const deficitAmount = isBreach
        ? roundMoney(new Decimal(safetyBuffer).sub(closingBalance))
        : 0;

      runningBalance = closingBalance;

      points.push({
        dayIndex,
        date: dateStr,
        displayDate,
        dayOfWeek,
        openingBalance: slotOpening,
        inflows: inflowsTotal,
        outflows: outflowsTotal,
        netChange,
        closingBalance,
        isBreach,
        deficitAmount,
        inflowEvents,
        outflowEvents,
      });
    }

    return {
      points,
      overdueInflows: roundMoney(overdueInflowsSum),
      overdueOutflows: roundMoney(overdueOutflowsSum),
    };
  };

  const onTimeResult = buildPointsForMode("onTime");
  const expectedResult = buildPointsForMode("expected");

  const dailyPoints = mode === "onTime" ? onTimeResult.points : expectedResult.points;
  const onTimeCurve = onTimeResult.points.map((p) => p.closingBalance);
  const expectedCurve = expectedResult.points.map((p) => p.closingBalance);

  return {
    dailyPoints,
    onTimeCurve,
    expectedCurve,
    overdueInflowsPool: onTimeResult.overdueInflows,
    overdueOutflowsPool: onTimeResult.overdueOutflows,
  };
}

/**
 * Calculates full 30-day forward forecast summary for a company tenant.
 */
export async function get30DayForecast(
  companyId: string,
  mode: ForecastMode = "expected",
  anchorDate?: Date
): Promise<ForecastSummary> {
  const anchorDateUtc = toUtcMidnight(anchorDate ?? new Date());
  const maxHorizonUtc = new Date(anchorDateUtc.getTime() + 120 * 86400000);

  const [company, rawInvoices, rawExpenses, clientLatencyMap] = await Promise.all([
    db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        liquidReserve: true,
        safetyBuffer: true,
        baseCurrency: true,
      },
    }),
    db.invoice.findMany({
      where: {
        companyId,
        status: { notIn: ["PAID", "CANCELLED"] },
        dueDate: { lte: maxHorizonUtc },
      },
      select: {
        id: true,
        invoiceNumber: true,
        currency: true,
        exchangeRate: true,
        totalAmount: true,
        baseTotalAmount: true,
        paidAmount: true,
        dueDate: true,
        clientId: true,
        client: {
          select: {
            clientName: true,
          },
        },
      },
    }),
    db.expense.findMany({
      where: {
        companyId,
        isPaid: false,
        dueDate: { lte: maxHorizonUtc },
      },
      select: {
        id: true,
        title: true,
        category: true,
        amount: true,
        dueDate: true,
      },
    }),
    computeClientLatencies(companyId),
  ]);

  if (!company) {
    throw new Error("Company not found.");
  }

  const openingBalance = roundMoney(Number(company.liquidReserve) || 0);
  const safetyBuffer = roundMoney(Number(company.safetyBuffer) || 0);
  const baseCurrency = company.baseCurrency || "PKR";

  const unpaidInvoices: UnpaidInvoiceDTO[] = rawInvoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    currency: inv.currency,
    exchangeRate: inv.exchangeRate,
    totalAmount: inv.totalAmount,
    baseTotalAmount: inv.baseTotalAmount,
    paidAmount: inv.paidAmount,
    dueDate: inv.dueDate,
    clientId: inv.clientId,
    clientName: inv.client?.clientName || "Unknown Client",
  }));

  const unpaidExpenses: UnpaidExpenseDTO[] = rawExpenses.map((exp) => ({
    id: exp.id,
    title: exp.title,
    category: exp.category,
    amount: exp.amount,
    dueDate: exp.dueDate,
  }));

  const trajectory = buildForecastTrajectory({
    openingBalance,
    safetyBuffer,
    baseCurrency,
    anchorDateUtc,
    unpaidInvoices,
    unpaidExpenses,
    clientLatencyMap,
    mode,
  });

  const { dailyPoints, onTimeCurve, expectedCurve, overdueInflowsPool, overdueOutflowsPool } =
    trajectory;

  let minProjectedBalance = dailyPoints[0].closingBalance;
  let minBalanceDate = dailyPoints[0].date;
  let maxDeficitAmount = 0;
  let firstBreachDate: string | null = null;
  let firstBreachDayOffset: number | null = null;
  let breachDurationDays = 0;

  for (const point of dailyPoints) {
    if (point.closingBalance < minProjectedBalance) {
      minProjectedBalance = point.closingBalance;
      minBalanceDate = point.date;
    }
    if (point.deficitAmount > maxDeficitAmount) {
      maxDeficitAmount = point.deficitAmount;
    }
    if (point.isBreach) {
      breachDurationDays += 1;
      if (firstBreachDate === null) {
        firstBreachDate = point.date;
        firstBreachDayOffset = point.dayIndex;
      }
    }
  }

  const total30DayInflow = roundMoney(
    dailyPoints.reduce((acc, p) => acc.add(p.inflows), new Decimal(0))
  );
  const total30DayOutflow = roundMoney(
    dailyPoints.reduce((acc, p) => acc.add(p.outflows), new Decimal(0))
  );
  const net30DayChange = roundMoney(new Decimal(total30DayInflow).sub(total30DayOutflow));
  const closing30DayBalance = dailyPoints[30].closingBalance;

  return {
    openingBalance,
    safetyBuffer,
    baseCurrency,
    minProjectedBalance,
    minBalanceDate,
    maxDeficitAmount,
    firstBreachDate,
    firstBreachDayOffset,
    breachDurationDays,
    total30DayInflow,
    total30DayOutflow,
    net30DayChange,
    closing30DayBalance,
    overdueInflowsPool,
    overdueOutflowsPool,
    dailyPoints,
    onTimeCurve,
    expectedCurve,
  };
}

/**
 * Retrieves current treasury settings for a company tenant.
 */
export async function getTreasurySettings(companyId: string): Promise<TreasurySettings> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      liquidReserve: true,
      safetyBuffer: true,
      baseCurrency: true,
    },
  });

  if (!company) {
    throw new Error("Company not found.");
  }

  return {
    liquidReserve: roundMoney(Number(company.liquidReserve) || 0),
    safetyBuffer: roundMoney(Number(company.safetyBuffer) || 0),
    baseCurrency: company.baseCurrency || "PKR",
  };
}

/**
 * Atomically updates liquid reserve and safety buffer for a company tenant.
 * Records change history in audit logs.
 */
export async function updateTreasurySettings(
  companyId: string,
  input: UpdateTreasurySettingsInput,
  userId?: string
): Promise<TreasurySettings> {
  const validated = updateTreasurySettingsSchema.parse(input);

  const existing = await db.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      liquidReserve: true,
      safetyBuffer: true,
      baseCurrency: true,
    },
  });

  if (!existing) {
    throw new Error("Company not found.");
  }

  const updateData: Prisma.CompanyUpdateInput = {};
  if (validated.liquidReserve !== undefined) {
    updateData.liquidReserve = new Prisma.Decimal(validated.liquidReserve);
  }
  if (validated.safetyBuffer !== undefined) {
    updateData.safetyBuffer = new Prisma.Decimal(validated.safetyBuffer);
  }

  return await db.$transaction(async (tx) => {
    const updated = await tx.company.update({
      where: { id: companyId },
      data: updateData,
      select: {
        liquidReserve: true,
        safetyBuffer: true,
        baseCurrency: true,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId,
        userId: userId ?? null,
        entityType: "WORKSPACE",
        entityId: companyId,
        action: "UPDATE",
        details: JSON.stringify({
          previous: {
            liquidReserve: Number(existing.liquidReserve),
            safetyBuffer: Number(existing.safetyBuffer),
          },
          updated: {
            liquidReserve: Number(updated.liquidReserve),
            safetyBuffer: Number(updated.safetyBuffer),
          },
        }),
      },
    });

    return {
      liquidReserve: roundMoney(Number(updated.liquidReserve)),
      safetyBuffer: roundMoney(Number(updated.safetyBuffer)),
      baseCurrency: updated.baseCurrency,
    };
  });
}

/**
 * Multi-tenant tagged cache: getCached30DayForecast
 * Invalidation tags: treasury-${companyId}, invoices-${companyId}, expenses-${companyId}
 */
export async function getCached30DayForecast(
  companyId: string,
  mode: ForecastMode = "expected",
  anchorDate?: Date
): Promise<ForecastSummary> {
  const dateKey = anchorDate ? anchorDate.toISOString().slice(0, 10) : "today";
  try {
    return await unstable_cache(
      async () => get30DayForecast(companyId, mode, anchorDate),
      [`treasury-forecast-${companyId}`, mode, dateKey],
      {
        tags: [
          `treasury-${companyId}`,
          `invoices-${companyId}`,
          `expenses-${companyId}`,
        ],
        revalidate: 3600,
      }
    )();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("incrementalCache missing")) {
      return get30DayForecast(companyId, mode, anchorDate);
    }
    throw err;
  }
}

/**
 * Retrieves detailed transaction breakdown and figures for a specific date in the 30-day forecast.
 */
export async function getDayForecastDetails(
  companyId: string,
  targetDateStr: string,
  mode: ForecastMode = "expected"
): Promise<DayForecastDetails | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) {
    return null;
  }

  const forecast = await get30DayForecast(companyId, mode);
  const pointIndex = forecast.dailyPoints.findIndex((p) => p.date === targetDateStr);
  if (pointIndex === -1) {
    return null;
  }

  const point = forecast.dailyPoints[pointIndex];
  const prevDate = pointIndex > 0 ? forecast.dailyPoints[pointIndex - 1].date : null;
  const nextDate =
    pointIndex < forecast.dailyPoints.length - 1
      ? forecast.dailyPoints[pointIndex + 1].date
      : null;

  const anchorDateUtc = toUtcMidnight(new Date());
  const tenantTodayMs = anchorDateUtc.getTime();
  const isDayZero = pointIndex === 0;

  const [rawInvoices, rawExpenses, clientLatencyMap] = await Promise.all([
    db.invoice.findMany({
      where: {
        companyId,
        status: { notIn: ["PAID", "CANCELLED"] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        currency: true,
        exchangeRate: true,
        totalAmount: true,
        baseTotalAmount: true,
        paidAmount: true,
        dueDate: true,
        status: true,
        clientId: true,
        client: {
          select: {
            clientName: true,
          },
        },
      },
    }),
    db.expense.findMany({
      where: {
        companyId,
        isPaid: false,
      },
      select: {
        id: true,
        title: true,
        category: true,
        amount: true,
        dueDate: true,
        recurrence: true,
        notes: true,
      },
    }),
    computeClientLatencies(companyId),
  ]);

  const inflows: DetailedInflowEvent[] = [];
  for (const inv of rawInvoices) {
    const paid = Number(inv.paidAmount) || 0;
    const total = Number(inv.totalAmount) || 0;
    const remainingDoc = Math.max(0, total - paid);
    const fxRate = Number(inv.exchangeRate) || 1;
    const remainingBase = roundMoney(new Decimal(remainingDoc).mul(new Decimal(fxRate)));
    if (remainingBase <= 0) continue;

    const dueUtc = toUtcMidnight(inv.dueDate);
    const diffFromToday = Math.round((dueUtc.getTime() - tenantTodayMs) / 86400000);

    let matchesDay = false;
    let isOverdue = false;

    if (diffFromToday < 0) {
      if (isDayZero) {
        matchesDay = true;
        isOverdue = true;
      }
    } else {
      let slotIndex = diffFromToday;
      if (mode === "expected") {
        const latency = Math.round(clientLatencyMap.get(inv.clientId) ?? 0);
        slotIndex = diffFromToday + latency;
      }
      if (slotIndex === pointIndex) {
        matchesDay = true;
        isOverdue = false;
      }
    }

    if (matchesDay) {
      inflows.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientId: inv.clientId,
        clientName: inv.client?.clientName || "Unknown Client",
        totalAmount: total,
        currency: inv.currency,
        exchangeRate: fxRate,
        baseAmount: isOverdue ? roundMoney(new Decimal(remainingBase).mul(0.7)) : remainingBase,
        paidAmount: paid,
        remainingAmount: remainingDoc,
        dueDate: toUtcMidnight(inv.dueDate).toISOString().slice(0, 10),
        status: inv.status,
        isOverdue,
      });
    }
  }

  const outflows: DetailedOutflowEvent[] = [];
  for (const exp of rawExpenses) {
    const amount = roundMoney(Number(exp.amount) || 0);
    if (amount <= 0) continue;

    const expDueUtc = toUtcMidnight(exp.dueDate);
    const diffFromToday = Math.round((expDueUtc.getTime() - tenantTodayMs) / 86400000);

    let matchesDay = false;
    let isOverdue = false;

    if (diffFromToday < 0) {
      if (isDayZero) {
        matchesDay = true;
        isOverdue = true;
      }
    } else if (diffFromToday === pointIndex) {
      matchesDay = true;
      isOverdue = false;
    }

    if (matchesDay) {
      outflows.push({
        id: exp.id,
        title: exp.title,
        category: exp.category,
        amount,
        dueDate: toUtcMidnight(exp.dueDate).toISOString().slice(0, 10),
        isPaid: false,
        isOverdue,
        recurrence: exp.recurrence,
        notes: exp.notes,
      });
    }
  }

  // Format full display date, e.g. "20 Nov 2026"
  const slotDate = new Date(point.date + "T00:00:00.000Z");
  const fullDisplayDate = `${slotDate.getUTCDate()} ${MONTH_NAMES[slotDate.getUTCMonth()]} ${slotDate.getUTCFullYear()}`;

  return {
    date: point.date,
    displayDate: fullDisplayDate,
    dayOfWeek: point.dayOfWeek,
    dayIndex: point.dayIndex,
    isToday: isDayZero,
    baseCurrency: forecast.baseCurrency,
    openingBalance: point.openingBalance,
    totalInflows: point.inflows,
    totalOutflows: point.outflows,
    netChange: point.netChange,
    closingBalance: point.closingBalance,
    safetyBuffer: forecast.safetyBuffer,
    isBreach: point.isBreach,
    deficitAmount: point.deficitAmount,
    prevDate,
    nextDate,
    inflows,
    outflows,
  };
}

/**
 * Multi-tenant tagged cache: getCachedDayForecastDetails
 */
export async function getCachedDayForecastDetails(
  companyId: string,
  targetDateStr: string,
  mode: ForecastMode = "expected"
): Promise<DayForecastDetails | null> {
  try {
    return await unstable_cache(
      async () => getDayForecastDetails(companyId, targetDateStr, mode),
      [`treasury-day-${companyId}`, targetDateStr, mode],
      {
        tags: [
          `treasury-${companyId}`,
          `invoices-${companyId}`,
          `expenses-${companyId}`,
        ],
        revalidate: 3600,
      }
    )();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("incrementalCache missing")) {
      return getDayForecastDetails(companyId, targetDateStr, mode);
    }
    throw err;
  }
}

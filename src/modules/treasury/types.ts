import type { Prisma } from "@prisma/client";

export type ForecastMode = "onTime" | "expected";

export interface UnpaidInvoiceDTO {
  id: string;
  invoiceNumber: string;
  currency: string;
  exchangeRate: number | Prisma.Decimal;
  totalAmount: number | Prisma.Decimal;
  baseTotalAmount: number | Prisma.Decimal;
  paidAmount: number | Prisma.Decimal;
  dueDate: Date | string;
  clientId: string;
  clientName: string;
}

export interface UnpaidExpenseDTO {
  id: string;
  title: string;
  category: string;
  amount: number | Prisma.Decimal;
  dueDate: Date | string;
}

export interface InflowForecastEvent {
  id: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  isOverdue: boolean;
}

export interface OutflowForecastEvent {
  id: string;
  title: string;
  category: string;
  amount: number;
  isOverdue: boolean;
}

export interface DailyForecastPoint {
  dayIndex: number;
  date: string;
  displayDate: string;
  dayOfWeek: string;
  openingBalance: number;
  inflows: number;
  outflows: number;
  netChange: number;
  closingBalance: number;
  isBreach: boolean;
  deficitAmount: number;
  inflowEvents: InflowForecastEvent[];
  outflowEvents: OutflowForecastEvent[];
}

export interface ForecastSummary {
  openingBalance: number;
  safetyBuffer: number;
  baseCurrency: string;
  minProjectedBalance: number;
  minBalanceDate: string;
  maxDeficitAmount: number;
  firstBreachDate: string | null;
  firstBreachDayOffset: number | null;
  breachDurationDays: number;
  total30DayInflow: number;
  total30DayOutflow: number;
  net30DayChange: number;
  closing30DayBalance: number;
  overdueInflowsPool: number;
  overdueOutflowsPool: number;
  dailyPoints: DailyForecastPoint[];
  onTimeCurve: number[];
  expectedCurve: number[];
}

export interface UpdateTreasurySettingsInput {
  liquidReserve?: number;
  safetyBuffer?: number;
}

export interface TreasurySettings {
  liquidReserve: number;
  safetyBuffer: number;
  baseCurrency: string;
}

export interface ForecastQueryInput {
  mode?: ForecastMode;
  horizonDays?: number;
}

export interface DetailedInflowEvent {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  totalAmount: number;
  currency: string;
  exchangeRate: number;
  baseAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: string;
  isOverdue: boolean;
}

export interface DetailedOutflowEvent {
  id: string;
  title: string;
  category: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  isOverdue: boolean;
  recurrence?: string;
  notes?: string | null;
}

export interface DayForecastDetails {
  date: string;
  displayDate: string;
  dayOfWeek: string;
  dayIndex: number;
  isToday: boolean;
  baseCurrency: string;
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netChange: number;
  closingBalance: number;
  safetyBuffer: number;
  isBreach: boolean;
  deficitAmount: number;
  prevDate: string | null;
  nextDate: string | null;
  inflows: DetailedInflowEvent[];
  outflows: DetailedOutflowEvent[];
}

export interface TreasuryActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

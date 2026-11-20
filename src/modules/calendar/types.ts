export type CalendarViewMode = "month" | "week" | "list";

export type CalendarEventType = "invoice" | "expense";

export type CalendarEventStatus =
  | "PAID"
  | "SENT"
  | "OVERDUE"
  | "DRAFT"
  | "PENDING"
  | "CANCELLED";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  referenceNumber: string;
  amount: number;
  currency: string;
  baseAmount: number;
  date: string; // YYYY-MM-DD (UTC normalized)
  status: CalendarEventStatus;
  clientName?: string;
  category?: string;
  isOverdue?: boolean;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  dayOfWeek: string; // Mon, Tue, etc.
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  inflows: number;
  outflows: number;
  netChange: number;
  events: CalendarEvent[];
}

export interface CalendarSummary {
  year: number;
  month: number; // 1-12
  monthName: string;
  totalInflows: number;
  totalOutflows: number;
  netChange: number;
  invoiceCount: number;
  expenseCount: number;
  overdueCount: number;
}

export interface CalendarMonthData {
  summary: CalendarSummary;
  days: CalendarDay[];
  baseCurrency: string;
}

export interface CalendarQueryInput {
  year?: number;
  month?: number;
  view?: CalendarViewMode;
}

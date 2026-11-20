export type ReminderDeliveryStatus = "SENT" | "FAILED";

export interface SendReminderInput {
  invoiceId: string;
}

export interface SendReminderResult {
  id: string;
  invoiceId: string;
  recipientEmail: string;
  status: ReminderDeliveryStatus;
  sentAt: Date;
}

export interface ReminderLogRecord {
  id: string;
  companyId: string | null;
  invoiceId: string;
  recipientEmail: string;
  status: ReminderDeliveryStatus;
  channel: string;
  error: string | null;
  sentAt: Date;
}

export interface SendReminderActionResult {
  success: boolean;
  data?: SendReminderResult;
  error?: string;
  errors?: Record<string, string[]>;
}

export type ActionState<T = SendReminderResult> = SendReminderActionResult & { data?: T };


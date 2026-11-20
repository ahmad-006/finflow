import { z } from "zod";

export const sendReminderSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID: Must be a valid UUID"),
});

export type SendReminderSchemaInput = z.infer<typeof sendReminderSchema>;

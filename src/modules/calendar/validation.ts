import { z } from "zod";

export const calendarQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2020, "Year must be 2020 or later.")
    .max(2050, "Year cannot exceed 2050.")
    .optional(),
  month: z.coerce
    .number()
    .int()
    .min(1, "Month must be between 1 and 12.")
    .max(12, "Month must be between 1 and 12.")
    .optional(),
  view: z.enum(["month", "week", "list"]).default("month"),
});

export type ValidatedCalendarQuery = z.infer<typeof calendarQuerySchema>;

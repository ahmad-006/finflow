import { z } from "zod";

function hasMaxTwoDecimals(val: number): boolean {
  const scaled = Math.round(val * 100);
  return Math.abs(val - scaled / 100) < 1e-6;
}

const currencyValueSchema = (fieldLabel: string) =>
  z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce
      .number({ message: `${fieldLabel} must be a valid number` })
      .min(0, `${fieldLabel} cannot be negative`)
      .max(10_000_000_000, `${fieldLabel} cannot exceed 10,000,000,000`)
      .refine(hasMaxTwoDecimals, "Maximum 2 decimal places allowed")
      .optional()
  );

export const updateTreasurySettingsSchema = z.object({
  liquidReserve: currencyValueSchema("Liquid reserve"),
  safetyBuffer: currencyValueSchema("Safety buffer"),
});

export const forecastQuerySchema = z.object({
  mode: z.enum(["onTime", "expected"]).optional().default("expected"),
  horizonDays: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce
      .number({ message: "Horizon days must be a number" })
      .int("Horizon days must be an integer")
      .min(1, "Horizon days must be at least 1")
      .max(90, "Horizon days cannot exceed 90")
      .optional()
      .default(30)
  ),
});

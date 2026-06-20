import { z } from "zod";

const salaryPeriodSchema = z
  .object({
    id: z.string().uuid().optional(),
    createdAt: z.iso.datetime().optional(),
    monthlySalary: z.number().nonnegative().max(10_000_000),
    extraPayAmount: z.number().nonnegative().max(10_000_000),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
  })
  .refine(
    (period) => {
      return period.endDate >= period.startDate;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  );

export const salarySchema = z.object({
  openingBalance: z.number().min(-10_000_000).max(10_000_000),
  periods: z.array(salaryPeriodSchema).max(100),
});

export const entrySchema = z.object({
  type: z.enum(["income", "expense"]),
  name: z.string().trim().min(1).max(100),
  amount: z.number().positive().max(10_000_000),
  description: z.string().trim().max(500).default(""),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
  date: z.iso.date(),
});

import type { ValueOf } from "type-fest";
import { z } from "zod";

export const kAgentTypes = {
  user: "user",
  clientToken: "clientToken",
} as const;

export type AgentType = ValueOf<typeof kAgentTypes>;

export const kDurationUnits = {
  milliseconds: "milliseconds",
  seconds: "seconds",
  minutes: "minutes",
  hours: "hours",
  days: "days",
  weeks: "weeks",
  months: "months",
  years: "years",
} as const;

export type DurationUnit = ValueOf<typeof kDurationUnits>;

export const kDurationUnitsToMs = {
  [kDurationUnits.milliseconds]: 1,
  [kDurationUnits.seconds]: 1000,
  [kDurationUnits.minutes]: 60 * 1000,
  [kDurationUnits.hours]: 60 * 60 * 1000,
  [kDurationUnits.days]: 24 * 60 * 60 * 1000,
  [kDurationUnits.weeks]: 7 * 24 * 60 * 60 * 1000,
  [kDurationUnits.months]: 30 * 24 * 60 * 60 * 1000,
  [kDurationUnits.years]: 365 * 24 * 60 * 60 * 1000,
} as const;

export const kDurationApplication = {
  before: "before",
  after: "after",
} as const;

export type DurationApplication = ValueOf<typeof kDurationApplication>;

export const durationSchema = z.object({
  years: z.number().int().min(0).optional(),
  months: z.number().int().min(0).optional(),
  weeks: z.number().int().min(0).optional(),
  days: z.number().int().min(0).optional(),
  hours: z.number().int().min(0).optional(),
  minutes: z.number().int().min(0).optional(),
  seconds: z.number().int().min(0).optional(),
  milliseconds: z.number().int().min(0).optional(),
});

export type Duration = z.infer<typeof durationSchema>;

export const kDurationUnitsSorted = [
  kDurationUnits.years,
  kDurationUnits.months,
  kDurationUnits.weeks,
  kDurationUnits.days,
  kDurationUnits.hours,
  kDurationUnits.minutes,
  kDurationUnits.seconds,
  kDurationUnits.milliseconds,
] as const;

export const kDurationUnitsToLabel: Record<DurationUnit, string> = {
  milliseconds: "Milliseconds",
  seconds: "Seconds",
  minutes: "Minutes",
  hours: "Hours",
  days: "Days",
  weeks: "Weeks",
  months: "Months",
  years: "Years",
};

export const kDurationUnitsToLimits = {
  milliseconds: () => {
    return { min: 0, max: 999 };
  },
  seconds: () => {
    return { min: 0, max: 59 };
  },
  minutes: () => {
    return { min: 0, max: 59 };
  },
  hours: () => {
    return { min: 0, max: 23 };
  },
  days: (month: number | undefined, year: number | undefined) => {
    if (month && year) {
      return { min: 0, max: new Date(year, month, 0).getDate() };
    }

    return { min: 0, max: 30 };
  },
  months: () => {
    return { min: 0, max: 11 };
  },
  years: () => {
    return { min: 0, max: Number.MAX_SAFE_INTEGER };
  },
  weeks: () => {
    return { min: 0, max: 51 };
  },
} as const;

export const kWildcard = "*" as const;

export const kByTypes = {
  user: "user",
  clientToken: "clientToken",
  system: "system",
} as const;

export type ByType = ValueOf<typeof kByTypes>;

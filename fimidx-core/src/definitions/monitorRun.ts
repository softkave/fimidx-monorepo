import type { ValueOf } from "type-fest";
import { z } from "zod";
import {
  kMonitorTimeFields,
  type MonitorTimeField,
} from "./monitor.js";
import {
  numberMetaQuerySchema,
  objSortListSchema,
  stringMetaQuerySchema,
} from "./obj.js";

export const kMonitorRunSuppressedReasons = {
  muted: "muted",
  snoozed: "snoozed",
  cooldown: "cooldown",
  below_threshold: "below_threshold",
  no_matches: "no_matches",
  disabled: "disabled",
  concurrent: "concurrent",
} as const;

export type MonitorRunSuppressedReason = ValueOf<
  typeof kMonitorRunSuppressedReasons
>;

export interface IMonitorRun {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByType: string;
  updatedBy: string;
  updatedByType: string;
  projectId: string;
  groupId: string;
  monitorId: string;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  windowStart: Date;
  windowEnd: Date;
  timeField: MonitorTimeField;
  matchCount: number;
  alertCreated: boolean;
  alertId?: string | null;
  suppressedReason?: MonitorRunSuppressedReason | null;
  error?: string | null;
}

export interface IMonitorRunObjRecord {
  monitorId: string;
  startedAt: Date | string;
  finishedAt: Date | string;
  durationMs: number;
  windowStart: Date | string;
  windowEnd: Date | string;
  timeField: MonitorTimeField;
  matchCount: number;
  alertCreated: boolean;
  alertId?: string | null;
  suppressedReason?: MonitorRunSuppressedReason | null;
  error?: string | null;
}

export const monitorRunQuerySchema = z.object({
  projectId: z.string().min(1),
  id: stringMetaQuerySchema.optional(),
  monitorId: stringMetaQuerySchema.optional(),
  createdAt: numberMetaQuerySchema.optional(),
  updatedAt: numberMetaQuerySchema.optional(),
  createdBy: stringMetaQuerySchema.optional(),
  updatedBy: stringMetaQuerySchema.optional(),
});

export const getMonitorRunsSchema = z.object({
  query: monitorRunQuerySchema,
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
  sort: objSortListSchema.optional(),
});

export type GetMonitorRunsEndpointArgs = z.infer<typeof getMonitorRunsSchema>;

export interface IGetMonitorRunsEndpointResponse {
  monitorRuns: IMonitorRun[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export const kMonitorRunSuppressedReasonLabels: Record<
  MonitorRunSuppressedReason,
  string
> = {
  [kMonitorRunSuppressedReasons.muted]: "Muted",
  [kMonitorRunSuppressedReasons.snoozed]: "Snoozed",
  [kMonitorRunSuppressedReasons.cooldown]: "Cooldown",
  [kMonitorRunSuppressedReasons.below_threshold]: "Below threshold",
  [kMonitorRunSuppressedReasons.no_matches]: "No matches",
  [kMonitorRunSuppressedReasons.disabled]: "Disabled",
  [kMonitorRunSuppressedReasons.concurrent]: "Concurrent run skipped",
};

export { kMonitorTimeFields };

import type { Duration } from "date-fns";
import type { ValueOf } from "type-fest";
import { z } from "zod";
import {
  numberMetaQuerySchema,
  objMetaQuerySchema,
  objRecordQueryListSchema,
  objSortListSchema,
  stringMetaQuerySchema,
} from "./obj.js";
import { durationSchema } from "./other.js";

export const kMonitorResourceTypes = {
  logs: "logs",
} as const;

export type MonitorResourceType = ValueOf<typeof kMonitorResourceTypes>;

export const kMonitorTimeFields = {
  createdAt: "createdAt",
  timestamp: "timestamp",
} as const;

export type MonitorTimeField = ValueOf<typeof kMonitorTimeFields>;

/** Minimum monitor interval: 5 minutes in ms. */
export const kMonitorMinIntervalMs = 5 * 60 * 1000;

export const monitorObjMetaQuerySchema = objMetaQuerySchema.omit({
  projectId: true,
  groupId: true,
  tag: true,
  shouldIndex: true,
  fieldsToIndex: true,
});

export const monitorObjQueryLeafSchema = z.object({
  recordQuery: objRecordQueryListSchema.optional(),
  metaQuery: monitorObjMetaQuerySchema.optional(),
});

export interface IMonitorObjQueryLogical {
  and?: IMonitorObjQueryBranch[];
  or?: IMonitorObjQueryBranch[];
}

export type IMonitorObjQueryBranch =
  | z.infer<typeof monitorObjQueryLeafSchema>
  | IMonitorObjQueryLogical;

export const monitorObjQueryLogicalSchema: z.ZodType<IMonitorObjQueryLogical> =
  z.lazy(() =>
    z.object({
      and: z
        .array(
          z.union([monitorObjQueryLeafSchema, monitorObjQueryLogicalSchema])
        )
        .max(100)
        .optional(),
      or: z
        .array(
          z.union([monitorObjQueryLeafSchema, monitorObjQueryLogicalSchema])
        )
        .max(100)
        .optional(),
    })
  );

export const monitorObjQuerySchema = z.union([
  monitorObjQueryLeafSchema,
  monitorObjQueryLogicalSchema,
]);

export type IMonitorObjQuery = z.infer<typeof monitorObjQuerySchema>;

export const kMonitorStatus = {
  enabled: "enabled",
  disabled: "disabled",
} as const;

export type MonitorStatus = ValueOf<typeof kMonitorStatus>;

export const kMonitorReportToTypes = {
  user: "user",
  webhook: "webhook",
} as const;

export type MonitorReportToType = ValueOf<typeof kMonitorReportToTypes>;

export interface IMonitorReportsToUser {
  type: "user";
  userId: string;
}

export interface IMonitorReportsToWebhook {
  type: "webhook";
  url: string;
}

export type IMonitorReportsTo =
  | IMonitorReportsToUser
  | IMonitorReportsToWebhook;

export interface IMonitor {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  createdByType: string;
  updatedByType: string;
  projectId: string;
  query: IMonitorObjQuery;
  groupId: string;
  status: MonitorStatus;
  reportsTo: IMonitorReportsTo[];
  interval: Duration;
  resourceType: MonitorResourceType;
  timeField: MonitorTimeField;
  alertIfCountGreaterThan?: number | null;
  cooldown: Duration;
  muted: boolean;
  snoozedUntil?: Date | null;
  lastRunAt?: Date | null;
  lastAlertedAt?: Date | null;
  /** Set while a run is in progress; used as concurrency guard. */
  runningAt?: Date | null;
}

export interface IMonitorObjRecord {
  name: string;
  description?: string | null;
  query: IMonitorObjQuery;
  status: MonitorStatus;
  reportsTo: IMonitorReportsTo[];
  interval: Duration;
  resourceType: MonitorResourceType;
  timeField: MonitorTimeField;
  alertIfCountGreaterThan?: number | null;
  cooldown: Duration;
  muted: boolean;
  snoozedUntil?: Date | string | null;
  lastRunAt?: Date | string | null;
  lastAlertedAt?: Date | string | null;
  runningAt?: Date | string | null;
}

const monitorReportsToUserSchema = z.object({
  type: z.literal(kMonitorReportToTypes.user),
  userId: z.string().min(1),
});

const monitorReportsToWebhookSchema = z.object({
  type: z.literal(kMonitorReportToTypes.webhook),
  url: z.string().url(),
});

export const monitorReportsToSchema = z.union([
  monitorReportsToUserSchema,
  monitorReportsToWebhookSchema,
]);

/** Accept legacy string userIds or full reportsTo objects. */
export const monitorReportsToInputSchema = z
  .array(z.union([z.string().min(1), monitorReportsToSchema]))
  .max(100);

export function normalizeMonitorReportsTo(
  reportsTo: Array<string | IMonitorReportsTo>
): IMonitorReportsTo[] {
  return reportsTo.map((r) =>
    typeof r === "string"
      ? { type: kMonitorReportToTypes.user, userId: r }
      : r
  );
}

export const addMonitorSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  query: monitorObjQuerySchema,
  status: z.nativeEnum(kMonitorStatus),
  reportsTo: monitorReportsToInputSchema,
  interval: durationSchema,
  resourceType: z.nativeEnum(kMonitorResourceTypes).optional(),
  timeField: z.nativeEnum(kMonitorTimeFields).optional(),
  alertIfCountGreaterThan: z.number().int().min(0).optional().nullable(),
  cooldown: durationSchema.optional(),
  muted: z.boolean().optional(),
  snoozedUntil: z.union([z.string().datetime(), z.date()]).optional().nullable(),
});

export const monitorQuerySchema = z.object({
  projectId: z.string().min(1),
  id: stringMetaQuerySchema.optional(),
  createdBy: stringMetaQuerySchema.optional(),
  updatedBy: stringMetaQuerySchema.optional(),
  createdAt: numberMetaQuerySchema.optional(),
  updatedAt: numberMetaQuerySchema.optional(),
  name: stringMetaQuerySchema.optional(),
  status: stringMetaQuerySchema.optional(),
  reportsTo: stringMetaQuerySchema.optional(),
});

export const updateMonitorsSchema = z.object({
  query: monitorQuerySchema,
  update: z.object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    query: monitorObjQuerySchema.optional(),
    status: z.nativeEnum(kMonitorStatus).optional(),
    reportsTo: monitorReportsToInputSchema.optional(),
    interval: durationSchema.optional(),
    resourceType: z.nativeEnum(kMonitorResourceTypes).optional(),
    timeField: z.nativeEnum(kMonitorTimeFields).optional(),
    alertIfCountGreaterThan: z.number().int().min(0).optional().nullable(),
    cooldown: durationSchema.optional(),
    muted: z.boolean().optional(),
    snoozedUntil: z
      .union([z.string().datetime(), z.date()])
      .optional()
      .nullable(),
  }),
});

export const getMonitorsSchema = z.object({
  query: monitorQuerySchema,
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
  sort: objSortListSchema.optional(),
});

export const deleteMonitorsSchema = z.object({
  query: monitorQuerySchema,
  deleteMany: z.boolean().optional(),
});

export const runMonitorSchema = z.object({
  monitorId: z.string().min(1),
});

export const previewMonitorSchema = z.object({
  monitorId: z.string().min(1),
});

export type AddMonitorEndpointArgs = z.input<typeof addMonitorSchema>;
export type UpdateMonitorsEndpointArgs = z.input<typeof updateMonitorsSchema>;
export type GetMonitorsEndpointArgs = z.infer<typeof getMonitorsSchema>;
export type DeleteMonitorsEndpointArgs = z.infer<typeof deleteMonitorsSchema>;
export type RunMonitorEndpointArgs = z.infer<typeof runMonitorSchema>;
export type PreviewMonitorEndpointArgs = z.infer<typeof previewMonitorSchema>;

export interface IGetMonitorsEndpointResponse {
  monitors: IMonitor[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IAddMonitorEndpointResponse {
  monitor: IMonitor;
}

export interface IUpdateMonitorsEndpointResponse {
  success: boolean;
}

export const kMonitorStatusLabels = {
  [kMonitorStatus.enabled]: "Enabled",
  [kMonitorStatus.disabled]: "Disabled",
} as const;

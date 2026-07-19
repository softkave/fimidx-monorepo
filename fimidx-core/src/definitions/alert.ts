import { z } from "zod";
import {
  kMonitorResourceTypes,
  kMonitorTimeFields,
  type MonitorResourceType,
  type MonitorTimeField,
} from "./monitor.js";
import {
  numberMetaQuerySchema,
  objSortListSchema,
  stringMetaQuerySchema,
  type IObjRecordQueryList,
} from "./obj.js";

export interface IAlert {
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
  monitorName: string;
  monitorDescription?: string | null;
  resourceType: MonitorResourceType;
  timeField: MonitorTimeField;
  filters: IObjRecordQueryList;
  windowStart: Date;
  windowEnd: Date;
  matchCount: number;
  alertIfCountGreaterThan?: number | null;
  notifiedUserIds: string[];
  acknowledgedAt?: Date | null;
  acknowledgedBy?: string | null;
}

export interface IAlertObjRecord {
  monitorId: string;
  monitorName: string;
  monitorDescription?: string | null;
  resourceType: MonitorResourceType;
  timeField: MonitorTimeField;
  filters: IObjRecordQueryList;
  windowStart: Date | string;
  windowEnd: Date | string;
  matchCount: number;
  alertIfCountGreaterThan?: number | null;
  notifiedUserIds: string[];
  acknowledgedAt?: Date | string | null;
  acknowledgedBy?: string | null;
}

export const alertQuerySchema = z.object({
  projectId: z.string().min(1),
  id: stringMetaQuerySchema.optional(),
  monitorId: stringMetaQuerySchema.optional(),
  createdAt: numberMetaQuerySchema.optional(),
  updatedAt: numberMetaQuerySchema.optional(),
  createdBy: stringMetaQuerySchema.optional(),
  updatedBy: stringMetaQuerySchema.optional(),
});

export const getAlertsSchema = z.object({
  query: alertQuerySchema,
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
  sort: objSortListSchema.optional(),
});

export const getAlertSchema = z.object({
  alertId: z.string().min(1),
});

export const acknowledgeAlertSchema = z.object({
  alertId: z.string().min(1),
  acknowledged: z.boolean().optional().default(true),
});

export const getAlertLogsSchema = z.object({
  alertId: z.string().min(1),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
});

export type GetAlertsEndpointArgs = z.infer<typeof getAlertsSchema>;
export type GetAlertEndpointArgs = z.infer<typeof getAlertSchema>;
export type AcknowledgeAlertEndpointArgs = z.infer<
  typeof acknowledgeAlertSchema
>;
export type GetAlertLogsEndpointArgs = z.infer<typeof getAlertLogsSchema>;

export interface IGetAlertsEndpointResponse {
  alerts: IAlert[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IGetAlertEndpointResponse {
  alert: IAlert;
}

export interface IAcknowledgeAlertEndpointResponse {
  alert: IAlert;
}

export const kAlertResourceTypeLabels = {
  [kMonitorResourceTypes.logs]: "Logs",
} as const;

export const kAlertTimeFieldLabels: Record<MonitorTimeField, string> = {
  [kMonitorTimeFields.createdAt]: "Ingestion time",
  [kMonitorTimeFields.timestamp]: "Log event time",
};

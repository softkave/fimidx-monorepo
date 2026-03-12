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

export interface IMonitorReportsTo {
  userId: string;
}

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
}

export interface IMonitorObjRecord {
  name: string;
  description?: string | null;
  query: IMonitorObjQuery;
  status: MonitorStatus;
  reportsTo: IMonitorReportsTo[];
  interval: Duration;
}

export const addMonitorSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  query: monitorObjQuerySchema,
  status: z.nativeEnum(kMonitorStatus),
  reportsTo: z.array(z.string().min(1)).max(100),
  interval: durationSchema,
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
    reportsTo: z.array(z.string().min(1)).max(100).optional(),
    interval: durationSchema.optional(),
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

export type AddMonitorEndpointArgs = z.infer<typeof addMonitorSchema>;
export type UpdateMonitorsEndpointArgs = z.infer<typeof updateMonitorsSchema>;
export type GetMonitorsEndpointArgs = z.infer<typeof getMonitorsSchema>;
export type DeleteMonitorsEndpointArgs = z.infer<typeof deleteMonitorsSchema>;

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

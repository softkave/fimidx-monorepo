import type { AnyObject } from "softkave-js-utils";
import { z } from "zod";
import type { FieldType } from "../common/indexer.js";
import {
  inputObjRecordArraySchema,
  objRecordQueryListSchema,
  objSortListSchema,
  stringMetaQuerySchema,
} from "./obj.js";

export interface ILogField {
  id: string;
  path: string;
  type: FieldType;
  arrayTypes: FieldType[];
  isArrayCompressed: boolean;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
  groupId: string;
}

export interface ILog {
  id: string;
  createdAt: Date;
  createdBy: string;
  createdByType: string;
  projectId: string;
  groupId: string;
  data: AnyObject;
}

export const ingestLogsSchema = z.object({
  projectId: z.string().min(1),
  logs: inputObjRecordArraySchema,
});

export const logQuerySchema = z.object({
  projectId: z.string().min(1),
  id: stringMetaQuerySchema.optional(),
  createdBy: stringMetaQuerySchema.optional(),
  logsQuery: objRecordQueryListSchema.optional(),
});

export const getLogsSchema = z.object({
  query: logQuerySchema,
  page: z.number().optional(),
  limit: z.number().optional(),
  sort: objSortListSchema.optional(),
});

export const getLogFieldsSchema = z.object({
  query: z.object({
    projectId: z.string().min(1),
    path: stringMetaQuerySchema.optional(),
  }),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export type IngestLogsEndpointArgs = z.infer<typeof ingestLogsSchema>;
export type GetLogsEndpointArgs = z.infer<typeof getLogsSchema>;
export type GetLogFieldsEndpointArgs = z.infer<typeof getLogFieldsSchema>;

export interface GetLogsEndpointResponse {
  logs: ILog[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface GetLogFieldsEndpointResponse {
  fields: ILogField[];
  page: number;
  limit: number;
  hasMore: boolean;
}

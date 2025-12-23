import type { AnyObject } from "softkave-js-utils";
import { z } from "zod";
import type { FieldType } from "../common/indexer.js";
import {
  inputObjRecordArraySchema,
  objPartLogicalQuerySchema,
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
  appId: string;
  groupId: string;
}

export interface ILog {
  id: string;
  createdAt: Date;
  createdBy: string;
  createdByType: string;
  appId: string;
  groupId: string;
  data: AnyObject;
}

export const ingestLogsSchema = z.object({
  appId: z.string(),
  logs: inputObjRecordArraySchema,
});

export const logsMetaQuerySchema = z.object({
  id: stringMetaQuerySchema.optional(),
  createdBy: stringMetaQuerySchema.optional(),
});

export const logQuerySchema = z.object({
  appId: z.string(),
  logsQuery: objPartLogicalQuerySchema.optional(),
  metaQuery: logsMetaQuerySchema.optional(),
});

export const getLogsSchema = z.object({
  query: logQuerySchema,
  page: z.number().optional(),
  limit: z.number().optional(),
  sort: objSortListSchema.optional(),
});

export const getLogFieldsSchema = z.object({
  appId: z.string(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export const initSdkSchema = z.object({});

export type IngestLogsEndpointArgs = z.infer<typeof ingestLogsSchema>;
export type GetLogsEndpointArgs = z.infer<typeof getLogsSchema>;
export type GetLogFieldsEndpointArgs = z.infer<typeof getLogFieldsSchema>;
export type InitSdkEndpointArgs = z.infer<typeof initSdkSchema>;

export interface InitSdkEndpointResponse {
  fimidaraToken: string;
  folderPath: string;
  filePrefix: string;
}

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

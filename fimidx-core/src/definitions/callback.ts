import type { AnyObject } from "softkave-js-utils";
import { z } from "zod";
import {
  numberMetaQuerySchema,
  objPartQueryListSchema,
  objSortListSchema,
  stringMetaQuerySchema,
} from "./obj.js";

export interface ICallback {
  id: string;
  createdAt: number | Date;
  updatedAt: number | Date;
  groupId: string;
  projectId: string;
  name: string;
  description?: string | null;
  createdBy: string;
  createdByType: string;
  updatedBy: string;
  updatedByType: string;
  /** The callback URL */
  url: string;
  /** The callback HTTP method */
  method: string;
  /** The callback headers */
  requestHeaders: Record<string, string> | null;
  /** The callback body */
  requestBody: string | null;
  /** The last time the callback was executed */
  lastExecutedAt: number | Date | null;
  /** The last time the callback was successful */
  lastSuccessAt: number | Date | null;
  /** The last time the callback failed */
  lastErrorAt: number | Date | null;
  /** When the callback is scheduled to be executed, once */
  timeout: Date | number | null;
  /** When execution of the callback is scheduled to start, recurring */
  intervalFrom: Date | number | null;
  /** The interval between executions of the callback, recurring */
  intervalMs: number | null;
  /** The callback idempotency key */
  idempotencyKey: string | null;
}

export interface ICallbackObjRecord {
  name: string;
  description?: string | null;
  url: string;
  method: string;
  requestHeaders: Record<string, string> | null;
  requestBody: string | null;
  lastExecutedAt: number | Date | null;
  lastSuccessAt: number | Date | null;
  lastErrorAt: number | Date | null;
  /** When the callback is scheduled to be executed, once */
  timeout: Date | number | null;
  /** When execution of the callback is scheduled to start, recurring */
  intervalFrom: Date | number | null;
  /** The interval between executions of the callback, recurring */
  intervalMs: number | null;
  idempotencyKey: string | null;
}

export interface ICallbackExecution {
  id: string;
  groupId: string;
  projectId: string;
  callbackId: string;
  /** The callback error from network, fimidx, etc. */
  error: string | null;
  responseHeaders: Record<string, string> | null;
  responseBodyRaw: string | null;
  responseBodyJson: AnyObject | null;
  responseStatusCode: number | null;
  executedAt: number | Date;
}

export interface ICallbackExecutionObjRecord {
  callbackId: string;
  error: string | null;
  responseHeaders: Record<string, string> | null;
  responseBodyRaw: string | null;
  responseBodyJson: AnyObject | null;
  responseStatusCode: number | null;
  executedAt: number | Date;
}

export const callbackMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
]);

export const addCallbackSchema = z.object({
  projectId: z.string(),
  url: z.string().url(),
  method: callbackMethodSchema,
  requestHeaders: z.record(z.string(), z.string()).optional(),
  requestBody: z.string().optional(),
  timeout: z.string().datetime().optional(),
  intervalFrom: z.string().datetime().optional(),
  intervalMs: z.number().optional(),
  idempotencyKey: z.string().optional(),
  description: z.string().optional(),
  name: z.string().optional(),
});

export const callbacksQuerySchema = z.object({
  projectId: z.string(),
  id: stringMetaQuerySchema.optional(),
  createdAt: numberMetaQuerySchema.optional(),
  updatedAt: numberMetaQuerySchema.optional(),
  createdBy: stringMetaQuerySchema.optional(),
  updatedBy: stringMetaQuerySchema.optional(),
  idempotencyKey: stringMetaQuerySchema.optional(),
  url: stringMetaQuerySchema.optional(),
  method: stringMetaQuerySchema.optional(),
  requestHeaders: objPartQueryListSchema.optional(),
  requestBody: objPartQueryListSchema.optional(),
  timeout: numberMetaQuerySchema.optional(),
  intervalFrom: numberMetaQuerySchema.optional(),
  intervalMs: numberMetaQuerySchema.optional(),
  lastExecutedAt: numberMetaQuerySchema.optional(),
  lastSuccessAt: numberMetaQuerySchema.optional(),
  lastErrorAt: numberMetaQuerySchema.optional(),
  name: stringMetaQuerySchema.optional(),
});

export const getCallbacksSchema = z.object({
  query: callbacksQuerySchema,
  page: z.number().optional(),
  limit: z.number().optional(),
  sort: objSortListSchema.optional(),
});

export const deleteCallbacksSchema = z.object({
  query: callbacksQuerySchema,
  deleteMany: z.boolean().optional(),
});

export const getCallbackExecutionsSchema = z.object({
  callbackId: z.string(),
  page: z.number().optional(),
  limit: z.number().optional(),
  sort: objSortListSchema.optional(),
});

export type AddCallbackEndpointArgs = z.infer<typeof addCallbackSchema>;
export type DeleteCallbacksEndpointArgs = z.infer<typeof deleteCallbacksSchema>;
export type GetCallbacksEndpointArgs = z.infer<typeof getCallbacksSchema>;
export type GetCallbackExecutionsEndpointArgs = z.infer<
  typeof getCallbackExecutionsSchema
>;

export interface IAddCallbackEndpointResponse {
  callback: ICallback;
}

export interface IGetCallbacksEndpointResponse {
  callbacks: ICallback[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IGetCallbackExecutionsEndpointResponse {
  executions: ICallbackExecution[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export const kCallbackFimidxHeaders = {
  callbackId: "x-fimidx-callback-id",
  lastExecutedAt: "x-fimidx-last-executed-at",
  lastSuccessAt: "x-fimidx-last-success-at",
  lastErrorAt: "x-fimidx-last-error-at",
} as const;

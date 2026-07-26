import type { ICallback } from "../../definitions/callback.js";
import type { IObj } from "../../definitions/obj.js";

/** Accepts full or projected lean objs; missing fields may be undefined. */
export function objToCallback<T extends Partial<ICallback> = ICallback>(
  obj: Partial<IObj>
): T {
  const record = obj.objRecord ?? {};
  return {
    id: obj.id,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    groupId: obj.groupId,
    projectId: obj.projectId,
    createdBy: obj.createdBy,
    createdByType: obj.createdByType,
    updatedBy: obj.updatedBy,
    updatedByType: obj.updatedByType,
    url: record.url,
    method: record.method,
    requestHeaders: record.requestHeaders,
    requestBody: record.requestBody,
    lastExecutedAt: record.lastExecutedAt,
    lastSuccessAt: record.lastSuccessAt,
    lastErrorAt: record.lastErrorAt,
    timeout: record.timeout,
    intervalFrom: record.intervalFrom,
    intervalMs: record.intervalMs,
    idempotencyKey: record.idempotencyKey,
    name: record.name,
    description: record.description,
  } as T;
}

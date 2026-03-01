import type { IObj } from "fimidx-core/definitions/obj";
import type { ICallback } from "../../definitions/callback.js";

export function objToCallback(obj: IObj): ICallback {
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
    url: obj.objRecord.url,
    method: obj.objRecord.method,
    requestHeaders: obj.objRecord.requestHeaders,
    requestBody: obj.objRecord.requestBody,
    lastExecutedAt: obj.objRecord.lastExecutedAt,
    lastSuccessAt: obj.objRecord.lastSuccessAt,
    lastErrorAt: obj.objRecord.lastErrorAt,
    timeout: obj.objRecord.timeout,
    intervalFrom: obj.objRecord.intervalFrom,
    intervalMs: obj.objRecord.intervalMs,
    idempotencyKey: obj.objRecord.idempotencyKey,
    name: obj.objRecord.name,
    description: obj.objRecord.description,
  };
}

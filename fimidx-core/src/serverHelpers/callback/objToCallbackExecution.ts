import type { ICallbackExecution } from "../../definitions/callback.js";
import type { IObj } from "../../definitions/obj.js";

export function objToCallbackExecution(obj: IObj): ICallbackExecution {
  // Fix Date serialization issue by ensuring executedAt is a Date object
  let executedAt = obj.objRecord.executedAt;
  if (executedAt && typeof executedAt === "string") {
    executedAt = new Date(executedAt);
  }

  return {
    id: obj.id,
    groupId: obj.groupId,
    projectId: obj.projectId,
    callbackId: obj.objRecord.callbackId,
    error: obj.objRecord.error,
    responseHeaders: obj.objRecord.responseHeaders,
    responseBodyRaw: obj.objRecord.responseBodyRaw,
    responseStatusCode: obj.objRecord.responseStatusCode,
    executedAt,
    responseBodyJson: obj.objRecord.responseBodyJson,
  };
}

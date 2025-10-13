import assert from "assert";
import { v7 as uuidv7 } from "uuid";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type {
  AddCallbackEndpointArgs,
  ICallbackObjRecord,
} from "../../definitions/callback.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { setManyObjs } from "../obj/setObjs.js";
import { objToCallback } from "./objToCallback.js";

export async function addCallback(params: {
  args: AddCallbackEndpointArgs;
  appId: string;
  groupId: string;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { args, appId, groupId, by, byType, storage } = params;
  const {
    url,
    method,
    requestHeaders,
    requestBody,
    timeout,
    intervalFrom,
    intervalMs,
    idempotencyKey: inputIdempotencyKey,
    name: inputName,
    description,
  } = args;

  const idempotencyKey =
    inputIdempotencyKey || `__fimidx_generated_${uuidv7()}_${Date.now()}`;
  const name = inputName || `__fimidx_generated_${uuidv7()}_${Date.now()}`;
  const objRecord: ICallbackObjRecord = {
    idempotencyKey,
    timeout: timeout ? new Date(timeout) : null,
    intervalFrom: intervalFrom ? new Date(intervalFrom) : null,
    intervalMs: intervalMs || null,
    lastErrorAt: null,
    lastExecutedAt: null,
    lastSuccessAt: null,
    method,
    requestBody: requestBody || null,
    requestHeaders: requestHeaders || null,
    url,
    name,
    description,
  };

  const { failedItems, newObjs, ignoredItems } = await setManyObjs({
    by,
    byType,
    groupId,
    tag: kObjTags.callback,
    input: {
      appId,
      items: [objRecord],
      conflictOnKeys: ["idempotencyKey"],
      onConflict: "ignore",
    },
    storage,
  });

  assert.ok(
    failedItems.length === 0,
    new OwnServerError(
      "Failed to add callback",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  // When onConflict is "ignore", we need to handle the case where the object already exists
  if (newObjs.length === 0 && ignoredItems.length === 1) {
    // The object already exists, we need to fetch it
    const existingCallback = await storage?.read({
      query: {
        appId,
        partQuery: {
          and: [{ field: "idempotencyKey", op: "eq", value: idempotencyKey }],
        },
      },
      tag: kObjTags.callback,
    });

    if (existingCallback && existingCallback.objs.length > 0) {
      return objToCallback(existingCallback.objs[0]);
    }
  }

  assert.ok(
    newObjs.length === 1,
    new OwnServerError(
      "Failed to add callback",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  const callback = newObjs[0];

  // Fix Date serialization issue by ensuring Date objects are properly converted
  if (
    callback.objRecord.timeout &&
    typeof callback.objRecord.timeout === "string"
  ) {
    callback.objRecord.timeout = new Date(callback.objRecord.timeout);
  }
  if (
    callback.objRecord.intervalFrom &&
    typeof callback.objRecord.intervalFrom === "string"
  ) {
    callback.objRecord.intervalFrom = new Date(callback.objRecord.intervalFrom);
  }

  return objToCallback(callback);
}

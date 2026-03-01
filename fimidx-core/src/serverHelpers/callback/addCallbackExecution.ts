import { tryParseJson } from "../../common/other.js";
import type { ICallbackExecutionObjRecord } from "../../definitions/callback.js";
import { kObjTags } from "../../definitions/obj.js";
import { kByTypes } from "../../definitions/other.js";
import type { IObjStorage } from "../../storage/types.js";
import { setManyObjs } from "../obj/setObjs.js";

export async function addCallbackExecution(params: {
  projectId: string;
  groupId: string;
  callbackId: string;
  error: string | null;
  responseHeaders: Record<string, string> | null;
  responseBody: string | null;
  responseStatusCode: number | null;
  executedAt: number | Date;
  clientTokenId: string;
  storage?: IObjStorage;
}) {
  const {
    projectId,
    groupId,
    callbackId,
    error,
    responseHeaders,
    responseBody,
    responseStatusCode,
    executedAt,
    clientTokenId,
    storage,
  } = params;

  const responseContentType =
    responseHeaders?.["content-type"]?.toLowerCase() ||
    responseHeaders?.["Content-Type"]?.toLowerCase();
  const isJsonResponse =
    responseContentType?.includes("application/json") ||
    responseContentType?.includes("text/json");

  const objRecord: ICallbackExecutionObjRecord = {
    callbackId,
    error,
    responseHeaders,
    responseBodyRaw: responseBody,
    responseBodyJson: isJsonResponse ? tryParseJson(responseBody) : null,
    responseStatusCode,
    executedAt,
  };

  await setManyObjs({
    by: clientTokenId,
    byType: kByTypes.clientToken,
    groupId,
    tag: kObjTags.callbackExecution,
    input: {
      projectId,
      items: [objRecord],
    },
    storage,
  });
}

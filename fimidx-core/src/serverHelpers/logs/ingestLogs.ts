import type { IngestLogsEndpointArgs } from "../../definitions/log.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { setManyObjs } from "../obj/setObjs.js";

export async function ingestLogs(params: {
  args: IngestLogsEndpointArgs;
  by: string;
  byType: string;
  groupId: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, groupId, storage } = params;
  const { projectId, logs } = args;

  const date = new Date();
  const dateMs = date.getTime();
  logs.forEach((log) => {
    log.timestamp = log.timestamp || dateMs;
  });

  const { failedItems, newObjs } = await setManyObjs({
    by,
    byType,
    groupId,
    tag: kObjTags.log,
    input: {
      projectId,
      items: logs,
    },
    storage,
  });

  return {
    logs: newObjs,
    failedCount: failedItems.length,
  };
}

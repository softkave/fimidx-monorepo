import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type { IMonitorRunObjRecord } from "../../definitions/monitorRun.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { setManyObjs } from "../obj/setObjs.js";
import { objToMonitorRun } from "./objToMonitorRun.js";

export async function addMonitorRun(params: {
  projectId: string;
  groupId: string;
  by: string;
  byType: string;
  record: IMonitorRunObjRecord;
  storage?: IObjStorage;
}) {
  const { projectId, groupId, by, byType, record, storage } = params;

  const { failedItems, newObjs } = await setManyObjs({
    by,
    byType,
    groupId,
    tag: kObjTags.monitorRun,
    input: {
      projectId,
      items: [record],
      onConflict: "fail",
    },
    storage,
  });

  assert.ok(
    failedItems.length === 0 && newObjs.length === 1,
    new OwnServerError(
      "Failed to add monitor run",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  return { monitorRun: objToMonitorRun(newObjs[0]) };
}

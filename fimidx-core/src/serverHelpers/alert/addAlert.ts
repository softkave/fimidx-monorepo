import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type { IAlertObjRecord } from "../../definitions/alert.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { setManyObjs } from "../obj/setObjs.js";
import { objToAlert } from "./objToAlert.js";

export async function addAlert(params: {
  projectId: string;
  groupId: string;
  by: string;
  byType: string;
  record: IAlertObjRecord;
  storage?: IObjStorage;
}) {
  const { projectId, groupId, by, byType, record, storage } = params;

  const { failedItems, newObjs } = await setManyObjs({
    by,
    byType,
    groupId,
    tag: kObjTags.alert,
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
      "Failed to add alert",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  return { alert: objToAlert(newObjs[0]) };
}

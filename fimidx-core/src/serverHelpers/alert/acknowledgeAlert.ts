import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { updateManyObjs } from "../obj/updateObjs.js";
import { getAlertById } from "./getAlertById.js";

export async function acknowledgeAlert(params: {
  alertId: string;
  acknowledged: boolean;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { alertId, acknowledged, by, byType, storage } = params;

  const existing = await getAlertById({ alertId, storage });
  assert.ok(
    existing,
    new OwnServerError("Alert not found", kOwnServerErrorCodes.NotFound)
  );

  const { getManyObjs } = await import("../obj/getObjs.js");
  const result = await getManyObjs({
    objQuery: { metaQuery: { id: { eq: alertId } } },
    tag: kObjTags.alert,
    limit: 1,
    storage,
  });

  assert.ok(
    result.objs.length === 1,
    new OwnServerError("Alert not found", kOwnServerErrorCodes.NotFound)
  );

  const existingRecord = result.objs[0].objRecord;
  const updateObj = {
    ...existingRecord,
    acknowledgedAt: acknowledged ? new Date() : null,
    acknowledgedBy: acknowledged ? by : null,
  };

  await updateManyObjs({
    objQuery: { metaQuery: { id: { eq: alertId } } },
    tag: kObjTags.alert,
    by,
    byType,
    update: updateObj,
    count: 1,
    storage,
  });

  const updated = await getAlertById({ alertId, storage });
  assert.ok(
    updated,
    new OwnServerError(
      "Failed to acknowledge alert",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  return { alert: updated };
}

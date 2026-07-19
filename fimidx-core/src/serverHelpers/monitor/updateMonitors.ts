import { getMsFromDuration } from "../../common/date.js";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type { UpdateMonitorsEndpointArgs } from "../../definitions/monitor.js";
import {
  kMonitorMinIntervalMs,
  normalizeMonitorReportsTo,
} from "../../definitions/monitor.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { updateManyObjs } from "../obj/updateObjs.js";
import { getMonitorsObjQuery } from "./getMonitors.js";
import { validateMonitorReportsTo } from "./validateMonitorReportsTo.js";

export async function updateMonitors(params: {
  args: UpdateMonitorsEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
  skipReportsToValidation?: boolean;
}) {
  const { args, by, byType, storage, skipReportsToValidation } = params;
  const { update } = args;

  const objQuery = getMonitorsObjQuery({ args });
  const { getManyObjs } = await import("../obj/getObjs.js");
  const result = await getManyObjs({
    objQuery,
    tag: kObjTags.monitor,
    limit: 1,
    storage,
  });
  if (!result.objs.length) return;
  const existingObj = result.objs[0];
  const existing = existingObj.objRecord;

  let updateObj: any = { ...update };

  if (update.interval !== undefined) {
    const intervalMs = getMsFromDuration(update.interval);
    if (intervalMs < kMonitorMinIntervalMs) {
      throw new OwnServerError(
        `Monitor interval must be at least ${kMonitorMinIntervalMs / 60000} minutes`,
        kOwnServerErrorCodes.BadRequest
      );
    }
  }

  if (updateObj.reportsTo !== undefined) {
    updateObj.reportsTo = normalizeMonitorReportsTo(updateObj.reportsTo);
    if (!skipReportsToValidation) {
      await validateMonitorReportsTo({
        groupId: existingObj.groupId,
        reportsTo: updateObj.reportsTo,
        storage,
      });
    }
  } else if (existing.reportsTo !== undefined) {
    updateObj.reportsTo = existing.reportsTo;
  }

  if (update.query !== undefined) {
    updateObj.query = update.query;
  } else if (existing.query !== undefined) {
    updateObj.query = existing.query;
  }

  updateObj = { ...existing, ...updateObj };

  await updateManyObjs({
    objQuery,
    tag: kObjTags.monitor,
    by,
    byType,
    update: updateObj,
    count: 1,
    storage,
  });
}

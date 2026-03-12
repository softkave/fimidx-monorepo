import type { UpdateMonitorsEndpointArgs } from "../../definitions/monitor.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { updateManyObjs } from "../obj/updateObjs.js";
import { getMonitorsObjQuery } from "./getMonitors.js";

export async function updateMonitors(params: {
  args: UpdateMonitorsEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, storage } = params;
  const { update } = args;

  // Fetch the monitor to update
  const objQuery = getMonitorsObjQuery({ args });
  const { getManyObjs } = await import("../obj/getObjs.js");
  const result = await getManyObjs({
    objQuery,
    tag: kObjTags.monitor,
    limit: 1,
    storage,
  });
  if (!result.objs.length) return;
  const existing = result.objs[0].objRecord;

  // Prepare the update object: merge all fields except query, which is replaced
  // if present
  let updateObj: any = { ...update };

  // Normalize reportsTo: always store as array of { userId: string }
  if (updateObj.reportsTo !== undefined) {
    if (Array.isArray(updateObj.reportsTo)) {
      updateObj.reportsTo = updateObj.reportsTo.map((r: any) =>
        typeof r === "string" ? { userId: r } : r
      );
    }
  } else if (existing.reportsTo !== undefined) {
    updateObj.reportsTo = existing.reportsTo;
  }

  if (update.query !== undefined) {
    updateObj.query = update.query;
  } else if (existing.query !== undefined) {
    updateObj.query = existing.query;
  }

  // Merge all other fields
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

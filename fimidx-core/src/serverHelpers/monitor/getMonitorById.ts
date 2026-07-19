import type { IMonitor } from "../../definitions/monitor.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import { objToMonitor } from "./objToMonitor.js";

export async function getMonitorById(params: {
  monitorId: string;
  storage?: IObjStorage;
}): Promise<IMonitor | null> {
  const { monitorId, storage } = params;
  const result = await getManyObjs({
    objQuery: {
      metaQuery: { id: { eq: monitorId } },
    },
    tag: kObjTags.monitor,
    limit: 1,
    storage,
  });

  if (!result.objs.length) {
    return null;
  }

  return objToMonitor<IMonitor>(result.objs[0]);
}

import type { IAlert } from "../../definitions/alert.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import { objToAlert } from "./objToAlert.js";

export async function getAlertById(params: {
  alertId: string;
  storage?: IObjStorage;
}): Promise<IAlert | null> {
  const { alertId, storage } = params;
  const byId = await getManyObjs({
    objQuery: {
      metaQuery: { id: { eq: alertId } },
    },
    tag: kObjTags.alert,
    limit: 1,
    storage,
  });

  if (!byId.objs.length) {
    return null;
  }

  return objToAlert(byId.objs[0]);
}

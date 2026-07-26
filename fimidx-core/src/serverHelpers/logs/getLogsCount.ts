import type { GetLogsEndpointArgs } from "../../definitions/log.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { countObjs } from "../obj/countObjs.js";
import { getLogsObjQuery } from "./getLogs.js";

export async function getLogsCount(params: {
  args: GetLogsEndpointArgs;
  storage?: IObjStorage;
}): Promise<{ count: number }> {
  const { args, storage } = params;
  const objQuery = getLogsObjQuery({ args });
  return countObjs({
    objQuery,
    tag: kObjTags.log,
    storage,
  });
}

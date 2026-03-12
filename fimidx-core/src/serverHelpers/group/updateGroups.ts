import type { UpdateGroupsEndpointArgs } from "../../definitions/group.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { splitMetaUpdate, updateManyObjs } from "../obj/updateObjs.js";
import { getGroupsObjQuery } from "./getGroups.js";

export async function updateGroups(params: {
  args: UpdateGroupsEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, storage } = params;
  const { update, updateMany, metaUpdateWay } = args;

  const objQuery = getGroupsObjQuery({ args });

  // Split meta update for granular handling - meta uses the specified or
  // default shallowMerge
  const updates = splitMetaUpdate(update, metaUpdateWay);
  await updateManyObjs({
    objQuery,
    tag: kObjTags.group,
    by,
    byType,
    updates,
    count: updateMany ? undefined : 1,
    updateWay: "shallowMerge",
    storage,
  });
}

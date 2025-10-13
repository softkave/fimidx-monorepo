import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type {
  AddGroupEndpointArgs,
  IGroupObjRecord,
} from "../../definitions/group.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { setManyObjs } from "../obj/setObjs.js";
import { objToGroup } from "./objToGroup.js";

export async function addGroup(params: {
  args: AddGroupEndpointArgs;
  by: string;
  byType: string;
  groupId: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, groupId, storage } = params;
  const { name, description, appId, meta } = args;
  const objRecord: IGroupObjRecord = {
    name,
    description,
    meta,
  };

  const { failedItems, newObjs } = await setManyObjs({
    by,
    byType,
    groupId,
    tag: kObjTags.group,
    input: {
      appId,
      items: [objRecord],
      conflictOnKeys: ["appId", "name"],
      onConflict: "fail",
    },
    storage,
  });

  assert.ok(
    failedItems.length === 0,
    new OwnServerError(
      "Failed to add group",
      kOwnServerErrorCodes.InternalServerError
    )
  );
  assert.ok(
    newObjs.length === 1,
    new OwnServerError(
      "Failed to add group",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  const group = objToGroup(newObjs[0]);

  return { group };
}

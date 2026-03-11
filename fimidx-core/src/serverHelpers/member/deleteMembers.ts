import { type DeleteMembersEndpointArgs } from "../../definitions/index.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { deleteManyObjs } from "../obj/deleteObjs.js";
import { getMembersObjQuery } from "./getMembers.js";

export async function deleteMembers(
  params: DeleteMembersEndpointArgs & {
    by: string;
    byType: string;
    storage?: IObjStorage;
  }
) {
  const { deleteMany, by, byType, storage, ...args } = params;
  const objQuery = getMembersObjQuery({ args });
  await deleteManyObjs({
    objQuery,
    tag: kObjTags.member,
    deletedBy: by,
    deletedByType: byType,
    deleteMany,
    storage,
    hardDelete: true,
  });
}

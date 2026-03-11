import { chunk } from "lodash-es";
import type { UpdateMembersEndpointArgs } from "../../definitions/member.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { updateManyObjs } from "../obj/updateObjs.js";
import { getMembers, getMembersObjQuery } from "./getMembers.js";
import { updateMemberPermissions } from "./updateMemberPermissions.js";

const CHUNK_SIZE = 50;

export async function updateMembers(params: {
  args: UpdateMembersEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, storage } = params;
  const { update, updateMany } = args;

  const {
    addPermissions,
    removePermissions,
    removeAllPermissions,
    ...restUpdate
  } = update;

  const objQuery = getMembersObjQuery({ args });
  await updateManyObjs({
    objQuery,
    tag: kObjTags.member,
    by,
    byType,
    update: restUpdate,
    count: updateMany ? undefined : 1,
    updateWay: "merge",
    storage,
  });

  const hasPermissionUpdates =
    addPermissions?.length || removePermissions?.length || removeAllPermissions;
  if (hasPermissionUpdates) {
    const { members } = await getMembers({
      args: { query: args.query, includePermissions: false },
      storage,
    });
    const chunks = chunk(members, CHUNK_SIZE);
    await Promise.all(
      chunks.map((memberChunk) =>
        Promise.all(
          memberChunk.map((member) =>
            updateMemberPermissions({
              args: {
                query: {
                  id: member.id,
                  groupId: member.groupId,
                  projectId: member.projectId,
                },
                update: {
                  addPermissions,
                  removePermissions,
                  removeAllPermissions,
                },
              },
              by,
              byType,
              storage,
            })
          )
        )
      )
    );
  }
}

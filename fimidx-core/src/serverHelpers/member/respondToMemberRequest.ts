import assert from "assert";
import { first } from "lodash-es";
import { OwnServerError } from "../../common/error.js";
import {
  kMemberStatus,
  type IMemberObjRecord,
  type RespondToMemberRequestEndpointArgs,
} from "../../definitions/member.js";
import { kObjTags } from "../../definitions/obj.js";
import { kId0 } from "../../definitions/system.js";
import type { IObjStorage } from "../../storage/types.js";
import { updateManyObjs } from "../obj/updateObjs.js";
import { getMembers } from "./getMembers.js";

export async function respondToMemberRequest(params: {
  args: RespondToMemberRequestEndpointArgs;
  storage?: IObjStorage;
}) {
  const { args, storage } = params;
  const { status, requestId, appId, groupId } = args;

  const { members } = await getMembers({
    args: {
      query: {
        appId,
        groupId,
        id: { eq: requestId },
      },
      limit: 1,
    },
    storage,
  });

  const member = first(members);
  assert.ok(member, new OwnServerError("Member request not found", 404));
  assert.ok(
    member.status === kMemberStatus.pending,
    new OwnServerError("Invalid status", 400)
  );

  const update: Partial<IMemberObjRecord> = {
    status,
    statusUpdatedAt: new Date(),
  };

  await updateManyObjs({
    objQuery: {
      appId,
      metaQuery: {
        id: { eq: requestId },
      },
    },
    tag: kObjTags.member,
    update,
    updateWay: "merge",
    by: kId0,
    byType: kId0,
    storage,
  });
}

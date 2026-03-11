import assert from "assert";
import { first } from "lodash-es";
import { OwnServerError } from "../../common/error.js";
import type { IFimidxMemberInternal } from "../../definitions/member.js";
import {
  kMemberStatus,
  type RespondToMemberRequestEndpointArgs,
} from "../../definitions/member.js";
import { kObjTags } from "../../definitions/obj.js";
import { kId0 } from "../../definitions/system.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import { updateManyObjs } from "../obj/updateObjs.js";

export async function respondToMemberRequest(params: {
  args: RespondToMemberRequestEndpointArgs;
  storage?: IObjStorage;
}) {
  const { args, storage } = params;
  const { status, query } = args;
  const { projectId, groupId, id } = query;

  const { objs } = await getManyObjs({
    objQuery: {
      metaQuery: {
        projectId: { eq: projectId },
        id: { eq: id },
        groupId: { eq: groupId },
      },
    },
    tag: kObjTags.member,
    limit: 1,
    storage,
  });

  const obj = first(objs);
  assert.ok(obj, new OwnServerError("Member request not found", 404));
  const record = obj.objRecord.meta as IFimidxMemberInternal | undefined;
  assert.ok(
    record?.status === kMemberStatus.pending,
    new OwnServerError("Invalid status", 400)
  );

  const update: Record<string, unknown> = {
    meta: { status, statusUpdatedAt: new Date() },
  };

  await updateManyObjs({
    objQuery: {
      metaQuery: {
        projectId: { eq: projectId },
        id: { eq: id },
        groupId: { eq: groupId },
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

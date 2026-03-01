import type { EmailRecordStatus } from "../../definitions/email.js";
import type { IMemberObjRecord } from "../../definitions/member.js";
import { kObjTags } from "../../definitions/obj.js";
import { kId0 } from "../../definitions/system.js";
import type { IObjStorage } from "../../storage/types.js";
import { updateManyObjs } from "../obj/updateObjs.js";

export async function updateMemberSendEmailStatus(params: {
  projectId: string;
  groupId: string;
  id: string;
  sentEmailCount: number;
  emailLastSentAt: Date;
  emailLastSentStatus: EmailRecordStatus;
  storage?: IObjStorage;
}) {
  const {
    projectId,
    groupId,
    id,
    sentEmailCount,
    emailLastSentAt,
    emailLastSentStatus,
    storage,
  } = params;
  const update: Partial<IMemberObjRecord> = {
    sentEmailCount,
    emailLastSentAt,
    emailLastSentStatus,
  };

  await updateManyObjs({
    objQuery: {
      projectId,
      partQuery: {
        and: [{ value: id, op: "eq", field: "memberId" }],
      },
      topLevelFields: { groupId: { eq: groupId } },
    },
    tag: kObjTags.member,
    update,
    updateWay: "merge",
    by: kId0,
    byType: kId0,
    storage,
  });
}

import type { EmailRecordStatus } from "../../definitions/email.js";
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
  const update: Record<string, unknown> = {
    sentEmailCount,
    emailLastSentAt,
    emailLastSentStatus,
  };

  await updateManyObjs({
    objQuery: {
      projectId,
      metaQuery: { id: { eq: id } },
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

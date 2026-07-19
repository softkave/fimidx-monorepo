import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import { kMemberStatus } from "../../definitions/member.js";
import {
  kMonitorReportToTypes,
  type IMonitorReportsTo,
} from "../../definitions/monitor.js";
import { kId0 } from "../../definitions/system.js";
import type { IObjStorage } from "../../storage/types.js";
import { getMembers } from "../member/getMembers.js";
import { getUsers } from "../user.js";

export async function validateMonitorReportsTo(params: {
  groupId: string;
  reportsTo: IMonitorReportsTo[];
  storage?: IObjStorage;
}) {
  const { groupId, reportsTo, storage } = params;

  const userIds = reportsTo
    .filter(
      (r): r is Extract<IMonitorReportsTo, { type: "user" }> =>
        r.type === kMonitorReportToTypes.user
    )
    .map((r) => r.userId);

  if (userIds.length === 0) {
    return;
  }

  const uniqueUserIds = [...new Set(userIds)];

  const users = await getUsers(uniqueUserIds);
  const foundUserIds = new Set(users.map((u) => u.id));
  const missingUsers = uniqueUserIds.filter((id) => !foundUserIds.has(id));

  assert.ok(
    missingUsers.length === 0,
    new OwnServerError(
      `Unknown userIds in reportsTo: ${missingUsers.join(", ")}`,
      kOwnServerErrorCodes.BadRequest
    )
  );

  const { members } = await getMembers({
    args: {
      query: {
        projectId: kId0,
        groupId,
        meta: [
          {
            op: "in",
            field: "userId",
            value: uniqueUserIds,
          },
          {
            op: "eq",
            field: "status",
            value: kMemberStatus.accepted,
          },
        ],
      },
      limit: Math.max(uniqueUserIds.length, 100),
    },
    storage,
  });

  const acceptedUserIds = new Set(
    members
      .map((m) => m.meta?.userId)
      .filter((id): id is string => typeof id === "string")
  );

  const nonMembers = uniqueUserIds.filter((id) => !acceptedUserIds.has(id));
  assert.ok(
    nonMembers.length === 0,
    new OwnServerError(
      `reportsTo userIds must be accepted org members: ${nonMembers.join(", ")}`,
      kOwnServerErrorCodes.BadRequest
    )
  );
}

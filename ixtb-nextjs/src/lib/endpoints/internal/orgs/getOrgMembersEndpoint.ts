import { getOrgSchema } from "@/src/definitions/org";
import { kMemberStatus } from "fimidx-core/definitions/member";
import { kFimidxPermissions, kId0 } from "fimidx-core/definitions/index";
import { getMembers, getUsers } from "fimidx-core/serverHelpers/index";
import { requirePermissionForUser } from "../../../serverHelpers/permissions";
import { NextUserAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetOrgInput } from "../../utils/sanitizeKId0";

export interface IOrgMemberOption {
  userId: string;
  name: string;
  email: string | null;
}

export interface GetOrgMembersEndpointResponse {
  members: IOrgMemberOption[];
}

export const getOrgMembersEndpoint: NextUserAuthenticatedEndpointFn<
  GetOrgMembersEndpointResponse
> = async (params) => {
  const {
    ctx,
    session: { userId },
  } = params;

  const pathParams = (await ctx.params) as { orgId: string };
  const input = getOrgSchema.parse({
    id: pathParams.orgId,
  });
  sanitizeGetOrgInput(input);

  await requirePermissionForUser({
    userId,
    orgId: input.id,
    action: kFimidxPermissions.group.read,
    target: input.id,
  });

  const { members } = await getMembers({
    args: {
      query: {
        projectId: kId0,
        groupId: input.id,
        meta: [
          {
            op: "eq",
            field: "status",
            value: kMemberStatus.accepted,
          },
        ],
      },
      limit: 500,
    },
  });

  const userIds = members
    .map((m) => m.meta?.userId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const users = userIds.length > 0 ? await getUsers(userIds) : [];
  const usersById = new Map(
    users.map((u: { id: string; name?: string; email?: string }) => [u.id, u])
  );

  const options: IOrgMemberOption[] = [];
  for (const member of members) {
    const memberUserId = member.meta?.userId;
    if (typeof memberUserId !== "string" || !memberUserId) continue;

    const user = usersById.get(memberUserId);
    const metaName =
      typeof member.meta?.name === "string" ? member.meta.name.trim() : "";
    const userName =
      typeof user?.name === "string" ? user.name.trim() : "";
    const email =
      typeof user?.email === "string" && user.email.trim()
        ? user.email.trim()
        : null;

    options.push({
      userId: memberUserId,
      name: metaName || userName || email || memberUserId,
      email,
    });
  }

  options.sort((a, b) => a.name.localeCompare(b.name));

  return { members: options };
};

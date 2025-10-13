import assert from "assert";
import { first, isArray } from "lodash-es";
import { OwnServerError } from "../common/error.js";
import type { IMember } from "../definitions/member.js";
import { kFimidxPermissions } from "../definitions/permission.js";
import { getMembers } from "./member/getMembers.js";

export async function hasPermission(params: {
  memberId: string;
  appId: string;
  groupId: string;
  member?: IMember;
  permission: string | string[];
  op?: "any" | "all";
}) {
  const {
    memberId,
    appId,
    groupId,
    member: inputMember,
    permission: inputPermission,
    op = "all",
  } = params;

  const member =
    inputMember ??
    first(
      (
        await getMembers({
          args: {
            query: {
              appId,
              groupId,
              memberId: { eq: memberId },
            },
            limit: 1,
            includePermissions: true,
          },
        })
      ).members
    );
  assert.ok(member, new OwnServerError("Member not found", 404));
  const { permissions } = member;

  if (!permissions) {
    return false;
  }

  const hasWildcard = permissions.some(
    (p) => p.action === kFimidxPermissions.wildcard
  );

  if (hasWildcard) {
    return true;
  }

  let permission: string[] = [];
  if (!isArray(inputPermission)) {
    permission = [inputPermission];
  }

  if (op === "any") {
    return permission.some((p) => permissions.some((p2) => p2.action === p));
  }

  return permission.every((p) => permissions.some((p2) => p2.action === p));
}

export async function checkPermission(params: {
  memberId: string;
  appId: string;
  groupId: string;
  member?: IMember;
  permission: string | string[];
  op?: "any" | "all";
}) {
  const memberHasPermission = await hasPermission(params);
  assert.ok(memberHasPermission, new OwnServerError("Access Denied", 403));
}

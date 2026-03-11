import type {
  AddClientTokenEndpointArgs,
  IClientToken,
  IClientTokenPermissionInput,
} from "fimidx-core/definitions/clientToken";
import { kMemberStatus } from "fimidx-core/definitions/member";
import { kByTypes } from "fimidx-core/definitions/other";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { kId0 } from "fimidx-core/definitions/system";
import {
  addClientToken,
  addGroup,
  addMember,
  addProject,
  encodeClientTokenJWT,
} from "fimidx-core/serverHelpers/index";

let testCounter = 0;

function uniqueId(prefix: string): string {
  testCounter += 1;
  return `${prefix}_${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export interface TestOrg {
  orgId: string;
  userId: string;
  projectId: string;
  name: string;
}

/**
 * Creates an org (group) and adds the given user as member with wildcard
 * permission. Uses kId0 as projectId for the group. Caller must have signed in
 * so userId matches session.
 */
export async function createTestOrg(params: {
  userId: string;
  userEmail: string;
  userName?: string;
}): Promise<TestOrg> {
  const { userId, userEmail, userName = "E2E Test User" } = params;
  const name = `Test Org ${uniqueId("org")}`;
  const { group } = await addGroup({
    args: {
      projectId: kId0,
      name,
      description: "E2E test org",
    },
    by: userId,
    byType: kByTypes.user,
    groupId: kId0,
  });

  await addMember({
    args: {
      projectId: kId0,
      groupId: group.id,
      meta: {
        userId,
        status: kMemberStatus.accepted,
        statusUpdatedAt: new Date().toISOString(),
        email: userEmail,
        name: userName,
      },
      permissions: [
        {
          action: kFimidxPermissions.wildcard,
          target: group.id,
        },
      ],
    },
    by: userId,
    byType: kByTypes.user,
  });

  return {
    orgId: group.id,
    userId,
    projectId: kId0,
    name: group.name,
  };
}

export interface TestProject {
  projectId: string;
  orgId: string;
  name: string;
}

/**
 * Creates a project under the given org. Caller must have permission (e.g.
 * wildcard) on that org.
 */
export async function createTestProject(params: {
  orgId: string;
  by: string;
  name?: string;
}): Promise<TestProject> {
  const { orgId, by, name = `Test Project ${uniqueId("proj")}` } = params;
  const { project } = await addProject({
    args: {
      orgId,
      name,
      description: "E2E test project",
    },
    by,
    byType: kByTypes.user,
  });
  return {
    projectId: project.id,
    orgId: project.orgId,
    name: project.name,
  };
}

export interface TestClientTokenResult {
  clientToken: IClientToken;
  bearerToken: string;
}

/**
 * Creates a client token and optionally adds permissions. Returns the token and
 * a JWT for Bearer auth.
 */
export async function createTestClientToken(params: {
  projectId: string;
  groupId: string;
  by: string;
  byType: string;
  permissions?: IClientTokenPermissionInput[];
}): Promise<TestClientTokenResult> {
  const { projectId, groupId, by, byType, permissions } = params;
  const name = `E2E Token ${uniqueId("tk")}`;
  const { clientToken } = await addClientToken({
    args: {
      projectId,
      groupId,
      name,
      description: "E2E test token",
      permissions: (permissions ??
        []) as AddClientTokenEndpointArgs["permissions"],
    },
    by,
    byType,
  });

  const { token } = await encodeClientTokenJWT({
    id: clientToken.id,
    groupId: clientToken.groupId,
    projectId: clientToken.projectId,
    args: {
      id: clientToken.id,
      projectId: clientToken.projectId,
      groupId: clientToken.groupId,
      refresh: false,
    },
  });

  return { clientToken, bearerToken: token };
}

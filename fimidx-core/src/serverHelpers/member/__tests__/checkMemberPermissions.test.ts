import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type {
  AddMemberEndpointArgs,
  CheckMemberPermissionsEndpointArgs,
} from "../../../definitions/member.js";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addMember } from "../addMember.js";
import { addMemberPermissions } from "../addMemberPermissions.js";
import { checkMemberPermissions } from "../checkMemberPermissions.js";

const defaultProjectId = "test-project-checkMemberPermissions";
const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";

// Test counter to ensure unique names
let testCounter = 0;

function makeAddMemberArgs(
  overrides: Partial<AddMemberEndpointArgs> = {}
): AddMemberEndpointArgs {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  return {
    groupId: defaultGroupId,
    projectId: defaultProjectId,
    permissions: [],
    meta: { userId: `member-${uniqueId}` },
    ...overrides,
  };
}

function makeAddMemberPermissionsArgs(
  overrides: Partial<Parameters<typeof addMemberPermissions>[0]> = {}
): Parameters<typeof addMemberPermissions>[0] {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  return {
    by: defaultBy,
    byType: defaultByType,
    groupId: defaultGroupId,
    projectId: defaultProjectId,
    permissions: [{ action: "read", target: "document" }],
    memberId: `member-${uniqueId}`,
    ...overrides,
  };
}

function makeCheckMemberPermissionsArgs(
  overrides: Partial<CheckMemberPermissionsEndpointArgs> = {}
): CheckMemberPermissionsEndpointArgs {
  const { query: queryOverrides, ...rest } = overrides;
  return {
    query: {
      projectId: queryOverrides?.projectId ?? defaultProjectId,
      groupId: queryOverrides?.groupId ?? defaultGroupId,
      id: queryOverrides?.id ?? "test-member-id",
    },
    items: [{ action: "read", target: "document" }],
    ...rest,
  } as CheckMemberPermissionsEndpointArgs;
}

describe("checkMemberPermissions integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    try {
      const testProjectIds = [
        defaultProjectId,
        "test-project-checkMemberPermissions-1",
        "test-project-checkMemberPermissions-2",
      ];
      for (const projectId of testProjectIds) {
        await storage.bulkDelete({
          query: { metaQuery: { projectId: { eq: projectId } } },
          tag: kObjTags.member,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true,
        });
        await storage.bulkDelete({
          query: { metaQuery: { projectId: { eq: projectId } } },
          tag: kObjTags.permission,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true,
        });
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  afterEach(async () => {
    try {
      const testProjectIds = [
        defaultProjectId,
        "test-project-checkMemberPermissions-1",
        "test-project-checkMemberPermissions-2",
      ];
      for (const projectId of testProjectIds) {
        await storage.bulkDelete({
          query: { metaQuery: { projectId: { eq: projectId } } },
          tag: kObjTags.member,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true,
        });
        await storage.bulkDelete({
          query: { metaQuery: { projectId: { eq: projectId } } },
          tag: kObjTags.permission,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true,
        });
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  it("returns true for permissions that exist", async () => {
    // First create a member
    const memberArgs = makeAddMemberArgs();
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Add permissions to the member
    const permissionsArgs = makeAddMemberPermissionsArgs({
      memberId: member.member.id,
      permissions: [
        { action: "read", target: "document" },
        { action: "write", target: "settings" },
      ],
    });

    await addMemberPermissions(permissionsArgs);

    // Check if the member has the permissions
    const checkArgs: CheckMemberPermissionsEndpointArgs = makeCheckMemberPermissionsArgs({
      query: { projectId: defaultProjectId, groupId: defaultGroupId, id: member.member.id },
      items: [
        { action: "read", target: "document" },
        { action: "write", target: "settings" },
      ],
    });

    const result = await checkMemberPermissions({
      args: checkArgs,
      storage,
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].isPermitted).toBe(true);
    expect(result.results[1].isPermitted).toBe(true);
  });

  it("returns false for permissions that don't exist", async () => {
    // First create a member
    const memberArgs = makeAddMemberArgs();
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Add some permissions to the member
    const permissionsArgs = makeAddMemberPermissionsArgs({
      memberId: member.member.id,
      permissions: [{ action: "read", target: "document" }],
    });

    await addMemberPermissions(permissionsArgs);

    // Check for permissions that don't exist
    const checkArgs: CheckMemberPermissionsEndpointArgs = makeCheckMemberPermissionsArgs({
      query: { projectId: defaultProjectId, groupId: defaultGroupId, id: member.member.id },
      items: [
        { action: "write", target: "document" },
        { action: "delete", target: "settings" },
      ],
    });

    const result = await checkMemberPermissions({
      args: checkArgs,
      storage,
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].isPermitted).toBe(false);
    expect(result.results[1].isPermitted).toBe(false);
  });

  it("handles mixed permissions (some exist, some don't)", async () => {
    // First create a member
    const memberArgs = makeAddMemberArgs();
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Add some permissions to the member
    const permissionsArgs = makeAddMemberPermissionsArgs({
      memberId: member.member.id,
      permissions: [
        { action: "read", target: "document" },
        { action: "write", target: "settings" },
      ],
    });

    await addMemberPermissions(permissionsArgs);

    // Check for mixed permissions
    const checkArgs: CheckMemberPermissionsEndpointArgs = makeCheckMemberPermissionsArgs({
      query: { projectId: defaultProjectId, groupId: defaultGroupId, id: member.member.id },
      items: [
        { action: "read", target: "document" },
        { action: "write", target: "document" },
        { action: "write", target: "settings" },
        { action: "delete", target: "settings" },
      ],
    });

    const result = await checkMemberPermissions({
      args: checkArgs,
      storage,
    });

    expect(result.results).toHaveLength(4);
    expect(result.results[0].isPermitted).toBe(true); // user:read:document
    expect(result.results[1].isPermitted).toBe(false); // user:write:document
    expect(result.results[2].isPermitted).toBe(true); // admin:write:settings
    expect(result.results[3].isPermitted).toBe(false); // admin:delete:settings
  });

  it("handles empty items array", async () => {
    const checkArgs = makeCheckMemberPermissionsArgs({
      items: [],
    });

    const result = await checkMemberPermissions({
      args: checkArgs,
      storage,
    });

    expect(result.results).toHaveLength(0);
  });

  it("handles object-based permission entities, actions, and targets", async () => {
    // First create a member
    const memberArgs = makeAddMemberArgs();
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Add permissions with object-based entities, actions, and targets
    const permissionsArgs = makeAddMemberPermissionsArgs({
      memberId: member.member.id,
      permissions: [
        {
          action: { operation: "read", scope: "full" },
          target: { resource: "document", id: "doc-1" },
        },
      ],
    });

    await addMemberPermissions(permissionsArgs);

    // Check for the same object-based permission and one that does not exist
    const checkArgs: CheckMemberPermissionsEndpointArgs = makeCheckMemberPermissionsArgs({
      query: { projectId: defaultProjectId, groupId: defaultGroupId, id: member.member.id },
      items: [
        {
          action: { operation: "read", scope: "full" },
          target: { resource: "document", id: "doc-1" },
        },
        {
          action: { operation: "write", scope: "full" },
          target: { resource: "document", id: "doc-1" },
        },
      ],
    });

    const result = await checkMemberPermissions({
      args: checkArgs,
      storage,
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].isPermitted).toBe(true);
    expect(result.results[1].isPermitted).toBe(false);
  });

  it("handles different group IDs correctly", async () => {
    // First create a member
    const memberArgs = makeAddMemberArgs();
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Add permissions to the member in the default group
    const permissionsArgs = makeAddMemberPermissionsArgs({
      memberId: member.member.id,
      permissions: [{ action: "read", target: "document" }],
    });

    await addMemberPermissions(permissionsArgs);

    // Check for permissions in a different group
    const checkArgs: CheckMemberPermissionsEndpointArgs = makeCheckMemberPermissionsArgs({
      query: { projectId: defaultProjectId, groupId: "different-group", id: member.member.id },
      items: [{ action: "read", target: "document" }],
    });

    const result = await checkMemberPermissions({
      args: checkArgs,
      storage,
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].isPermitted).toBe(false);
  });
});

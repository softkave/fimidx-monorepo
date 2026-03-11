import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AddMemberEndpointArgs } from "../../../definitions/member.js";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addMember } from "../addMember.js";
import { addMemberPermissions } from "../addMemberPermissions.js";

const defaultProjectId = "test-project-addMemberPermissions";
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
    projectId: defaultProjectId,
    groupId: defaultGroupId,
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

describe("addMemberPermissions integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    try {
      const testProjectIds = [
        defaultProjectId,
        "test-project-addMemberPermissions-1",
        "test-project-addMemberPermissions-2",
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
        "test-project-addMemberPermissions-1",
        "test-project-addMemberPermissions-2",
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

  it("adds permissions to a member successfully", async () => {
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

    const result = await addMemberPermissions(permissionsArgs);

    expect(result.permissions).toBeDefined();
    expect(result.permissions).toHaveLength(2);

    // Verify the permissions are properly managed with member-specific metadata
    const permission1 = result.permissions[0];
    const permission2 = result.permissions[1];

    // Entity is stored as member id; action and target as-is
    expect(permission1.entity).toBe(member.member.id);
    expect(permission1.action).toBe("read");
    expect(permission1.target).toBe("document");

    expect(permission2.entity).toBe(member.member.id);
    expect(permission2.action).toBe("write");
    expect(permission2.target).toBe("settings");
  });

  it("adds permissions with complex entity, action, and target objects", async () => {
    const memberArgs = makeAddMemberArgs();
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const permissionsArgs = makeAddMemberPermissionsArgs({
      memberId: member.member.id,
      permissions: [
        {
          action: { operation: "read", scope: "document" },
          target: { resource: "document", id: "456" },
        },
      ],
    });

    const result = await addMemberPermissions(permissionsArgs);

    expect(result.permissions).toBeDefined();
    expect(result.permissions).toHaveLength(1);

    const permission = result.permissions[0];
    // Entity is stored as member id; object action/target keep memberId key
    expect(permission.entity).toBe(member.member.id);
    expect(permission.action).toEqual({ operation: "read", scope: "document" });
    expect(permission.target).toEqual({ resource: "document", id: "456" });
  });

  it("adds empty permissions array", async () => {
    const memberArgs = makeAddMemberArgs();
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const permissionsArgs = makeAddMemberPermissionsArgs({
      memberId: member.member.id,
      permissions: [],
    });

    const result = await addMemberPermissions(permissionsArgs);

    expect(result.permissions).toBeDefined();
    expect(result.permissions).toHaveLength(0);
  });

  it("adds permissions with different member IDs", async () => {
    // Create two members
    const member1Args = makeAddMemberArgs({ meta: { userId: "member-1" } });
    const member2Args = makeAddMemberArgs({ meta: { userId: "member-2" } });

    const member1 = await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const member2 = await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Add permissions to both members
    const permissions1Args = makeAddMemberPermissionsArgs({
      memberId: member1.member.id,
      permissions: [{ action: "read", target: "document" }],
    });

    const permissions2Args = makeAddMemberPermissionsArgs({
      memberId: member2.member.id,
      permissions: [{ action: "write", target: "settings" }],
    });

    const result1 = await addMemberPermissions(permissions1Args);
    const result2 = await addMemberPermissions(permissions2Args);

    expect(result1.permissions).toHaveLength(1);
    expect(result2.permissions).toHaveLength(1);
  });

  it("adds permissions with different group IDs", async () => {
    const memberArgs = makeAddMemberArgs();
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const permissionsArgs = makeAddMemberPermissionsArgs({
      memberId: member.member.id,
      groupId: "different-group",
      permissions: [{ action: "read", target: "document" }],
    });

    const result = await addMemberPermissions(permissionsArgs);

    expect(result.permissions).toHaveLength(1);
  });

  it("adds permissions with different project IDs", async () => {
    const memberArgs = makeAddMemberArgs();
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const permissionsArgs = makeAddMemberPermissionsArgs({
      memberId: member.member.id,
      projectId: "different-project",
      permissions: [{ action: "read", target: "document" }],
    });

    const result = await addMemberPermissions(permissionsArgs);

    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].projectId).toBe("different-project");
  });

  it("adds permissions with different by/byType values", async () => {
    const memberArgs = makeAddMemberArgs();
    const member = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const permissionsArgs = makeAddMemberPermissionsArgs({
      memberId: member.member.id,
      by: "different-user",
      byType: "admin",
      permissions: [{ action: "read", target: "document" }],
    });

    const result = await addMemberPermissions(permissionsArgs);

    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].createdBy).toBe("different-user");
    expect(result.permissions[0].createdByType).toBe("admin");
  });
});

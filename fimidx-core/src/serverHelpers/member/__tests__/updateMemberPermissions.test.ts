import { first } from "lodash-es";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { addMember } from "../addMember.js";
import { getMembers } from "../getMembers.js";
import { updateMemberPermissions } from "../updateMemberPermissions.js";
import { createTestSetup, makeTestData } from "./testUtils.js";

describe("updateMemberPermissions integration", () => {
  const { storage, cleanup, testData } = createTestSetup({
    testName: "updateMemberPermissions",
  });

  const { projectId, groupId, by, byType } = testData;

  function makeAddMemberArgs(overrides: any = {}) {
    const testData = makeTestData({ testName: "member" });
    return {
      projectId,
      groupId,
      permissions: [],
      meta: { name: testData.name, userId: testData.memberId },
      ...overrides,
    };
  }

  function makeUpdateMemberPermissionsArgs(overrides: any = {}) {
    return {
      query: {
        id: "test-member-id",
        groupId,
        projectId,
        ...overrides.query,
      },
      update: {
        addPermissions: [
          { action: "read", target: "document" },
        ],
        ...overrides.update,
      },
      ...overrides,
    };
  }

  beforeAll(async () => {
    // Storage is already created by createTestSetup
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(async () => {
    // Clean up before each test
    await cleanup();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanup();
  });

  it("updates member permissions successfully", async () => {
    // Create a member
    const memberArgs = makeAddMemberArgs({ meta: { userId: "test-member" } });
    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeUpdateMemberPermissionsArgs({
      query: {
        id: member.member.id,
      },
      update: {
        addPermissions: [
          { action: "read", target: "document" },
          { action: "write", target: "settings" },
        ],
      },
    });

    await updateMemberPermissions({
      args,
      by: by,
      byType: byType,
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: { projectId, groupId, id: { eq: member.member.id } },
        includePermissions: true,
      },
      storage,
    });
    const updated = first(members);
    expect(updated).toBeDefined();
    expect(updated!.permissions).toBeDefined();
    expect(updated!.permissions).toHaveLength(2);

    // Verify the permissions are properly managed
    const permission1 = updated!.permissions![0];
    const permission2 = updated!.permissions![1];

    expect(permission1.entity).toBe(member.member.id);
    expect(permission1.action).toBe("read");
    expect(permission1.target).toBe("document");

    expect(permission2.entity).toBe(member.member.id);
    expect(permission2.action).toBe("write");
    expect(permission2.target).toBe("settings");
  });

  it("updates member permissions with complex entity, action, and target objects", async () => {
    // Create a member
    const memberArgs = makeAddMemberArgs({ meta: { userId: "test-member" } });
    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeUpdateMemberPermissionsArgs({
      query: {
        id: member.member.id,
      },
      update: {
        addPermissions: [
          {
            action: { operation: "read", scope: "document" },
            target: { resource: "document", id: "456" },
          },
        ],
      },
    });

    await updateMemberPermissions({
      args,
      by: by,
      byType: byType,
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: { projectId, groupId, id: { eq: member.member.id } },
        includePermissions: true,
      },
      storage,
    });
    const updated = first(members);
    expect(updated).toBeDefined();
    expect(updated!.permissions).toBeDefined();
    expect(updated!.permissions).toHaveLength(1);

    const permission = updated!.permissions![0];
    expect(permission.entity).toBe(member.member.id);
    expect(permission.action).toEqual({ operation: "read", scope: "document" });
    expect(permission.target).toEqual({ resource: "document", id: "456" });
  });

  it("updates member permissions with removeAllPermissions", async () => {
    // Create a member
    const memberArgs = makeAddMemberArgs({ meta: { userId: "test-member" } });
    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeUpdateMemberPermissionsArgs({
      query: {
        id: member.member.id,
      },
      update: {
        removeAllPermissions: true,
      },
    });

    await updateMemberPermissions({
      args,
      by: by,
      byType: byType,
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: { projectId, groupId, id: { eq: member.member.id } },
        includePermissions: true,
      },
      storage,
    });
    const updated = first(members);
    expect(updated).toBeDefined();
    expect(updated!.permissions).toBeDefined();
    expect(updated!.permissions).toHaveLength(0);
  });

  it("throws error when member not found", async () => {
    const args = makeUpdateMemberPermissionsArgs({
      query: {
        id: "non-existent-member",
      },
    });

    await expect(
      updateMemberPermissions({
        args,
        by: by,
        byType: byType,
        storage,
      })
    ).rejects.toThrow("Member not found");
  });

  it("handles different project IDs", async () => {
    // Create a member in a different project
    const memberArgs = makeAddMemberArgs({
      projectId: "different-project",
      meta: { userId: "test-member-updateMemberPermissions" },
    });
    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeUpdateMemberPermissionsArgs({
      query: {
        id: member.member.id,
        projectId: "different-project",
      },
      update: {
        addPermissions: [
          { action: "read", target: "document" },
        ],
      },
    });

    await updateMemberPermissions({
      args,
      by: by,
      byType: byType,
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: {
          projectId: "different-project",
          groupId: member.member.groupId,
          id: { eq: member.member.id },
        },
        includePermissions: true,
      },
      storage,
    });
    const updated = first(members);
    expect(updated).toBeDefined();
    expect(updated!.projectId).toBe("different-project");
    expect(updated!.permissions).toHaveLength(1);
  });

  it("handles different group IDs", async () => {
    // Create a member in a different group
    const memberArgs = makeAddMemberArgs({
      groupId: "different-group",
      meta: { userId: "test-member" },
    });
    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeUpdateMemberPermissionsArgs({
      query: {
        id: member.member.id,
        groupId: "different-group",
      },
      update: {
        addPermissions: [
          { action: "read", target: "document" },
        ],
      },
    });

    await updateMemberPermissions({
      args,
      by: by,
      byType: byType,
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: {
          projectId,
          groupId: "different-group",
          id: { eq: member.member.id },
        },
        includePermissions: true,
      },
      storage,
    });
    const updated = first(members);
    expect(updated).toBeDefined();
    expect(updated!.groupId).toBe("different-group");
    expect(updated!.permissions).toHaveLength(1);
  });

  it("handles different by/byType values", async () => {
    // Create a member
    const memberArgs = makeAddMemberArgs({ meta: { userId: "test-member" } });
    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeUpdateMemberPermissionsArgs({
      query: {
        id: member.member.id,
      },
      update: {
        addPermissions: [
          { action: "read", target: "document" },
        ],
      },
    });

    await updateMemberPermissions({
      args,
      by: "different-user",
      byType: "admin",
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: { projectId, groupId, id: { eq: member.member.id } },
        includePermissions: true,
      },
      storage,
    });
    const updated = first(members);
    expect(updated).toBeDefined();
    expect(updated!.permissions).toHaveLength(1);
  });

  it("updates permissions for multiple members with different member IDs", async () => {
    // Create two members
    const member1Args = makeAddMemberArgs({ meta: { userId: "member-1" } });
    const member2Args = makeAddMemberArgs({ meta: { userId: "member-2" } });

    const member1 = await addMember({
      args: member1Args,
      by: by,
      byType: byType,
      storage,
    });

    const member2 = await addMember({
      args: member2Args,
      by: by,
      byType: byType,
      storage,
    });

    // Update permissions for member 1
    const args1 = makeUpdateMemberPermissionsArgs({
      query: {
        id: member1.member.id,
      },
      update: {
        addPermissions: [
          { action: "read", target: "document" },
        ],
      },
    });

    await updateMemberPermissions({
      args: args1,
      by: by,
      byType: byType,
      storage,
    });

    // Update permissions for member 2
    const args2 = makeUpdateMemberPermissionsArgs({
      query: {
        id: member2.member.id,
      },
      update: {
        addPermissions: [
          { action: "write", target: "settings" },
        ],
      },
    });

    await updateMemberPermissions({
      args: args2,
      by: by,
      byType: byType,
      storage,
    });

    const { members: members1 } = await getMembers({
      args: {
        query: { projectId, groupId, id: { eq: member1.member.id } },
        includePermissions: true,
      },
      storage,
    });
    const { members: members2 } = await getMembers({
      args: {
        query: { projectId, groupId, id: { eq: member2.member.id } },
        includePermissions: true,
      },
      storage,
    });
    expect(members1[0].permissions).toHaveLength(1);
    expect(members1[0].permissions![0].entity).toBe(member1.member.id);

    expect(members2[0].permissions).toHaveLength(1);
    expect(members2[0].permissions![0].entity).toBe(member2.member.id);
  });

  it("preserves member properties after permission update", async () => {
    // Create a member with specific properties
    const memberArgs = makeAddMemberArgs({
      meta: {
        name: "Test Member",
        email: "test@example.com",
        department: "engineering",
      },
    });
    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeUpdateMemberPermissionsArgs({
      query: {
        id: member.member.id,
      },
      update: {
        addPermissions: [
          { action: "read", target: "document" },
        ],
      },
    });

    await updateMemberPermissions({
      args,
      by: by,
      byType: byType,
      storage,
    });

    const { members } = await getMembers({
      args: {
        query: { projectId, groupId, id: { eq: member.member.id } },
        includePermissions: true,
      },
      storage,
    });
    const updated = first(members);
    expect(updated).toBeDefined();
    expect(updated!.meta?.name).toBe("Test Member");
    expect(updated!.meta?.email).toBe("test@example.com");
    expect(updated!.meta?.department).toBe("engineering");
    expect(updated!.permissions).toHaveLength(1);
  });
});

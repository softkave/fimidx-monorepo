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
      name: testData.name,
      description: "Test description",
      projectId,
      groupId,
      email: testData.email,
      memberId: testData.memberId,
      permissions: [],
      ...overrides,
    };
  }

  function makeUpdateMemberPermissionsArgs(overrides: any = {}) {
    return {
      query: {
        memberId: "test-member-id",
        groupId,
        projectId,
        ...overrides.query,
      },
      update: {
        permissions: [
          {
            entity: "user",
            action: "read",
            target: "document",
          },
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
    const memberArgs = makeAddMemberArgs({ memberId: "test-member" });
    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeUpdateMemberPermissionsArgs({
      query: {
        memberId: member.member.memberId,
      },
      update: {
        permissions: [
          {
            entity: "user",
            action: "read",
            target: "document",
          },
          {
            entity: "admin",
            action: "write",
            target: "settings",
          },
        ],
      },
    });

    const result = await updateMemberPermissions({
      args,
      by: by,
      byType: byType,
      storage,
    });

    expect(result.member).toBeDefined();
    expect(result.member.permissions).toBeDefined();
    expect(result.member.permissions).toHaveLength(2);

    // Verify the permissions are properly managed
    const permission1 = result.member.permissions![0];
    const permission2 = result.member.permissions![1];

    expect(permission1.entity).toBe("user");
    expect(permission1.action).toBe("read");
    expect(permission1.target).toBe("document");

    expect(permission2.entity).toBe("admin");
    expect(permission2.action).toBe("write");
    expect(permission2.target).toBe("settings");
  });

  it("updates member permissions with complex entity, action, and target objects", async () => {
    // Create a member
    const memberArgs = makeAddMemberArgs({ memberId: "test-member" });
    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeUpdateMemberPermissionsArgs({
      query: {
        memberId: member.member.memberId,
      },
      update: {
        permissions: [
          {
            entity: { type: "user", id: "123" },
            action: { operation: "read", scope: "document" },
            target: { resource: "document", id: "456" },
          },
        ],
      },
    });

    const result = await updateMemberPermissions({
      args,
      by: by,
      byType: byType,
      storage,
    });

    expect(result.member).toBeDefined();
    expect(result.member.permissions).toBeDefined();
    expect(result.member.permissions).toHaveLength(1);

    const permission = result.member.permissions![0];
    expect(permission.entity).toEqual({ type: "user", id: "123" });
    expect(permission.action).toEqual({ operation: "read", scope: "document" });
    expect(permission.target).toEqual({ resource: "document", id: "456" });
  });

  it("updates member permissions with empty permissions array", async () => {
    // Create a member
    const memberArgs = makeAddMemberArgs({ memberId: "test-member" });
    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeUpdateMemberPermissionsArgs({
      query: {
        memberId: member.member.memberId,
      },
      update: {
        permissions: [],
      },
    });

    const result = await updateMemberPermissions({
      args,
      by: by,
      byType: byType,
      storage,
    });

    expect(result.member).toBeDefined();
    expect(result.member.permissions).toBeDefined();
    expect(result.member.permissions).toHaveLength(0);
  });

  it("throws error when member not found", async () => {
    const args = makeUpdateMemberPermissionsArgs({
      query: {
        memberId: "non-existent-member",
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
      memberId: "test-member-updateMemberPermissions",
      projectId: "different-project",
    });
    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeUpdateMemberPermissionsArgs({
      query: {
        memberId: member.member.memberId,
        projectId: "different-project",
      },
      update: {
        permissions: [
          {
            entity: "user",
            action: "read",
            target: "document",
          },
        ],
      },
    });

    const result = await updateMemberPermissions({
      args,
      by: by,
      byType: byType,
      storage,
    });

    expect(result.member).toBeDefined();
    expect(result.member.projectId).toBe("different-project");
    expect(result.member.permissions).toHaveLength(1);
  });

  it("handles different group IDs", async () => {
    // Create a member in a different group
    const memberArgs = makeAddMemberArgs({
      memberId: "test-member",
      groupId: "different-group",
    });
    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeUpdateMemberPermissionsArgs({
      query: {
        memberId: member.member.memberId,
        groupId: "different-group",
      },
      update: {
        permissions: [
          {
            entity: "user",
            action: "read",
            target: "document",
          },
        ],
      },
    });

    const result = await updateMemberPermissions({
      args,
      by: by,
      byType: byType,
      storage,
    });

    expect(result.member).toBeDefined();
    expect(result.member.groupId).toBe("different-group");
    expect(result.member.permissions).toHaveLength(1);
  });

  it("handles different by/byType values", async () => {
    // Create a member
    const memberArgs = makeAddMemberArgs({ memberId: "test-member" });
    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeUpdateMemberPermissionsArgs({
      query: {
        memberId: member.member.memberId,
      },
      update: {
        permissions: [
          {
            entity: "user",
            action: "read",
            target: "document",
          },
        ],
      },
    });

    const result = await updateMemberPermissions({
      args,
      by: "different-user",
      byType: "admin",
      storage,
    });

    expect(result.member).toBeDefined();
    expect(result.member.permissions).toHaveLength(1);
  });

  it("updates permissions for multiple members with different member IDs", async () => {
    // Create two members
    const member1Args = makeAddMemberArgs({ memberId: "member-1" });
    const member2Args = makeAddMemberArgs({ memberId: "member-2" });

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
        memberId: member1.member.memberId,
      },
      update: {
        permissions: [
          {
            entity: "user",
            action: "read",
            target: "document",
          },
        ],
      },
    });

    const result1 = await updateMemberPermissions({
      args: args1,
      by: by,
      byType: byType,
      storage,
    });

    // Update permissions for member 2
    const args2 = makeUpdateMemberPermissionsArgs({
      query: {
        memberId: member2.member.memberId,
      },
      update: {
        permissions: [
          {
            entity: "admin",
            action: "write",
            target: "settings",
          },
        ],
      },
    });

    const result2 = await updateMemberPermissions({
      args: args2,
      by: by,
      byType: byType,
      storage,
    });

    expect(result1.member.permissions).toHaveLength(1);
    expect(result1.member.permissions![0].entity).toBe("user");

    expect(result2.member.permissions).toHaveLength(1);
    expect(result2.member.permissions![0].entity).toBe("admin");
  });

  it("preserves member properties after permission update", async () => {
    // Create a member with specific properties
    const memberArgs = makeAddMemberArgs({
      memberId: "test-member",
      name: "Test Member",
      email: "test@example.com",
      description: "Test description",
      meta: { department: "engineering" },
    });
    const member = await addMember({
      args: memberArgs,
      by: by,
      byType: byType,
      storage,
    });

    const args = makeUpdateMemberPermissionsArgs({
      query: {
        memberId: member.member.memberId,
      },
      update: {
        permissions: [
          {
            entity: "user",
            action: "read",
            target: "document",
          },
        ],
      },
    });

    const result = await updateMemberPermissions({
      args,
      by: by,
      byType: byType,
      storage,
    });

    expect(result.member).toBeDefined();
    expect(result.member.name).toBe("Test Member");
    expect(result.member.email).toBe("test@example.com");
    expect(result.member.description).toBe("Test description");
    expect(result.member.meta).toEqual({ department: "engineering" });
    expect(result.member.permissions).toHaveLength(1);
  });
});

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  kMemberStatus,
  type AddMemberEndpointArgs,
  type IMemberObjRecord,
} from "../../../definitions/member.js";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addMember } from "../addMember.js";
import { deleteMembers } from "../deleteMembers.js";
import { getMembers } from "../getMembers.js";

const defaultProjectId = "test-project-deleteMembers";
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
    name: `Test Member ${uniqueId}`,
    description: "Test description",
    projectId: defaultProjectId,
    groupId: defaultGroupId,
    email: `test${uniqueId}@example.com`,
    memberId: `member-${uniqueId}`,
    permissions: [],
    ...overrides,
  };
}

describe("deleteMembers integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    // Test will use the default storage type from createDefaultStorage()
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    // Clean up test data before each test using hard deletes for complete isolation
    try {
      // Delete all members for all test projects using hard deletes
      const testProjectIds = [
        defaultProjectId,
        "test-project-deleteMembers-1",
        "test-project-deleteMembers-2",
      ];
      for (const projectId of testProjectIds) {
        await storage.bulkDelete({
          query: { projectId },
          tag: kObjTags.member,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true, // Use hard delete for test cleanup
        });
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  afterEach(async () => {
    // Clean up after each test using hard deletes for complete isolation
    try {
      // Delete all members for all test projects using hard deletes
      const testProjectIds = [
        defaultProjectId,
        "test-project-deleteMembers-1",
        "test-project-deleteMembers-2",
      ];
      for (const projectId of testProjectIds) {
        await storage.bulkDelete({
          query: { projectId },
          tag: kObjTags.member,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true, // Use hard delete for test cleanup
        });
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  it("deletes a single member by memberId", async () => {
    // Create a test member
    const memberArgs = makeAddMemberArgs();
    await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify member exists
    let result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          memberId: { eq: memberArgs.memberId },
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(1);

    // Delete the member
    await deleteMembers({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        memberId: { eq: memberArgs.memberId },
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify member is deleted
    result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          memberId: { eq: memberArgs.memberId },
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(0);
  });

  it("deletes a single member by name", async () => {
    // Create a test member
    const memberArgs = makeAddMemberArgs({ name: "Member to Delete" });
    await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify member exists
    let result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          name: { eq: "Member to Delete" },
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(1);

    // Delete the member
    await deleteMembers({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        name: { eq: "Member to Delete" },
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify member is deleted
    result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          name: { eq: "Member to Delete" },
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(0);
  });

  it("deletes a single member by email", async () => {
    // Create a test member
    const memberArgs = makeAddMemberArgs({ email: "delete@example.com" });
    await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify member exists
    let result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          email: { eq: "delete@example.com" },
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(1);

    // Delete the member
    await deleteMembers({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        email: { eq: "delete@example.com" },
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify member is deleted
    result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          email: { eq: "delete@example.com" },
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(0);
  });

  it("deletes multiple members when deleteMany is true", async () => {
    // Create multiple test members
    const member1Args = makeAddMemberArgs({ name: "Member 1" });
    const member2Args = makeAddMemberArgs({ name: "Member 2" });
    const member3Args = makeAddMemberArgs({ name: "Member 3" });

    await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addMember({
      args: member3Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify all members exist
    let result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(3);

    // Delete all members in the group
    await deleteMembers({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
      },
      deleteMany: true,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify all members are deleted
    result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(0);
  });

  it("deletes only one member when deleteMany is false", async () => {
    // Create multiple test members
    const member1Args = makeAddMemberArgs({ name: "Member 1" });
    const member2Args = makeAddMemberArgs({ name: "Member 2" });

    await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify both members exist
    let result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(2);

    // Delete members in the group (should only delete first match)
    await deleteMembers({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
      },
      deleteMany: false,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only one member is deleted
    result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(1);
  });

  it("deletes members by meta field", async () => {
    // Create test members with different meta data
    const member1Args = makeAddMemberArgs({
      name: "Alice",
      meta: { department: "engineering" },
    });
    const member2Args = makeAddMemberArgs({
      name: "Bob",
      meta: { department: "marketing" },
    });

    await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify both members exist
    let result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(2);

    // Delete only engineering department members
    await deleteMembers({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        meta: [
          {
            op: "eq",
            field: "department",
            value: "engineering",
          },
        ],
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only engineering member is deleted
    result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(1);
    expect(result.members[0].name).toBe("Bob");
    expect(result.members[0].meta?.department).toBe("marketing");
  });

  it("deletes members by status", async () => {
    // Create test members with different statuses
    const member1Args = makeAddMemberArgs({
      name: "Alice",
    });
    const member2Args = makeAddMemberArgs({
      name: "Bob",
    });

    const seed1: Partial<IMemberObjRecord> = { status: kMemberStatus.pending };
    const seed2: Partial<IMemberObjRecord> = { status: kMemberStatus.accepted };

    await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      seed: seed1,
      storage,
    });

    await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      seed: seed2,
      storage,
    });

    // Verify both members exist
    let result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(2);

    // Delete only pending members
    await deleteMembers({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        status: { eq: "pending" },
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only pending member is deleted
    result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(1);
    expect(result.members[0].name).toBe("Bob");
    expect(result.members[0].status).toBe("accepted");
  });

  it("deletes members from specific group only", async () => {
    // Create members in different groups
    const member1Args = makeAddMemberArgs({
      name: "Alice",
      groupId: "group-1",
    });
    const member2Args = makeAddMemberArgs({
      name: "Bob",
      groupId: "group-2",
    });

    await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify both members exist
    let result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: "group-1",
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(1);

    result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: "group-2",
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(1);

    // Delete only group-1 members
    await deleteMembers({
      query: {
        projectId: defaultProjectId,
        groupId: "group-1",
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only group-1 member is deleted
    result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: "group-1",
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(0);

    result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: "group-2",
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(1);
    expect(result.members[0].name).toBe("Bob");
  });

  it("deletes members from specific project only", async () => {
    // Create members in different projects
    const member1Args = makeAddMemberArgs({
      name: "Alice",
      projectId: "project-1",
    });
    const member2Args = makeAddMemberArgs({
      name: "Bob",
      projectId: "project-2",
    });

    await addMember({
      args: member1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addMember({
      args: member2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify both members exist
    let result = await getMembers({
      args: {
        query: {
          projectId: "project-1",
          groupId: defaultGroupId,
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(1);

    result = await getMembers({
      args: {
        query: {
          projectId: "project-2",
          groupId: defaultGroupId,
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(1);

    // Delete only project-1 members
    await deleteMembers({
      query: {
        projectId: "project-1",
        groupId: defaultGroupId,
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only project-1 member is deleted
    result = await getMembers({
      args: {
        query: {
          projectId: "project-1",
          groupId: defaultGroupId,
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(0);

    result = await getMembers({
      args: {
        query: {
          projectId: "project-2",
          groupId: defaultGroupId,
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(1);
    expect(result.members[0].name).toBe("Bob");
  });
});

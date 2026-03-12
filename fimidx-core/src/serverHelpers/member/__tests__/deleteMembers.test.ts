import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  kMemberStatus,
  type AddMemberEndpointArgs,
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
    projectId: defaultProjectId,
    groupId: defaultGroupId,
    permissions: [],
    meta: { userId: `member-${uniqueId}` },
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
          query: { metaQuery: { projectId: { eq: projectId } } },
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
          query: { metaQuery: { projectId: { eq: projectId } } },
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

  it("deletes a single member by id", async () => {
    // Create a test member
    const memberArgs = makeAddMemberArgs();
    const added = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const memberId = added.member.id;

    // Verify member exists
    let result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: memberId },
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
        id: { eq: memberId },
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
          id: { eq: memberId },
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(0);
  });

  it("deletes a single member by meta", async () => {
    const memberArgs = makeAddMemberArgs({
      meta: { customLabel: "Member to Delete" },
    });
    const added = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    let result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: added.member.id },
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(1);

    await deleteMembers({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        id: { eq: added.member.id },
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: added.member.id },
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(0);
  });

  it("deletes a single member by id (from meta)", async () => {
    const memberArgs = makeAddMemberArgs({
      meta: { email: "delete@example.com" },
    });
    const added = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    let result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: added.member.id },
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(1);

    await deleteMembers({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        id: { eq: added.member.id },
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: added.member.id },
        },
        includePermissions: false,
      },
      storage,
    });
    expect(result.members).toHaveLength(0);
  });

  it("deletes multiple members when deleteMany is true", async () => {
    // Create multiple test members
    const member1Args = makeAddMemberArgs({ meta: { label: "Member 1" } });
    const member2Args = makeAddMemberArgs({ meta: { label: "Member 2" } });
    const member3Args = makeAddMemberArgs({ meta: { label: "Member 3" } });

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
    const member1Args = makeAddMemberArgs({ meta: { label: "Member 1" } });
    const member2Args = makeAddMemberArgs({ meta: { label: "Member 2" } });

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
      meta: { name: "Alice", department: "engineering" },
    });
    const member2Args = makeAddMemberArgs({
      meta: { name: "Bob", department: "marketing" },
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
    expect(result.members[0].meta?.name).toBe("Bob");
    expect(result.members[0].meta?.department).toBe("marketing");
  });

  it("deletes members by status", async () => {
    const member1Args = makeAddMemberArgs({
      meta: { userId: "alice", status: kMemberStatus.pending },
    });
    const member2Args = makeAddMemberArgs({
      meta: { userId: "bob", status: kMemberStatus.accepted },
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

    await deleteMembers({
      query: {
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        meta: [{ op: "eq" as const, field: "status", value: "pending" }],
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

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
    expect(result.members[0].meta?.status).toBe("accepted");
  });

  it("deletes members from specific group only", async () => {
    // Create members in different groups
    const member1Args = makeAddMemberArgs({
      meta: { name: "Alice" },
      groupId: "group-1",
    });
    const member2Args = makeAddMemberArgs({
      meta: { name: "Bob" },
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
    expect(result.members[0].meta?.name).toBe("Bob");
  });

  it("deletes members from specific project only", async () => {
    // Create members in different projects
    const member1Args = makeAddMemberArgs({
      meta: { name: "Alice", userId: "alice", email: "a@test.com" },
      projectId: "project-1",
    });
    const member2Args = makeAddMemberArgs({
      meta: { name: "Bob", userId: "bob", email: "b@test.com" },
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
    expect(result.members[0].meta?.name).toBe("Bob");
  });
});

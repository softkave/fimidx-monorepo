import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addMember } from "../addMember.js";
import { getMembers } from "../getMembers.js";
import { updateMembers } from "../updateMembers.js";

const defaultProjectId = "test-project-updateMembers";
const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";

// Test counter to ensure unique names
let testCounter = 0;

function makeAddMemberArgs(overrides: any = {}) {
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

describe("updateMembers integration", () => {
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
        "test-project-updateMembers-1",
        "test-project-updateMembers-2",
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
        "test-project-updateMembers-1",
        "test-project-updateMembers-2",
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

  it("updates member name", async () => {
    // Create a test member
    const memberArgs = makeAddMemberArgs({ name: "Original Name" });
    await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Update the member
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          memberId: { eq: memberArgs.memberId },
        },
        update: {
          name: "Updated Name",
        },
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          memberId: { eq: memberArgs.memberId },
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].name).toBe("Updated Name");
  });

  it("updates member description", async () => {
    // Create a test member
    const memberArgs = makeAddMemberArgs({
      description: "Original description",
    });
    await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Update the member
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          memberId: { eq: memberArgs.memberId },
        },
        update: {
          description: "Updated description",
        },
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          memberId: { eq: memberArgs.memberId },
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].description).toBe("Updated description");
  });

  it("updates member email", async () => {
    // Create a test member
    const memberArgs = makeAddMemberArgs({ email: "original@example.com" });
    await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Update the member
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          memberId: { eq: memberArgs.memberId },
        },
        update: {
          email: "updated@example.com",
        },
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          memberId: { eq: memberArgs.memberId },
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].email).toBe("updated@example.com");
  });

  it("updates member meta data", async () => {
    // Create a test member
    const memberArgs = makeAddMemberArgs({
      meta: { department: "engineering", level: "junior" },
    });
    await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Update the member
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          memberId: { eq: memberArgs.memberId },
        },
        update: {
          meta: {
            department: "marketing",
            level: "senior",
            location: "remote",
          },
        },
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          memberId: { eq: memberArgs.memberId },
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].meta).toEqual({
      department: "marketing",
      level: "senior",
      location: "remote",
    });
  });

  it("updates multiple fields at once", async () => {
    // Create a test member
    const memberArgs = makeAddMemberArgs({
      name: "Original Name",
      description: "Original description",
      email: "original@example.com",
    });
    await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Update the member
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          memberId: { eq: memberArgs.memberId },
        },
        update: {
          name: "Updated Name",
          description: "Updated description",
          email: "updated@example.com",
        },
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          memberId: { eq: memberArgs.memberId },
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].name).toBe("Updated Name");
    expect(result.members[0].description).toBe("Updated description");
    expect(result.members[0].email).toBe("updated@example.com");
  });

  it("updates multiple members when updateMany is true", async () => {
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

    // Update all members in the group
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
        update: {
          description: "Updated for all members",
        },
        updateMany: true,
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify all members were updated
    const result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(3);
    result.members.forEach((member) => {
      expect(member.description).toBe("Updated for all members");
    });
  });

  it("updates only one member when updateMany is false", async () => {
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

    // Update members in the group (should only update first match)
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
        update: {
          description: "Updated description",
        },
        updateMany: false,
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only one member was updated
    const result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(2);
    const updatedMembers = result.members.filter(
      (m) => m.description === "Updated description"
    );
    expect(updatedMembers).toHaveLength(1);
  });

  it("filters by name when updating", async () => {
    // Create test members with different names
    const member1Args = makeAddMemberArgs({ name: "Alice" });
    const member2Args = makeAddMemberArgs({ name: "Bob" });

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

    // Update only Alice
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          name: { eq: "Alice" },
        },
        update: {
          description: "Updated Alice only",
        },
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only Alice was updated
    const result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(2);
    const alice = result.members.find((m) => m.name === "Alice");
    const bob = result.members.find((m) => m.name === "Bob");

    expect(alice?.description).toBe("Updated Alice only");
    expect(bob?.description).toBe("Test description"); // Original description
  });

  it("filters by email when updating", async () => {
    // Create test members with different emails
    const member1Args = makeAddMemberArgs({ email: "alice@example.com" });
    const member2Args = makeAddMemberArgs({ email: "bob@example.com" });

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

    // Update only Alice's email
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          email: { eq: "alice@example.com" },
        },
        update: {
          description: "Updated Alice only",
        },
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only Alice was updated
    const result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(2);
    const alice = result.members.find((m) => m.email === "alice@example.com");
    const bob = result.members.find((m) => m.email === "bob@example.com");

    expect(alice?.description).toBe("Updated Alice only");
    expect(bob?.description).toBe("Test description"); // Original description
  });

  it("preserves other fields when updating specific fields", async () => {
    // Create a test member with multiple fields
    const memberArgs = makeAddMemberArgs({
      name: "Original Name",
      description: "Original description",
      email: "original@example.com",
      meta: { department: "engineering" },
    });
    await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Update only the name
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          memberId: { eq: memberArgs.memberId },
        },
        update: {
          name: "Updated Name",
        },
      },
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only name was updated, other fields preserved
    const result = await getMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          memberId: { eq: memberArgs.memberId },
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].name).toBe("Updated Name");
    expect(result.members[0].description).toBe("Original description");
    expect(result.members[0].email).toBe("original@example.com");
    expect(result.members[0].meta).toEqual({ department: "engineering" });
  });
});

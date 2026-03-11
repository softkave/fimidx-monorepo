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

function makeAddMemberArgs(overrides: Record<string, unknown> = {}) {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  return {
    projectId: defaultProjectId,
    groupId: defaultGroupId,
    meta: {
      name: `Test Member ${uniqueId}`,
      userId: `member-${uniqueId}`,
      email: `test${uniqueId}@example.com`,
    },
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
        "test-project-updateMembers-1",
        "test-project-updateMembers-2",
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

  it("updates member name", async () => {
    // Create a test member
    const memberArgs = makeAddMemberArgs({
      meta: {
        name: "Original Name",
        userId: "member-name-test",
        email: "name@test.com",
      },
    }) as Parameters<typeof addMember>[0]["args"];
    const addResult = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Update the member (name in meta)
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: addResult.member.id },
        },
        update: {
          meta: { name: "Updated Name" },
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
          id: { eq: addResult.member.id },
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].meta?.name).toBe("Updated Name");
  });

  it("updates member description (in meta)", async () => {
    // Create a test member
    const memberArgs = makeAddMemberArgs({
      meta: {
        name: "Test",
        userId: "member-desc-test",
        email: "d@test.com",
        description: "Original description",
      },
    }) as Parameters<typeof addMember>[0]["args"];
    const addResult = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Update the member (description in meta)
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: addResult.member.id },
        },
        update: {
          meta: { description: "Updated description" },
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
          id: { eq: addResult.member.id },
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].meta?.description).toBe("Updated description");
  });

  it("updates member email (in meta)", async () => {
    // Create a test member
    const memberArgs = makeAddMemberArgs({
      meta: {
        name: "Test",
        userId: "member-email-test",
        email: "original@example.com",
      },
    }) as Parameters<typeof addMember>[0]["args"];
    const addResult = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Update the member (email in meta)
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: addResult.member.id },
        },
        update: {
          meta: { email: "updated@example.com" },
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
          id: { eq: addResult.member.id },
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].meta?.email).toBe("updated@example.com");
  });

  it("updates member meta data", async () => {
    // Create a test member
    const memberArgs = makeAddMemberArgs({
      meta: {
        name: "Test",
        userId: "member-meta-test",
        email: "m@test.com",
        department: "engineering",
        level: "junior",
      },
    }) as Parameters<typeof addMember>[0]["args"];
    const addResult = await addMember({
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
          id: { eq: addResult.member.id },
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
          id: { eq: addResult.member.id },
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].meta?.department).toBe("marketing");
    expect(result.members[0].meta?.level).toBe("senior");
    expect(result.members[0].meta?.location).toBe("remote");
  });

  it("updates multiple fields at once", async () => {
    // Create a test member
    const memberArgs = makeAddMemberArgs({
      meta: {
        name: "Original Name",
        userId: "multi-fields",
        email: "original@example.com",
        description: "Original description",
      },
    }) as Parameters<typeof addMember>[0]["args"];
    const addResult = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Update the member (name, description, email in meta)
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: addResult.member.id },
        },
        update: {
          meta: {
            name: "Updated Name",
            description: "Updated description",
            email: "updated@example.com",
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
          id: { eq: addResult.member.id },
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].meta?.name).toBe("Updated Name");
    expect(result.members[0].meta?.description).toBe("Updated description");
    expect(result.members[0].meta?.email).toBe("updated@example.com");
  });

  it("updates multiple members when updateMany is true", async () => {
    // Create multiple test members
    const member1Args = makeAddMemberArgs({
      meta: { name: "Member 1", userId: "member-1", email: "m1@test.com" },
    }) as Parameters<typeof addMember>[0]["args"];
    const member2Args = makeAddMemberArgs({
      meta: { name: "Member 2", userId: "member-2", email: "m2@test.com" },
    }) as Parameters<typeof addMember>[0]["args"];
    const member3Args = makeAddMemberArgs({
      meta: { name: "Member 3", userId: "member-3", email: "m3@test.com" },
    }) as Parameters<typeof addMember>[0]["args"];

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
          meta: { description: "Updated for all members" },
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
      expect(member.meta?.description).toBe("Updated for all members");
    });
  });

  it("updates only one member when updateMany is false", async () => {
    // Create multiple test members
    const member1Args = makeAddMemberArgs({
      meta: { name: "Member 1", userId: "member-1", email: "m1@test.com" },
    }) as Parameters<typeof addMember>[0]["args"];
    const member2Args = makeAddMemberArgs({
      meta: { name: "Member 2", userId: "member-2", email: "m2@test.com" },
    }) as Parameters<typeof addMember>[0]["args"];

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
          meta: { description: "Updated description" },
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
      (m) => m.meta?.description === "Updated description"
    );
    expect(updatedMembers).toHaveLength(1);
  });

  it("filters by name when updating", async () => {
    // Create test members with different names (in meta)
    const member1Args = makeAddMemberArgs({
      meta: { name: "Alice", userId: "alice", email: "alice@test.com" },
    }) as Parameters<typeof addMember>[0]["args"];
    const member2Args = makeAddMemberArgs({
      meta: { name: "Bob", userId: "bob", email: "bob@test.com" },
    }) as Parameters<typeof addMember>[0]["args"];

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

    // Update only Alice (filter by meta.name)
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          meta: [{ op: "eq" as const, field: "name", value: "Alice" }],
        },
        update: {
          meta: { description: "Updated Alice only" },
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
    const alice = result.members.find((m) => m.meta?.name === "Alice");
    const bob = result.members.find((m) => m.meta?.name === "Bob");

    expect(alice?.meta?.description).toBe("Updated Alice only");
    expect(bob?.meta?.description).toBeUndefined();
  });

  it("filters by email when updating", async () => {
    // Create test members with different emails (in meta)
    const member1Args = makeAddMemberArgs({
      meta: { name: "Alice", userId: "alice", email: "alice@example.com" },
    }) as Parameters<typeof addMember>[0]["args"];
    const member2Args = makeAddMemberArgs({
      meta: { name: "Bob", userId: "bob", email: "bob@example.com" },
    }) as Parameters<typeof addMember>[0]["args"];

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

    // Update only Alice (filter by meta.email)
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          meta: [
            { op: "eq" as const, field: "email", value: "alice@example.com" },
          ],
        },
        update: {
          meta: { description: "Updated Alice only" },
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
    const alice = result.members.find(
      (m) => m.meta?.email === "alice@example.com"
    );
    const bob = result.members.find((m) => m.meta?.email === "bob@example.com");

    expect(alice?.meta?.description).toBe("Updated Alice only");
    expect(bob?.meta?.description).toBeUndefined();
  });

  it("preserves other fields when updating specific fields", async () => {
    // Create a test member with multiple fields in meta
    const memberArgs = makeAddMemberArgs({
      meta: {
        name: "Original Name",
        userId: "preserve-test",
        email: "original@example.com",
        description: "Original description",
        department: "engineering",
      },
    }) as Parameters<typeof addMember>[0]["args"];
    const addResult = await addMember({
      args: memberArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Update only the name in meta
    await updateMembers({
      args: {
        query: {
          projectId: defaultProjectId,
          groupId: defaultGroupId,
          id: { eq: addResult.member.id },
        },
        update: {
          meta: { name: "Updated Name" },
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
          id: { eq: addResult.member.id },
        },
      },
      storage,
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0].meta?.name).toBe("Updated Name");
    expect(result.members[0].meta?.description).toBe("Original description");
    expect(result.members[0].meta?.email).toBe("original@example.com");
    expect(result.members[0].meta?.department).toBe("engineering");
  });

  describe("meta field splitting", () => {
    it("should shallow merge meta fields preserving existing keys", async () => {
      const memberArgs = makeAddMemberArgs({
        meta: {
          name: "Test Member",
          userId: "shallow-merge-test",
          email: "test@example.com",
          existingField1: "value1",
          existingField2: "value2",
        },
      }) as Parameters<typeof addMember>[0]["args"];
      const addResult = await addMember({
        args: memberArgs,
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      // Update only some meta fields
      await updateMembers({
        args: {
          query: {
            projectId: defaultProjectId,
            groupId: defaultGroupId,
            id: { eq: addResult.member.id },
          },
          update: {
            meta: {
              existingField1: "updated",
              newField: "newValue",
            },
          },
        },
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      // Verify meta was shallow merged
      const result = await getMembers({
        args: {
          query: {
            projectId: defaultProjectId,
            groupId: defaultGroupId,
            id: { eq: addResult.member.id },
          },
        },
        storage,
      });

      expect(result.members).toHaveLength(1);
      expect(result.members[0].meta?.name).toBe("Test Member");
      expect(result.members[0].meta?.existingField1).toBe("updated");
      expect(result.members[0].meta?.existingField2).toBe("value2");
      expect(result.members[0].meta?.newField).toBe("newValue");
    });

    it("should handle meta-only update with granular merge", async () => {
      const memberArgs = makeAddMemberArgs({
        meta: {
          name: "Meta Only Member",
          userId: "meta-only-test",
          email: "meta@example.com",
          key1: "original1",
          key2: "original2",
        },
      }) as Parameters<typeof addMember>[0]["args"];
      const addResult = await addMember({
        args: memberArgs,
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      // Update with meta containing partial fields
      await updateMembers({
        args: {
          query: {
            projectId: defaultProjectId,
            groupId: defaultGroupId,
            id: { eq: addResult.member.id },
          },
          update: {
            meta: {
              key1: "updated1",
              key3: "new3",
            },
          },
        },
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      // Verify meta was properly merged
      const result = await getMembers({
        args: {
          query: {
            projectId: defaultProjectId,
            groupId: defaultGroupId,
            id: { eq: addResult.member.id },
          },
        },
        storage,
      });

      expect(result.members).toHaveLength(1);
      expect(result.members[0].meta?.key1).toBe("updated1");
      expect(result.members[0].meta?.key2).toBe("original2");
      expect(result.members[0].meta?.key3).toBe("new3");
    });

    it("should use replace metaUpdateWay when specified", async () => {
      const memberArgs = makeAddMemberArgs({
        meta: {
          name: "Replace Meta Test",
          userId: "replace-meta-test",
          email: "replace@example.com",
          existingKey: "existingValue",
        },
      }) as Parameters<typeof addMember>[0]["args"];
      const addResult = await addMember({
        args: memberArgs,
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      // Update meta with replace strategy
      await updateMembers({
        args: {
          query: {
            projectId: defaultProjectId,
            groupId: defaultGroupId,
            id: { eq: addResult.member.id },
          },
          update: {
            meta: {
              newKey: "newValue",
            },
          },
          metaUpdateWay: "replace",
        },
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      // Verify meta was completely replaced
      const result = await getMembers({
        args: {
          query: {
            projectId: defaultProjectId,
            groupId: defaultGroupId,
            id: { eq: addResult.member.id },
          },
        },
        storage,
      });

      expect(result.members).toHaveLength(1);
      expect(result.members[0].meta).toEqual({
        newKey: "newValue",
      });
    });

    it("should use deepMerge metaUpdateWay when specified", async () => {
      const memberArgs = makeAddMemberArgs({
        meta: {
          name: "Deep Merge Meta Test",
          userId: "deep-merge-test",
          email: "deep@example.com",
          key1: "value1",
          key2: "value2",
        },
      }) as Parameters<typeof addMember>[0]["args"];
      const addResult = await addMember({
        args: memberArgs,
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      // Update meta with deepMerge strategy
      await updateMembers({
        args: {
          query: {
            projectId: defaultProjectId,
            groupId: defaultGroupId,
            id: { eq: addResult.member.id },
          },
          update: {
            meta: {
              key1: "updated1",
              key3: "value3",
            },
          },
          metaUpdateWay: "deepMerge",
        },
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      // Verify meta was deep merged
      const result = await getMembers({
        args: {
          query: {
            projectId: defaultProjectId,
            groupId: defaultGroupId,
            id: { eq: addResult.member.id },
          },
        },
        storage,
      });

      expect(result.members).toHaveLength(1);
      expect(result.members[0].meta?.key1).toBe("updated1");
      expect(result.members[0].meta?.key2).toBe("value2");
      expect(result.members[0].meta?.key3).toBe("value3");
    });
  });
});

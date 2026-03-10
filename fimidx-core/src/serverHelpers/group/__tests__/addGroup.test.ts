import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AddGroupEndpointArgs } from "../../../definitions/group.js";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addGroup } from "../addGroup.js";

const defaultProjectId = "test-project-addGroup";
const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";

function makeAddGroupArgs(
  overrides: Partial<AddGroupEndpointArgs> = {}
): AddGroupEndpointArgs {
  return {
    name: `Test Group ${Math.random()}`,
    description: "Test description",
    projectId: defaultProjectId,
    ...overrides,
  };
}

describe("addGroup integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    // Test will use the default storage type from createDefaultStorage()
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    // Clean up test data before each test using hard deletes for complete isolation
    try {
      await storage.bulkDelete({
        query: { metaQuery: { projectId: { eq: defaultProjectId } } },
        tag: kObjTags.group,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true, // Use hard delete for test cleanup
      });
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  afterEach(async () => {
    // Clean up after each test using hard deletes for complete isolation
    try {
      await storage.bulkDelete({
        query: { metaQuery: { projectId: { eq: defaultProjectId } } },
        tag: kObjTags.group,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true, // Use hard delete for test cleanup
      });
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  it("creates a new group successfully", async () => {
    const args = makeAddGroupArgs({
      name: "My Test Group",
      description: "A test group description",
      meta: { key1: "value1", key2: "value2" },
    });

    const result = await addGroup({
      args,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
    });

    expect(result.group).toBeDefined();
    expect(result.group.name).toBe("My Test Group");
    expect(result.group.description).toBe("A test group description");
    expect(result.group.meta).toEqual({ key1: "value1", key2: "value2" });
    expect(result.group.projectId).toBe(defaultProjectId);
    expect(result.group.groupId).toBe(defaultGroupId);
    expect(result.group.createdBy).toBe(defaultBy);
    expect(result.group.createdByType).toBe(defaultByType);
    expect(result.group.id).toBeDefined();
    expect(result.group.createdAt).toBeInstanceOf(Date);
    expect(result.group.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a group with minimal required fields", async () => {
    const args = makeAddGroupArgs({
      name: "Minimal Group",
      description: undefined,
      meta: undefined,
    });

    const result = await addGroup({
      args,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
    });

    expect(result.group).toBeDefined();
    expect(result.group.name).toBe("Minimal Group");
    expect(result.group.description).toBeUndefined();
    expect(result.group.meta).toBeUndefined();
  });

  it("fails when trying to create a group with duplicate name", async () => {
    const args = makeAddGroupArgs({
      name: "Duplicate Name Group",
    });

    // First group creation should succeed
    const result1 = await addGroup({
      args,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
    });

    expect(result1.group).toBeDefined();
    expect(result1.group.name).toBe("Duplicate Name Group");

    // Second group with same name should fail due to conflict on "name"
    await expect(
      addGroup({
        args,
        by: defaultBy,
        byType: defaultByType,
        groupId: defaultGroupId,
      })
    ).rejects.toThrow("Failed to add group");
  });

  it("allows creating groups with different names in same project", async () => {
    const args1 = makeAddGroupArgs({
      name: "First Group",
    });

    const args2 = makeAddGroupArgs({
      name: "Second Group",
    });

    const result1 = await addGroup({
      args: args1,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
    });

    const result2 = await addGroup({
      args: args2,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
    });

    expect(result1.group.name).toBe("First Group");
    expect(result2.group.name).toBe("Second Group");
    expect(result1.group.id).not.toBe(result2.group.id);
  });

  it("allows creating groups with same name in different projects", async () => {
    const args1 = makeAddGroupArgs({
      name: "Same Name Group",
      projectId: "test-project-addGroup-1",
    });

    const args2 = makeAddGroupArgs({
      name: "Same Name Group",
      projectId: "test-project-addGroup-2",
    });

    const result1 = await addGroup({
      args: args1,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
    });

    const result2 = await addGroup({
      args: args2,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
    });

    expect(result1.group.name).toBe("Same Name Group");
    expect(result2.group.name).toBe("Same Name Group");
    expect(result1.group.projectId).toBe("test-project-addGroup-1");
    expect(result2.group.projectId).toBe("test-project-addGroup-2");
    expect(result1.group.id).not.toBe(result2.group.id);
  });

  it("handles empty string description", async () => {
    const args = makeAddGroupArgs({
      name: "Empty Description Group",
      description: "",
    });

    const result = await addGroup({
      args,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
    });

    expect(result.group.description).toBe("");
  });

  it("handles empty meta object", async () => {
    const args = makeAddGroupArgs({
      name: "Empty Meta Group",
      meta: {},
    });

    const result = await addGroup({
      args,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
    });

    expect(result.group.meta).toEqual({});
  });

  it("sets correct timestamps", async () => {
    const beforeCreation = new Date();
    const args = makeAddGroupArgs({
      name: "Timestamp Test Group",
    });

    const result = await addGroup({
      args,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
    });

    const afterCreation = new Date();

    expect(result.group.createdAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreation.getTime()
    );
    expect(result.group.createdAt.getTime()).toBeLessThanOrEqual(
      afterCreation.getTime()
    );
    expect(result.group.updatedAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreation.getTime()
    );
    expect(result.group.updatedAt.getTime()).toBeLessThanOrEqual(
      afterCreation.getTime()
    );
  });

  it("sets updatedBy and updatedByType correctly", async () => {
    const args = makeAddGroupArgs({
      name: "Update Fields Test Group",
    });

    const result = await addGroup({
      args,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
    });

    expect(result.group.updatedBy).toBe(defaultBy);
    expect(result.group.updatedByType).toBe(defaultByType);
  });

  it("handles special characters in name and description", async () => {
    const args = makeAddGroupArgs({
      name: "Group with special chars: !@#$%^&*()",
      description: "Description with emojis 🚀 and symbols ©®™",
    });

    const result = await addGroup({
      args,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
    });

    expect(result.group.name).toBe("Group with special chars: !@#$%^&*()");
    expect(result.group.description).toBe(
      "Description with emojis 🚀 and symbols ©®™"
    );
  });

  it("handles very long name and description", async () => {
    const longName = "A".repeat(1000);
    const longDescription = "B".repeat(2000);

    const args = makeAddGroupArgs({
      name: longName,
      description: longDescription,
    });

    const result = await addGroup({
      args,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
    });

    expect(result.group.name).toBe(longName);
    expect(result.group.description).toBe(longDescription);
  });
});

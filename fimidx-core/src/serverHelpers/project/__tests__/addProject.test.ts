import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { kObjTags } from "../../../definitions/obj.js";
import type { AddProjectEndpointArgs } from "../../../definitions/project.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addProject } from "../addProject.js";

const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";

// Test counter to ensure unique names
let testCounter = 0;

function makeAddProjectArgs(
  overrides: Partial<AddProjectEndpointArgs> = {}
): AddProjectEndpointArgs {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  return {
    name: `Test Project ${uniqueId}`,
    description: "Test description",
    orgId: defaultGroupId,
    objFieldsToIndex: ["field1", "field2"],
    ...overrides,
  };
}

describe("addProject integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    // Test will use the default storage type from createDefaultStorage()
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    // Clean up test data before each test using hard deletes for complete isolation
    try {
      await storage.bulkDelete({
        query: { projectId: "0" },
        tag: kObjTags.project,
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
        query: { projectId: "0" },
        tag: kObjTags.project,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true, // Use hard delete for test cleanup
      });
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  it("verifies test isolation by checking empty state", async () => {
    // This test verifies that our cleanup is working
    // We can't easily check for empty state in addProject tests since we need to create projects to test
    // But we can verify that each test starts with a clean slate by checking that duplicate names work
    const args = makeAddProjectArgs({
      name: "Isolation Test Project",
    });

    // First project creation should succeed
    const result1 = await addProject({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result1.project).toBeDefined();
    expect(result1.project.name).toBe("Isolation Test Project");

    // Second project with same name should fail due to conflict
    await expect(
      addProject({
        args,
        by: defaultBy,
        byType: defaultByType,
        storage,
      })
    ).rejects.toThrow("Failed to add project");
  });

  it("creates a new project successfully", async () => {
    const args = makeAddProjectArgs({
      name: "My Test Project",
      description: "A test project description",
      objFieldsToIndex: ["field1", "field2"],
    });

    const result = await addProject({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.project).toBeDefined();
    expect(result.project.name).toBe("My Test Project");
    expect(result.project.description).toBe("A test project description");
    expect(result.project.objFieldsToIndex).toEqual(["field1", "field2"]);
    expect(result.project.orgId).toBe(defaultGroupId);
    expect(result.project.createdBy).toBe(defaultBy);
    expect(result.project.createdByType).toBe(defaultByType);
    expect(result.project.id).toBeDefined();
    expect(result.project.createdAt).toBeInstanceOf(Date);
    expect(result.project.updatedAt).toBeInstanceOf(Date);
  });

  it("creates an project with minimal required fields", async () => {
    const args = makeAddProjectArgs({
      name: "Minimal Project",
      description: undefined,
      objFieldsToIndex: undefined,
    });

    const result = await addProject({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.project).toBeDefined();
    expect(result.project.name).toBe("Minimal Project");
    expect(result.project.description).toBeUndefined();
    expect(result.project.objFieldsToIndex).toBeNull();
  });

  it("fails when trying to create an project with duplicate name in same group", async () => {
    const args = makeAddProjectArgs({
      name: "Duplicate Name Project",
    });

    // First project creation should succeed
    const result1 = await addProject({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result1.project).toBeDefined();
    expect(result1.project.name).toBe("Duplicate Name Project");

    // Second project with same name should fail due to conflict on "name"
    await expect(
      addProject({
        args,
        by: defaultBy,
        byType: defaultByType,
        storage,
      })
    ).rejects.toThrow("Failed to add project");
  });

  it("allows creating projects with different names in same group", async () => {
    const args1 = makeAddProjectArgs({
      name: "First Project",
    });

    const args2 = makeAddProjectArgs({
      name: "Second Project",
    });

    const result1 = await addProject({
      args: args1,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const result2 = await addProject({
      args: args2,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result1.project).toBeDefined();
    expect(result1.project.name).toBe("First Project");
    expect(result2.project).toBeDefined();
    expect(result2.project.name).toBe("Second Project");
    expect(result1.project.id).not.toBe(result2.project.id);
  });

  it("allows creating projects with same name in different groups", async () => {
    const args1 = makeAddProjectArgs({
      name: "Same Name Project",
      orgId: "group-1",
    });

    const args2 = makeAddProjectArgs({
      name: "Same Name Project",
      orgId: "group-2",
    });

    const result1 = await addProject({
      args: args1,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const result2 = await addProject({
      args: args2,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result1.project).toBeDefined();
    expect(result1.project.name).toBe("Same Name Project");
    expect(result1.project.orgId).toBe("group-1");
    expect(result2.project).toBeDefined();
    expect(result2.project.name).toBe("Same Name Project");
    expect(result2.project.orgId).toBe("group-2");
    expect(result1.project.id).not.toBe(result2.project.id);
  });

  it("handles projects with special characters in names", async () => {
    const args = makeAddProjectArgs({
      name: "Project with special chars: !@#$%^&*()",
      description: "Description with emojis 🚀 and symbols ©®™",
    });

    const result = await addProject({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.project).toBeDefined();
    expect(result.project.name).toBe("Project with special chars: !@#$%^&*()");
    expect(result.project.description).toBe(
      "Description with emojis 🚀 and symbols ©®™"
    );
  });

  it("handles very long project names and descriptions", async () => {
    const longName = "A".repeat(1000);
    const longDescription = "B".repeat(2000);

    const args = makeAddProjectArgs({
      name: longName,
      description: longDescription,
    });

    const result = await addProject({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.project).toBeDefined();
    expect(result.project.name).toBe(longName);
    expect(result.project.description).toBe(longDescription);
  });

  it("handles projects with many objFieldsToIndex", async () => {
    const manyFields = Array.from({ length: 100 }, (_, i) => `field${i}`);

    const args = makeAddProjectArgs({
      name: "Many Fields Project",
      objFieldsToIndex: manyFields,
    });

    const result = await addProject({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.project).toBeDefined();
    expect(result.project.objFieldsToIndex).toEqual(manyFields);
  });

  it("handles projects with empty string names", async () => {
    const args = makeAddProjectArgs({
      name: "",
    });

    const result = await addProject({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.project).toBeDefined();
    expect(result.project.name).toBe("");
  });

  it("handles projects created by different users", async () => {
    const args = makeAddProjectArgs({
      name: "User Project",
    });

    const result = await addProject({
      args,
      by: "user1",
      byType: "user",
      storage,
    });

    expect(result.project).toBeDefined();
    expect(result.project.createdBy).toBe("user1");
    expect(result.project.createdByType).toBe("user");
  });

  it("handles projects with different byType values", async () => {
    const args = makeAddProjectArgs({
      name: "System Project",
    });

    const result = await addProject({
      args,
      by: "system",
      byType: "system",
      storage,
    });

    expect(result.project).toBeDefined();
    expect(result.project.createdBy).toBe("system");
    expect(result.project.createdByType).toBe("system");
  });

  it("handles concurrent project creation", async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      addProject({
        args: makeAddProjectArgs({ name: `Concurrent Project ${i}` }),
        by: defaultBy,
        byType: defaultByType,
        storage,
      })
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(10);
    results.forEach((result, i) => {
      expect(result.project).toBeDefined();
      expect(result.project.name).toBe(`Concurrent Project ${i}`);
    });
  });

  it("handles projects with duplicate objFieldsToIndex values", async () => {
    const args = makeAddProjectArgs({
      name: "Duplicate Fields Project",
      objFieldsToIndex: ["field1", "field1", "field2", "field2"],
    });

    const result = await addProject({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.project).toBeDefined();
    expect(result.project.objFieldsToIndex).toEqual(["field1", "field2"]);
  });

  it("handles projects with null objFieldsToIndex", async () => {
    const args = makeAddProjectArgs({
      name: "Null Fields Project",
      objFieldsToIndex: null as any,
    });

    const result = await addProject({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.project).toBeDefined();
    expect(result.project.objFieldsToIndex).toBeNull();
  });

  it("handles projects with empty objFieldsToIndex array", async () => {
    const args = makeAddProjectArgs({
      name: "Empty Fields Project",
      objFieldsToIndex: [],
    });

    const result = await addProject({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.project).toBeDefined();
    expect(result.project.objFieldsToIndex).toEqual([]);
  });
});

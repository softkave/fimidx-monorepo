import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { kObjTags } from "../../../definitions/obj.js";
import type { AddProjectEndpointArgs } from "../../../definitions/project.js";
import { kId0 } from "../../../definitions/system.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addProject } from "../addProject.js";
import {
  checkProjectAvailable,
  checkProjectExists,
} from "../checkProjectExists.js";

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
    description: "Test project description",
    orgId: defaultGroupId,
    objFieldsToIndex: ["field1", "field2"],
    ...overrides,
  };
}

describe("checkProjectExists integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    // Test will use the default storage type from createDefaultStorage()
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    // Clean up test data before each test using hard deletes for complete isolation
    try {
      await storage.bulkDelete({
        query: { projectId: kId0 },
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
        query: { projectId: kId0 },
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

  it("returns exists: false when project does not exist", async () => {
    const result = await checkProjectExists({
      name: "Non-existent Project",
      groupId: defaultGroupId,
    });

    expect(result.exists).toBe(false);
    expect(result.isId).toBe(false);
  });

  it("returns exists: true when project exists by name", async () => {
    // Create an project first
    const projectArgs = makeAddProjectArgs({ name: "Existing Project" });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const result = await checkProjectExists({
      name: projectArgs.name,
      groupId: defaultGroupId,
    });

    expect(result.exists).toBe(true);
    expect(result.isId).toBe(false);
  });

  it("returns exists: true and isId: true when project exists and isId matches", async () => {
    // Create an project first
    const projectArgs = makeAddProjectArgs({ name: "Test Project" });
    const createdProject = await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(createdProject.project).toBeDefined();

    const checkResult = await checkProjectExists({
      name: projectArgs.name,
      isId: createdProject.project.id,
      groupId: defaultGroupId,
    });

    expect(checkResult.exists).toBe(true);
    expect(checkResult.isId).toBe(true);
  });

  it("returns exists: true and isId: false when project exists but isId does not match", async () => {
    // Create an project first
    const projectArgs = makeAddProjectArgs({ name: "Test Project" });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const checkResult = await checkProjectExists({
      name: projectArgs.name,
      isId: "different-id",
      groupId: defaultGroupId,
    });

    expect(checkResult.exists).toBe(true);
    expect(checkResult.isId).toBe(false);
  });

  it("does not find project with same name in different group", async () => {
    // Create an project in one group
    const projectArgs = makeAddProjectArgs({
      name: "Shared Name Project",
      orgId: "group-1",
    });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Check for project with same name in different group
    const result = await checkProjectExists({
      name: projectArgs.name,
      groupId: "group-2",
    });

    expect(result.exists).toBe(false);
    expect(result.isId).toBe(false);
  });

  it("finds project with same name in correct group", async () => {
    // Create an project in one group
    const projectArgs = makeAddProjectArgs({
      name: "Shared Name Project",
      orgId: "group-1",
    });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Check for project with same name in correct group
    const result = await checkProjectExists({
      name: projectArgs.name,
      groupId: "group-1",
    });

    expect(result.exists).toBe(true);
    expect(result.isId).toBe(false);
  });

  it("handles case-sensitive name matching", async () => {
    // Create an project with specific case
    const projectArgs = makeAddProjectArgs({ name: "TestProject" });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Check with same case
    const result = await checkProjectExists({
      name: projectArgs.name,
      groupId: defaultGroupId,
    });

    expect(result.exists).toBe(true);
    expect(result.isId).toBe(false);
  });

  it("handles projects with special characters in names", async () => {
    // Create an project with special characters
    const projectArgs = makeAddProjectArgs({
      name: "Project with special chars: !@#$%^&*()",
    });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Check for project with special characters
    const result = await checkProjectExists({
      name: projectArgs.name,
      groupId: defaultGroupId,
    });

    expect(result.exists).toBe(true);
    expect(result.isId).toBe(false);
  });

  it("handles projects with very long names", async () => {
    const longName = "A".repeat(1000);

    // Create an project with long name
    const projectArgs = makeAddProjectArgs({ name: longName });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Check for project with long name
    const result = await checkProjectExists({
      name: projectArgs.name,
      groupId: defaultGroupId,
    });

    expect(result.exists).toBe(true);
    expect(result.isId).toBe(false);
  });

  it("handles projects with empty string names", async () => {
    // Create an project with empty name
    const projectArgs = makeAddProjectArgs({ name: "" });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Check for project with empty name
    const result = await checkProjectExists({
      name: projectArgs.name,
      groupId: defaultGroupId,
    });

    expect(result.exists).toBe(true);
    expect(result.isId).toBe(false);
  });

  it("handles multiple projects with same name in different groups", async () => {
    // Create projects with same name in different groups
    const project1Args = makeAddProjectArgs({
      name: "Shared Name",
      orgId: "group-1",
    });
    const project2Args = makeAddProjectArgs({
      name: "Shared Name",
      orgId: "group-2",
    });

    await addProject({
      args: project1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addProject({
      args: project2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Check for project in group-1
    const result1 = await checkProjectExists({
      name: project1Args.name,
      groupId: "group-1",
    });

    expect(result1.exists).toBe(true);
    expect(result1.isId).toBe(false);

    // Check for project in group-2
    const result2 = await checkProjectExists({
      name: project2Args.name,
      groupId: "group-2",
    });

    expect(result2.exists).toBe(true);
    expect(result2.isId).toBe(false);
  });

  it("handles projects created by different users", async () => {
    // Create an project by a specific user
    const projectArgs = makeAddProjectArgs({ name: "User Project" });
    await addProject({
      args: projectArgs,
      by: "user1",
      byType: "user",
      storage,
    });

    // Check for project (should find it regardless of creator)
    const result = await checkProjectExists({
      name: "User Project",
      groupId: defaultGroupId,
    });

    expect(result.exists).toBe(true);
    expect(result.isId).toBe(false);
  });

  it("handles concurrent project creation and checking", async () => {
    // Create multiple projects concurrently
    const promises = Array.from({ length: 5 }, (_, i) =>
      addProject({
        args: makeAddProjectArgs({ name: `Concurrent Project ${i}` }),
        by: defaultBy,
        byType: defaultByType,
        storage,
      })
    );

    await Promise.all(promises);

    // Check for each project
    const checkPromises = Array.from({ length: 5 }, (_, i) =>
      checkProjectExists({
        name: `Concurrent Project ${i}`,
        groupId: defaultGroupId,
      })
    );

    const results = await Promise.all(checkPromises);

    results.forEach((result) => {
      expect(result.exists).toBe(true);
      expect(result.isId).toBe(false);
    });
  });
});

describe("checkProjectAvailable integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    // Test will use the default storage type from createDefaultStorage()
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    // Clean up test data before each test using hard deletes for complete isolation
    try {
      await storage.bulkDelete({
        query: { projectId: kId0 },
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
        query: { projectId: kId0 },
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

  it("returns available: true when project does not exist", async () => {
    const result = await checkProjectAvailable({
      name: "Non-existent Project",
      groupId: defaultGroupId,
    });

    expect(result.available).toBe(true);
  });

  it("returns available: false when project exists", async () => {
    // Create an project first
    const projectArgs = makeAddProjectArgs({ name: "Existing Project" });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // checkProjectAvailable should throw an error when project exists
    await expect(
      checkProjectAvailable({
        name: projectArgs.name,
        groupId: defaultGroupId,
      })
    ).rejects.toThrow("Project already exists");
  });

  it("returns available: true when project does not exist", async () => {
    const result = await checkProjectAvailable({
      name: "Available Project",
      groupId: defaultGroupId,
    });

    expect(result.available).toBe(true);
  });

  it("does not find project with same name in different group", async () => {
    // Create an project in one group
    const projectArgs = makeAddProjectArgs({
      name: "Shared Name Project",
      orgId: "group-1",
    });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Check for project with same name in different group
    const result = await checkProjectAvailable({
      name: projectArgs.name,
      groupId: "group-2",
    });

    expect(result.available).toBe(true);
  });

  it("finds project with same name in correct group", async () => {
    // Create an project in one group
    const projectArgs = makeAddProjectArgs({
      name: "Shared Name Project",
      orgId: "group-1",
    });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Check for project with same name in correct group - should throw error
    await expect(
      checkProjectAvailable({
        name: projectArgs.name,
        groupId: "group-1",
      })
    ).rejects.toThrow("Project already exists");
  });

  it("handles case-sensitive name matching", async () => {
    // Create an project with specific case
    const projectArgs = makeAddProjectArgs({ name: "TestProject" });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Check with same case - should throw error
    await expect(
      checkProjectAvailable({
        name: projectArgs.name,
        groupId: defaultGroupId,
      })
    ).rejects.toThrow("Project already exists");
  });

  it("handles projects with special characters in names", async () => {
    // Create an project with special characters
    const projectArgs = makeAddProjectArgs({
      name: "Project with special chars: !@#$%^&*()",
    });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Check for project with special characters - should throw error
    await expect(
      checkProjectAvailable({
        name: projectArgs.name,
        groupId: defaultGroupId,
      })
    ).rejects.toThrow("Project already exists");
  });

  it("handles projects with very long names", async () => {
    const longName = "A".repeat(1000);

    // Create an project with long name
    const projectArgs = makeAddProjectArgs({ name: longName });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Check for project with long name - should throw error
    await expect(
      checkProjectAvailable({
        name: projectArgs.name,
        groupId: defaultGroupId,
      })
    ).rejects.toThrow("Project already exists");
  });

  it("handles projects with empty string names", async () => {
    // Create an project with empty name
    const projectArgs = makeAddProjectArgs({ name: "" });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Check for project with empty name - should throw error
    await expect(
      checkProjectAvailable({
        name: projectArgs.name,
        groupId: defaultGroupId,
      })
    ).rejects.toThrow("Project already exists");
  });
});

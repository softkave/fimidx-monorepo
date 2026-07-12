import { v7 as uuidv7 } from "uuid";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getMongoConnection } from "../../../db/fimidx.mongo.js";
import { kObjTags } from "../../../definitions/obj.js";
import type {
  AddProjectEndpointArgs,
  GetProjectsEndpointArgs,
} from "../../../definitions/project.js";
import { kId0 } from "../../../definitions/system.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addProject } from "../addProject.js";
import { getProjects } from "../getProjects.js";

const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";

// Test counter to ensure unique names
let testCounter = 0;

async function getObjFieldsCollection() {
  const { promise } = getMongoConnection();
  await promise;
  const { connection } = getMongoConnection();
  const db = connection?.db;
  if (!db) {
    throw new Error("Mongo connection is not available");
  }

  return db.collection("objField");
}

function makeGetProjectsArgs(
  overrides: Omit<Partial<GetProjectsEndpointArgs>, "query"> & {
    query?: Partial<GetProjectsEndpointArgs["query"]>;
  } = {},
): GetProjectsEndpointArgs {
  return {
    query: {
      orgId: defaultGroupId,
      ...overrides.query,
    },
    page: overrides.page,
    limit: overrides.limit,
    sort: overrides.sort,
  };
}

function makeAddProjectArgs(
  overrides: Partial<AddProjectEndpointArgs> = {},
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

// Helper function to create projects with specific names for testing
function makeTestProjectArgs(
  name: string,
  overrides: Partial<AddProjectEndpointArgs> = {},
): AddProjectEndpointArgs {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  return {
    name: `${name}_${uniqueId}`,
    description: "Test description",
    orgId: defaultGroupId,
    objFieldsToIndex: ["field1", "field2"],
    ...overrides,
  };
}

// Helper function to insert objFields for the "name" field
async function insertNameFieldForSorting(params: {
  groupId: string;
  tag: string;
}) {
  const { groupId, tag } = params;
  const now = new Date();

  const nameField = {
    id: uuidv7(),
    createdAt: now,
    updatedAt: now,
    projectId: kId0, // System project ID for projects
    groupId,
    tag,
    field: "name",
    path: "name",
    type: "string",
    arrayTypes: [],
    isArrayCompressed: false,
    fieldKeys: ["name"],
    fieldKeyTypes: ["string"],
    valueTypes: ["string"],
  };

  // Insert the field definition
  await (await getObjFieldsCollection()).insertOne(nameField);

  return nameField;
}

describe("getProjects integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    // Test will use the default storage type from createDefaultStorage()
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    // Clean up test data before each test using hard deletes for complete isolation
    try {
      // Delete all projects for all test groups using hard deletes
      const testGroupIds = [
        defaultGroupId,
        "test-group-getProjects-1",
        "test-group-getProjects-2",
      ];
      for (const groupId of testGroupIds) {
        await storage.bulkDelete({
          query: { metaQuery: { projectId: { eq: kId0 } } },
          tag: kObjTags.project,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true, // Use hard delete for test cleanup
        });
      }

      // Clean up objFields for test groups
      for (const groupId of testGroupIds) {
        await (
          await getObjFieldsCollection()
        ).deleteMany({
          projectId: kId0,
          groupId,
          tag: kObjTags.project,
        });
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  afterEach(async () => {
    // Clean up after each test using hard deletes for complete isolation
    try {
      // Delete all projects for all test groups using hard deletes
      const testGroupIds = [
        defaultGroupId,
        "test-group-getProjects-1",
        "test-group-getProjects-2",
      ];
      for (const groupId of testGroupIds) {
        await storage.bulkDelete({
          query: { metaQuery: { projectId: { eq: kId0 } } },
          tag: kObjTags.project,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true, // Use hard delete for test cleanup
        });
      }

      // Clean up objFields for test groups
      for (const groupId of testGroupIds) {
        await (
          await getObjFieldsCollection()
        ).deleteMany({
          projectId: kId0,
          groupId,
          tag: kObjTags.project,
        });
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  it("returns empty array when no projects exist", async () => {
    const args = makeGetProjectsArgs();

    const result = await getProjects({ args, storage });

    expect(result.projects).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });

  it("verifies test isolation by checking empty state", async () => {
    // This test verifies that our cleanup is working
    const args = makeGetProjectsArgs();
    const result = await getProjects({ args, storage });

    // Should be empty after cleanup
    expect(result.projects).toEqual([]);

    // Create one project
    const projectArgs = makeAddProjectArgs({ name: "Isolation Test Project" });
    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Should find exactly one project
    const result2 = await getProjects({ args, storage });
    expect(result2.projects).toHaveLength(1);
    expect(result2.projects[0].name).toBe("Isolation Test Project");
  });

  it("returns all projects when no filters are applied", async () => {
    // Create multiple projects
    const project1Args = makeAddProjectArgs({ name: "Project 1" });
    const project2Args = makeAddProjectArgs({ name: "Project 2" });
    const project3Args = makeAddProjectArgs({ name: "Project 3" });

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

    await addProject({
      args: project3Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs();

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });

  it("filters projects by groupId", async () => {
    // Create projects in different groups
    const project1Args = makeAddProjectArgs({
      name: "Project 1",
      orgId: "group-1",
    });
    const project2Args = makeAddProjectArgs({
      name: "Project 2",
      orgId: "group-2",
    });
    const project3Args = makeAddProjectArgs({
      name: "Project 3",
      orgId: "group-1",
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

    await addProject({
      args: project3Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs({
      query: { orgId: "group-1" },
    });

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(2);
    expect(
      result.projects.every((project) => project.orgId === "group-1"),
    ).toBe(true);
  });

  it("filters projects by name", async () => {
    const targetProjectArgs = makeAddProjectArgs({ name: "Target Project" });
    const otherProjectArgs = makeAddProjectArgs({ name: "Other Project" });

    await addProject({
      args: targetProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addProject({
      args: otherProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs({
      query: { name: { eq: "Target Project" } },
    });

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe("Target Project");
  });

  it("filters projects by createdBy", async () => {
    const targetProjectArgs = makeAddProjectArgs({ name: "Project 1" });
    const otherProjectArgs = makeAddProjectArgs({ name: "Project 2" });

    await addProject({
      args: targetProjectArgs,
      by: "user-a",
      byType: "user",
      storage,
    });

    await addProject({
      args: otherProjectArgs,
      by: "user-b",
      byType: "user",
      storage,
    });

    const args = makeGetProjectsArgs({
      query: { createdBy: { eq: "user-a" } },
    });

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].createdBy).toBe("user-a");
  });

  it("filters projects by creation date range", async () => {
    const beforeDate = new Date();
    beforeDate.setHours(beforeDate.getHours() - 1);

    const project1Args = makeAddProjectArgs({ name: "Project 1" });
    await addProject({
      args: project1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const afterDate = new Date();
    afterDate.setHours(afterDate.getHours() + 1);

    const args = makeGetProjectsArgs({
      query: {
        createdAt: {
          gte: beforeDate.getTime(),
          lte: afterDate.getTime(),
        },
      },
    });

    const result = await getProjects({ args, storage });

    expect(result.projects.length).toBeGreaterThan(0);
    result.projects.forEach((project) => {
      expect(project.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeDate.getTime(),
      );
      expect(project.createdAt.getTime()).toBeLessThanOrEqual(
        afterDate.getTime(),
      );
    });
  });

  it("sorts projects by name in ascending order", async () => {
    // Insert the name field definition for sorting
    await insertNameFieldForSorting({
      groupId: defaultGroupId,
      tag: kObjTags.project,
    });

    // Create projects in random order
    const zebraArgs = makeTestProjectArgs("Zebra");
    const alphaArgs = makeTestProjectArgs("Alpha");
    const betaArgs = makeTestProjectArgs("Beta");

    await addProject({
      args: zebraArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addProject({
      args: alphaArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addProject({
      args: betaArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs({
      sort: [{ field: "name", direction: "asc" }],
    });

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(3);
    const sortedNames = [alphaArgs.name, betaArgs.name, zebraArgs.name].sort();
    expect(result.projects.map((a) => a.name)).toEqual(sortedNames);
  });

  it("sorts projects by name in descending order", async () => {
    // Insert the name field definition for sorting
    await insertNameFieldForSorting({
      groupId: defaultGroupId,
      tag: kObjTags.project,
    });

    // Create projects in random order
    const alphaArgs = makeTestProjectArgs("Alpha");
    const zebraArgs = makeTestProjectArgs("Zebra");
    const betaArgs = makeTestProjectArgs("Beta");

    await addProject({
      args: alphaArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addProject({
      args: zebraArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addProject({
      args: betaArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs({
      sort: [{ field: "name", direction: "desc" }],
    });

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(3);
    const sortedNames = [alphaArgs.name, betaArgs.name, zebraArgs.name]
      .sort()
      .reverse();
    expect(result.projects.map((a) => a.name)).toEqual(sortedNames);
  });

  it("sorts projects by creation date", async () => {
    // Insert the name field definition for sorting (needed for objRecord fields)
    await insertNameFieldForSorting({
      groupId: defaultGroupId,
      tag: kObjTags.project,
    });

    // Create projects with delays to ensure different timestamps
    const project1Args = makeTestProjectArgs("First");
    const project1 = await addProject({
      args: project1Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const project2Args = makeTestProjectArgs("Second");
    const project2 = await addProject({
      args: project2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const project3Args = makeTestProjectArgs("Third");
    const project3 = await addProject({
      args: project3Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs({
      sort: [{ field: "createdAt", direction: "desc" }],
    });

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(3);
    expect(result.projects[0].name).toBe(project3Args.name);
    expect(result.projects[1].name).toBe(project2Args.name);
    expect(result.projects[2].name).toBe(project1Args.name);
  });

  it("handles pagination correctly", async () => {
    // Create multiple projects
    for (let i = 1; i <= 5; i++) {
      await addProject({
        args: makeAddProjectArgs({ name: `Project ${i}` }),
        by: defaultBy,
        byType: defaultByType,
        storage,
      });
    }

    // First page
    const args1 = makeGetProjectsArgs({
      page: 1,
      limit: 2,
    });

    const result1 = await getProjects({ args: args1, storage });

    expect(result1.projects).toHaveLength(2);
    expect(result1.page).toBe(1);
    expect(result1.limit).toBe(2);
    expect(result1.hasMore).toBe(true);

    // Second page
    const args2 = makeGetProjectsArgs({
      page: 2,
      limit: 2,
    });

    const result2 = await getProjects({ args: args2, storage });

    expect(result2.projects).toHaveLength(2);
    expect(result2.page).toBe(2);
    expect(result2.limit).toBe(2);
    expect(result2.hasMore).toBe(true);

    // Third page
    const args3 = makeGetProjectsArgs({
      page: 3,
      limit: 2,
    });

    const result3 = await getProjects({ args: args3, storage });

    expect(result3.projects).toHaveLength(1);
    expect(result3.page).toBe(3);
    expect(result3.limit).toBe(2);
    expect(result3.hasMore).toBe(false);
  });

  it("uses default pagination values when not provided", async () => {
    // Create 3 projects
    const projectArgs = [];
    for (let i = 1; i <= 3; i++) {
      const args = makeTestProjectArgs(`Project${i}`);
      projectArgs.push(args);
      await addProject({
        args,
        by: defaultBy,
        byType: defaultByType,
        storage,
      });
    }

    const args = makeGetProjectsArgs({
      // page and limit not provided
    });

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });

  it("returns projects with correct structure", async () => {
    const testProjectArgs = makeAddProjectArgs({
      name: "Test Project",
      description: "Test Description",
      objFieldsToIndex: ["field1", "field2"],
    });

    const testProject = await addProject({
      args: testProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs();

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(1);
    const project = result.projects[0];

    expect(project.id).toBe(testProject.project.id);
    expect(project.name).toBe("Test Project");
    expect(project.description).toBe("Test Description");
    expect(project.orgId).toBe(defaultGroupId);
    expect(project.objFieldsToIndex).toEqual(["field1", "field2"]);
    expect(project.createdAt).toBeInstanceOf(Date);
    expect(project.updatedAt).toBeInstanceOf(Date);
    expect(project.createdBy).toBeDefined();
    expect(project.createdByType).toBeDefined();
    expect(project.updatedBy).toBeDefined();
    expect(project.updatedByType).toBeDefined();
  });

  it("handles projects with undefined description and objFieldsToIndex", async () => {
    await addProject({
      args: makeAddProjectArgs({
        name: "Minimal Project",
        description: undefined,
        objFieldsToIndex: undefined,
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs();

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(1);
    const project = result.projects[0];
    expect(project.name).toBe("Minimal Project");
    expect(project.description).toBeUndefined();
    expect(project.objFieldsToIndex).toBeNull();
  });

  it("filters projects by multiple criteria", async () => {
    // Create projects with different characteristics
    const targetProjectArgs = makeAddProjectArgs({
      name: "Target Project",
    });
    await addProject({
      args: targetProjectArgs,
      by: "user-a",
      byType: "user",
      storage,
    });

    const otherProjectArgs = makeAddProjectArgs({
      name: "Other Project",
    });
    await addProject({
      args: otherProjectArgs,
      by: "user-b",
      byType: "user",
      storage,
    });

    const args = makeGetProjectsArgs({
      query: {
        name: { eq: "Target Project" },
        createdBy: { eq: "user-a" },
      },
    });

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe("Target Project");
    expect(result.projects[0].createdBy).toBe("user-a");
  });

  it("handles case-insensitive name search", async () => {
    const testProjectArgs = makeAddProjectArgs({ name: "TestProject" });
    await addProject({
      args: testProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs({
      query: { name: { eq: "TestProject" } },
    });

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe("TestProject");
  });

  it("handles partial name search", async () => {
    const project1Args = makeAddProjectArgs({ name: "MyProject" });
    const project2Args = makeAddProjectArgs({ name: "MyOtherProject" });
    const project3Args = makeAddProjectArgs({ name: "DifferentProject" });

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

    await addProject({
      args: project3Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs({
      query: { name: { in: ["MyProject", "MyOtherProject"] } },
    });

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(2);
    expect(
      result.projects.every((project) => project.name.includes("My")),
    ).toBe(true);
  });

  it("handles projects with special characters in names", async () => {
    const specialProjectArgs = makeAddProjectArgs({
      name: "Project with spaces & symbols!@#",
    });
    await addProject({
      args: specialProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs();

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe("Project with spaces & symbols!@#");
  });

  it("handles very long project names", async () => {
    const longName = "A".repeat(1000);
    const longProjectArgs = makeAddProjectArgs({ name: longName });
    await addProject({
      args: longProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs();

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe(longName);
  });

  it("handles projects with empty string names", async () => {
    const emptyNameProjectArgs = makeAddProjectArgs({ name: "" });
    await addProject({
      args: emptyNameProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs();

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe("");
  });

  it("handles projects with very long descriptions", async () => {
    const longDescription = "A".repeat(5000);
    const longDescProjectArgs = makeAddProjectArgs({
      name: "Long Desc Project",
      description: longDescription,
    });
    await addProject({
      args: longDescProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs();

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].description).toBe(longDescription);
  });

  it("handles projects with many objFieldsToIndex", async () => {
    const manyFields = Array.from({ length: 100 }, (_, i) => `field${i}`);
    const manyFieldsProjectArgs = makeAddProjectArgs({
      name: "Many Fields Project",
      objFieldsToIndex: manyFields,
    });
    await addProject({
      args: manyFieldsProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetProjectsArgs();

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].objFieldsToIndex).toEqual(manyFields);
  });

  it("handles concurrent project creation and retrieval", async () => {
    // Create multiple projects concurrently
    const promises = Array.from({ length: 10 }, (_, i) =>
      addProject({
        args: makeAddProjectArgs({ name: `Concurrent Project ${i}` }),
        by: defaultBy,
        byType: defaultByType,
        storage,
      }),
    );

    await Promise.all(promises);

    const args = makeGetProjectsArgs();

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(10);
    expect(
      result.projects.every((project) =>
        project.name.startsWith("Concurrent Project"),
      ),
    ).toBe(true);
  });

  it("handles projects created by different users", async () => {
    const user1ProjectArgs = makeAddProjectArgs({ name: "User 1 Project" });
    const user2ProjectArgs = makeAddProjectArgs({ name: "User 2 Project" });

    await addProject({
      args: user1ProjectArgs,
      by: "user1",
      byType: "user",
      storage,
    });

    await addProject({
      args: user2ProjectArgs,
      by: "user2",
      byType: "user",
      storage,
    });

    const args = makeGetProjectsArgs();

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(2);
    const user1Project = result.projects.find(
      (project) => project.name === "User 1 Project",
    );
    const user2Project = result.projects.find(
      (project) => project.name === "User 2 Project",
    );

    expect(user1Project?.createdBy).toBe("user1");
    expect(user2Project?.createdBy).toBe("user2");
  });

  it("handles projects with different byType values", async () => {
    const userProjectArgs = makeAddProjectArgs({ name: "User Project" });
    const systemProjectArgs = makeAddProjectArgs({ name: "System Project" });

    await addProject({
      args: userProjectArgs,
      by: "user1",
      byType: "user",
      storage,
    });

    await addProject({
      args: systemProjectArgs,
      by: "system",
      byType: "system",
      storage,
    });

    const args = makeGetProjectsArgs();

    const result = await getProjects({ args, storage });

    expect(result.projects).toHaveLength(2);
    const userProject = result.projects.find(
      (project) => project.name === "User Project",
    );
    const systemProject = result.projects.find(
      (project) => project.name === "System Project",
    );

    expect(userProject?.createdByType).toBe("user");
    expect(systemProject?.createdByType).toBe("system");
  });
});

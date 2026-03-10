import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { kObjTags } from "../../../definitions/obj.js";
import type {
  AddProjectEndpointArgs,
  UpdateProjectsEndpointArgs,
} from "../../../definitions/project.js";
import { kId0 } from "../../../definitions/system.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addProject } from "../addProject.js";
import { getProjects } from "../getProjects.js";
import { updateProjects } from "../updateProjects.js";

const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";

// Test counter to ensure unique names
let testCounter = 0;

function makeUpdateProjectsArgs(
  overrides: Omit<Partial<UpdateProjectsEndpointArgs>, "query" | "update"> & {
    query?: Partial<UpdateProjectsEndpointArgs["query"]>;
    update?: Partial<UpdateProjectsEndpointArgs["update"]>;
  } = {}
): UpdateProjectsEndpointArgs {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  const { query: overridesQuery, update: overridesUpdate, ...restOverrides } =
    overrides;
  return {
    query: {
      orgId: defaultGroupId,
      ...overridesQuery,
    },
    update: {
      name: `Updated Project Name ${uniqueId}`,
      ...overridesUpdate,
    },
    ...restOverrides,
  };
}

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

describe("updateProjects integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    // Test will use the default storage type from createDefaultStorage()
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    // Clean up test data before each test using hard deletes for complete isolation
    try {
      await storage.bulkDelete({
        query: { metaQuery: { projectId: { eq: kId0 } } },
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
        query: { metaQuery: { projectId: { eq: kId0 } } },
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

  it("updates a single project by name", async () => {
    const testProjectArgs = makeAddProjectArgs({
      name: "Original Project Name",
      description: "Original description",
    });

    const testProject = await addProject({
      args: testProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeUpdateProjectsArgs({
      query: {
        orgId: defaultGroupId,
        name: { eq: "Original Project Name" },
      },
      update: {
        name: "Updated Project Name",
        description: "Updated description",
      },
    });

    await updateProjects({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const result = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe("Updated Project Name");
    expect(result.projects[0].description).toBe("Updated description");
    expect(result.projects[0].updatedBy).toBe(defaultBy);
    expect(result.projects[0].updatedByType).toBe(defaultByType);
  });

  it("updates only specified fields", async () => {
    const testProjectArgs = makeAddProjectArgs({
      name: "Partial Update Project",
      description: "Original description",
      objFieldsToIndex: ["field1", "field2"],
    });

    const testProject = await addProject({
      args: testProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeUpdateProjectsArgs({
      query: {
        orgId: defaultGroupId,
        name: { eq: "Partial Update Project" },
      },
      update: {
        name: "Only Name Updated",
      },
    });

    await updateProjects({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only name was updated
    const result = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe("Only Name Updated");
    expect(result.projects[0].description).toBe("Original description");
    expect(result.projects[0].objFieldsToIndex).toEqual(["field1", "field2"]);
  });

  it("updates multiple projects when query matches multiple", async () => {
    const project1Args = makeAddProjectArgs({
      name: "Project 1",
      orgId: "group-1",
    });
    const project2Args = makeAddProjectArgs({
      name: "Project 2",
      orgId: "group-1",
    });
    const project3Args = makeAddProjectArgs({
      name: "Project 3",
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

    await addProject({
      args: project3Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeUpdateProjectsArgs({
      query: {
        orgId: "group-1",
      },
      update: {
        description: "Updated for group-1",
      },
      updateMany: true,
    });

    await updateProjects({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify updates
    const result = await getProjects({
      args: {
        query: { orgId: "group-1" },
      },
      storage,
    });

    expect(result.projects).toHaveLength(2);
    result.projects.forEach((project) => {
      expect(project.description).toBe("Updated for group-1");
      expect(project.orgId).toBe("group-1");
    });

    // Verify project in group-2 was not updated
    const group2Result = await getProjects({
      args: {
        query: { orgId: "group-2" },
      },
      storage,
    });

    expect(group2Result.projects).toHaveLength(1);
    expect(group2Result.projects[0].description).toBe("Test description");
  });

  it("updates projects by ID", async () => {
    const testProjectArgs = makeAddProjectArgs({
      name: "ID Update Project",
    });

    const testProject = await addProject({
      args: testProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeUpdateProjectsArgs({
      query: {
        id: { eq: testProject.project.id },
      },
      update: {
        name: "Updated by ID",
        description: "Updated via ID query",
      },
    });

    await updateProjects({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const result = await getProjects({
      args: {
        query: { orgId: defaultGroupId, id: { eq: testProject.project.id } },
      },
      storage,
    });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe("Updated by ID");
    expect(result.projects[0].description).toBe("Updated via ID query");
  });

  it("updates projects by creation date range", async () => {
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

    const project2Args = makeAddProjectArgs({ name: "Project 2" });
    await addProject({
      args: project2Args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeUpdateProjectsArgs({
      query: {
        createdAt: {
          gte: beforeDate.getTime(),
          lte: afterDate.getTime(),
        },
      },
      update: {
        description: "Updated by date range",
      },
      updateMany: true,
    });

    await updateProjects({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify updates
    const result = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });

    expect(result.projects).toHaveLength(2);
    result.projects.forEach((project) => {
      expect(project.description).toBe("Updated by date range");
    });
  });

  it("updates projects by createdBy", async () => {
    const project1Args = makeAddProjectArgs({ name: "User A Project" });
    await addProject({
      args: project1Args,
      by: "user-a",
      byType: "user",
      storage,
    });

    const project2Args = makeAddProjectArgs({ name: "User B Project" });
    await addProject({
      args: project2Args,
      by: "user-b",
      byType: "user",
      storage,
    });

    const args = makeUpdateProjectsArgs({
      query: {
        createdBy: { eq: "user-a" },
      },
      update: {
        description: "Updated for user-a",
      },
      updateMany: true,
    });

    await updateProjects({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify updates
    const result = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });

    const userAProject = result.projects.find(
      (project) => project.name === "User A Project"
    );
    const userBProject = result.projects.find(
      (project) => project.name === "User B Project"
    );

    expect(userAProject?.description).toBe("Updated for user-a");
    expect(userBProject?.description).toBe("Test description");
  });

  it("handles updating objFieldsToIndex", async () => {
    const testProjectArgs = makeAddProjectArgs({
      name: "Fields Update Project",
      objFieldsToIndex: ["field1", "field2"],
    });

    const testProject = await addProject({
      args: testProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeUpdateProjectsArgs({
      query: {
        name: { eq: "Fields Update Project" },
      },
      update: {
        objFieldsToIndex: ["field3", "field4", "field5"],
      },
    });

    await updateProjects({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const result = await getProjects({
      args: {
        query: {
          orgId: defaultGroupId,
          name: { eq: "Fields Update Project" },
        },
      },
      storage,
    });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].objFieldsToIndex).toEqual([
      "field3",
      "field4",
      "field5",
    ]);
  });

  it("handles updating with null objFieldsToIndex", async () => {
    const testProjectArgs = makeAddProjectArgs({
      name: "Null Fields Project",
      objFieldsToIndex: ["field1", "field2"],
    });

    const testProject = await addProject({
      args: testProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeUpdateProjectsArgs({
      query: {
        name: { eq: "Null Fields Project" },
      },
      update: {
        objFieldsToIndex: null,
      },
    });

    await updateProjects({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const result = await getProjects({
      args: {
        query: {
          orgId: defaultGroupId,
          name: { eq: "Null Fields Project" },
        },
      },
      storage,
    });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].objFieldsToIndex).toBeNull();
  });

  it("handles updating with empty objFieldsToIndex array", async () => {
    const testProjectArgs = makeAddProjectArgs({
      name: "Empty Fields Project",
      objFieldsToIndex: ["field1", "field2"],
    });

    const testProject = await addProject({
      args: testProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeUpdateProjectsArgs({
      query: {
        name: { eq: "Empty Fields Project" },
      },
      update: {
        objFieldsToIndex: [],
      },
    });

    await updateProjects({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update - empty arrays should be converted to null
    const result = await getProjects({
      args: {
        query: {
          orgId: defaultGroupId,
          name: { eq: "Empty Fields Project" },
        },
      },
      storage,
    });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].objFieldsToIndex).toBeNull();
  });

  it("handles updating with duplicate objFieldsToIndex values", async () => {
    const testProjectArgs = makeAddProjectArgs({
      name: "Duplicate Fields Project",
      objFieldsToIndex: ["field1", "field2"],
    });

    const testProject = await addProject({
      args: testProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeUpdateProjectsArgs({
      query: {
        name: { eq: "Duplicate Fields Project" },
      },
      update: {
        objFieldsToIndex: ["field1", "field1", "field2", "field2"],
      },
    });

    await updateProjects({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update - duplicates should be deduplicated
    const result = await getProjects({
      args: {
        query: {
          orgId: defaultGroupId,
          name: { eq: "Duplicate Fields Project" },
        },
      },
      storage,
    });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].objFieldsToIndex).toEqual(["field1", "field2"]);
  });

  it("handles updating projects with special characters", async () => {
    const testProjectArgs = makeAddProjectArgs({
      name: "Special Chars Project",
      description: "Original description",
    });

    const testProject = await addProject({
      args: testProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeUpdateProjectsArgs({
      query: {
        name: { eq: "Special Chars Project" },
      },
      update: {
        name: "Updated with special chars: !@#$%^&*()",
        description: "Updated with emojis 🚀 and symbols ©®™",
      },
    });

    await updateProjects({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const result = await getProjects({
      args: {
        query: {
          orgId: defaultGroupId,
          name: { eq: "Updated with special chars: !@#$%^&*()" },
        },
      },
      storage,
    });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe(
      "Updated with special chars: !@#$%^&*()"
    );
    expect(result.projects[0].description).toBe(
      "Updated with emojis 🚀 and symbols ©®™"
    );
  });

  it("handles updating projects with very long values", async () => {
    const testProjectArgs = makeAddProjectArgs({
      name: "Long Values Project",
      description: "Original description",
    });

    const testProject = await addProject({
      args: testProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const longName = "A".repeat(1000);
    const longDescription = "B".repeat(2000);

    const args = makeUpdateProjectsArgs({
      query: {
        name: { eq: "Long Values Project" },
      },
      update: {
        name: longName,
        description: longDescription,
      },
    });

    await updateProjects({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const result = await getProjects({
      args: {
        query: {
          orgId: defaultGroupId,
          name: { eq: longName },
        },
      },
      storage,
    });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe(longName);
    expect(result.projects[0].description).toBe(longDescription);
  });

  it("handles updating projects with many objFieldsToIndex", async () => {
    const testProjectArgs = makeAddProjectArgs({
      name: "Many Fields Project",
      objFieldsToIndex: ["field1", "field2"],
    });

    const testProject = await addProject({
      args: testProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const manyFields = Array.from({ length: 100 }, (_, i) => `field${i}`);

    const args = makeUpdateProjectsArgs({
      query: {
        name: { eq: "Many Fields Project" },
      },
      update: {
        objFieldsToIndex: manyFields,
      },
    });

    await updateProjects({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const result = await getProjects({
      args: {
        query: {
          orgId: defaultGroupId,
          name: { eq: "Many Fields Project" },
        },
      },
      storage,
    });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].objFieldsToIndex).toEqual(manyFields);
  });

  it("handles updating projects with empty string values", async () => {
    const testProjectArgs = makeAddProjectArgs({
      name: "Empty String Project",
      description: "Original description",
    });

    const testProject = await addProject({
      args: testProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeUpdateProjectsArgs({
      query: {
        name: { eq: "Empty String Project" },
      },
      update: {
        name: "",
        description: "",
      },
    });

    await updateProjects({
      args,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const result = await getProjects({
      args: {
        query: {
          orgId: defaultGroupId,
          name: { eq: "" },
        },
      },
      storage,
    });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe("");
    expect(result.projects[0].description).toBe("");
  });

  it("handles updating projects created by different users", async () => {
    const project1Args = makeAddProjectArgs({ name: "User A Project" });
    await addProject({
      args: project1Args,
      by: "user-a",
      byType: "user",
      storage,
    });

    const project2Args = makeAddProjectArgs({ name: "User B Project" });
    await addProject({
      args: project2Args,
      by: "user-b",
      byType: "user",
      storage,
    });

    const args = makeUpdateProjectsArgs({
      query: {
        createdBy: { eq: "user-a" },
      },
      update: {
        description: "Updated by user-a",
      },
      updateMany: true,
    });

    await updateProjects({
      args,
      by: "updater",
      byType: "system",
      storage,
    });

    // Verify updates
    const result = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });

    const userAProject = result.projects.find(
      (project) => project.name === "User A Project"
    );
    const userBProject = result.projects.find(
      (project) => project.name === "User B Project"
    );

    expect(userAProject?.description).toBe("Updated by user-a");
    expect(userAProject?.updatedBy).toBe("updater");
    expect(userAProject?.updatedByType).toBe("system");
    expect(userBProject?.description).toBe("Test description");
  });

  it("handles concurrent updates", async () => {
    const testProjectArgs = makeAddProjectArgs({
      name: "Concurrent Update Project",
      description: "Original description",
    });

    const testProject = await addProject({
      args: testProjectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const promises = Array.from({ length: 5 }, (_, i) =>
      updateProjects({
        args: makeUpdateProjectsArgs({
          query: {
            name: { eq: "Concurrent Update Project" },
          },
          update: {
            description: `Update ${i}`,
          },
        }),
        by: `updater-${i}`,
        byType: "user",
        storage,
      })
    );

    await Promise.all(promises);

    // Verify the final state
    const result = await getProjects({
      args: {
        query: {
          orgId: defaultGroupId,
          name: { eq: "Concurrent Update Project" },
        },
      },
      storage,
    });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].description).toBeDefined();
    expect(result.projects[0].updatedBy).toMatch(/updater-\d/);
  });
});

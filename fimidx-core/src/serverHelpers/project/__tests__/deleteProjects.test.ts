import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { kObjTags } from "../../../definitions/obj.js";
import type {
  AddProjectEndpointArgs,
  DeleteProjectsEndpointArgs,
} from "../../../definitions/project.js";
import { kId0 } from "../../../definitions/system.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addProject } from "../addProject.js";
import { deleteProjects } from "../deleteProjects.js";
import { getProjects } from "../getProjects.js";

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

function makeDeleteProjectsArgs(
  overrides: Omit<Partial<DeleteProjectsEndpointArgs>, "query"> & {
    query?: Partial<DeleteProjectsEndpointArgs["query"]>;
  } = {}
): DeleteProjectsEndpointArgs {
  return {
    query: {
      orgId: defaultGroupId,
      ...overrides.query,
    },
    deleteMany: overrides.deleteMany,
  };
}

describe("deleteProjects integration", () => {
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

  it("deletes a single project by id", async () => {
    // Create an project first
    const projectArgs = makeAddProjectArgs({ name: "Project to Delete" });
    const createdProject = await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(createdProject.project).toBeDefined();

    // Verify project exists before deletion
    const projectsBefore = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsBefore.projects).toHaveLength(1);

    // Delete the project
    await deleteProjects({
      ...makeDeleteProjectsArgs({
        query: {
          orgId: defaultGroupId,
          id: { eq: createdProject.project.id },
        },
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify project is deleted
    const projectsAfter = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsAfter.projects).toHaveLength(0);
  });

  it("deletes multiple projects by name", async () => {
    // Create multiple projects
    const project1Args = makeAddProjectArgs({ name: "First Project" });
    const project2Args = makeAddProjectArgs({ name: "Second Project" });
    const project3Args = makeAddProjectArgs({ name: "Third Project" });

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

    // Verify projects exist before deletion
    const projectsBefore = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsBefore.projects).toHaveLength(3);

    // Delete projects by name pattern
    await deleteProjects({
      ...makeDeleteProjectsArgs({
        query: {
          orgId: defaultGroupId,
          name: { in: ["First Project", "Second Project"] },
        },
        deleteMany: true,
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only specified projects are deleted
    const projectsAfter = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsAfter.projects).toHaveLength(1);
    expect(projectsAfter.projects[0].name).toBe("Third Project");
  });

  it("deletes projects by groupId", async () => {
    // Create projects in different groups
    const project1Args = makeAddProjectArgs({
      name: "Group 1 Project",
      orgId: "group-1",
    });
    const project2Args = makeAddProjectArgs({
      name: "Group 1 Project 2",
      orgId: "group-1",
    });
    const project3Args = makeAddProjectArgs({
      name: "Group 2 Project",
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

    // Verify projects exist before deletion
    const projectsBefore = await getProjects({
      args: {
        query: { orgId: "group-1" },
      },
      storage,
    });
    expect(projectsBefore.projects).toHaveLength(2);

    // Delete projects in group-1
    await deleteProjects({
      ...makeDeleteProjectsArgs({
        query: {
          orgId: "group-1",
        },
        deleteMany: true,
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify group-1 projects are deleted
    const group1ProjectsAfter = await getProjects({
      args: {
        query: { orgId: "group-1" },
      },
      storage,
    });
    expect(group1ProjectsAfter.projects).toHaveLength(0);

    // Verify group-2 project still exists
    const group2ProjectsAfter = await getProjects({
      args: {
        query: { orgId: "group-2" },
      },
      storage,
    });
    expect(group2ProjectsAfter.projects).toHaveLength(1);
    expect(group2ProjectsAfter.projects[0].name).toBe("Group 2 Project");
  });

  it("deletes projects by creation date range", async () => {
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

    // Verify projects exist before deletion
    const projectsBefore = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsBefore.projects).toHaveLength(2);

    // Delete projects by date range
    await deleteProjects({
      ...makeDeleteProjectsArgs({
        query: {
          createdAt: {
            gte: beforeDate.getTime(),
            lte: afterDate.getTime(),
          },
        },
        deleteMany: true,
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify projects are deleted
    const projectsAfter = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsAfter.projects).toHaveLength(0);
  });

  it("deletes projects by createdBy", async () => {
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

    // Verify projects exist before deletion
    const projectsBefore = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsBefore.projects).toHaveLength(2);

    // Delete projects by user-a
    await deleteProjects({
      ...makeDeleteProjectsArgs({
        query: {
          createdBy: { eq: "user-a" },
        },
        deleteMany: true,
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only user-a project is deleted
    const projectsAfter = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsAfter.projects).toHaveLength(1);
    expect(projectsAfter.projects[0].name).toBe("User B Project");
    expect(projectsAfter.projects[0].createdBy).toBe("user-b");
  });

  it("deletes projects with special characters in names", async () => {
    const projectArgs = makeAddProjectArgs({
      name: "Project with special chars: !@#$%^&*()",
      description: "Description with emojis 🚀 and symbols ©®™",
    });

    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify project exists before deletion
    const projectsBefore = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsBefore.projects).toHaveLength(1);

    // Delete the project
    await deleteProjects({
      ...makeDeleteProjectsArgs({
        query: {
          orgId: defaultGroupId,
          name: { eq: "Project with special chars: !@#$%^&*()" },
        },
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify project is deleted
    const projectsAfter = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsAfter.projects).toHaveLength(0);
  });

  it("deletes projects with very long names and descriptions", async () => {
    const longName = "A".repeat(1000);
    const longDescription = "B".repeat(2000);

    const projectArgs = makeAddProjectArgs({
      name: longName,
      description: longDescription,
    });

    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify project exists before deletion
    const projectsBefore = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsBefore.projects).toHaveLength(1);

    // Delete the project
    await deleteProjects({
      ...makeDeleteProjectsArgs({
        query: {
          orgId: defaultGroupId,
          name: { eq: longName },
        },
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify project is deleted
    const projectsAfter = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsAfter.projects).toHaveLength(0);
  });

  it("deletes projects with many objFieldsToIndex", async () => {
    const manyFields = Array.from({ length: 100 }, (_, i) => `field${i}`);

    const projectArgs = makeAddProjectArgs({
      name: "Many Fields Project",
      objFieldsToIndex: manyFields,
    });

    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify project exists before deletion
    const projectsBefore = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsBefore.projects).toHaveLength(1);

    // Delete the project
    await deleteProjects({
      ...makeDeleteProjectsArgs({
        query: {
          orgId: defaultGroupId,
          name: { eq: "Many Fields Project" },
        },
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify project is deleted
    const projectsAfter = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsAfter.projects).toHaveLength(0);
  });

  it("deletes projects with empty string names", async () => {
    const projectArgs = makeAddProjectArgs({ name: "" });

    await addProject({
      args: projectArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify project exists before deletion
    const projectsBefore = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsBefore.projects).toHaveLength(1);

    // Delete the project
    await deleteProjects({
      ...makeDeleteProjectsArgs({
        query: {
          orgId: defaultGroupId,
          name: { eq: "" },
        },
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify project is deleted
    const projectsAfter = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsAfter.projects).toHaveLength(0);
  });

  it("handles deleting non-existent projects gracefully", async () => {
    // Try to delete a non-existent project
    await deleteProjects({
      ...makeDeleteProjectsArgs({
        query: {
          orgId: defaultGroupId,
          name: { eq: "Non-existent Project" },
        },
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Should not throw an error
    const projectsAfter = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsAfter.projects).toHaveLength(0);
  });

  it("handles deleting projects with different byType values", async () => {
    const project1Args = makeAddProjectArgs({ name: "User Project" });
    await addProject({
      args: project1Args,
      by: "user1",
      byType: "user",
      storage,
    });

    const project2Args = makeAddProjectArgs({ name: "System Project" });
    await addProject({
      args: project2Args,
      by: "system",
      byType: "system",
      storage,
    });

    // Verify projects exist before deletion
    const projectsBefore = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsBefore.projects).toHaveLength(2);

    // Delete projects by user-a
    await deleteProjects({
      ...makeDeleteProjectsArgs({
        query: {
          createdBy: { eq: "user1" },
        },
        deleteMany: true,
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only user project is deleted
    const projectsAfter = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsAfter.projects).toHaveLength(1);
    expect(projectsAfter.projects[0].name).toBe("System Project");
    expect(projectsAfter.projects[0].createdBy).toBe("system");
  });

  it("handles concurrent deletions", async () => {
    const project1Args = makeAddProjectArgs({ name: "Concurrent Project 1" });
    const project2Args = makeAddProjectArgs({ name: "Concurrent Project 2" });
    const project3Args = makeAddProjectArgs({ name: "Concurrent Project 3" });

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

    // Verify projects exist before deletion
    const projectsBefore = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsBefore.projects).toHaveLength(3);

    // Delete projects concurrently
    const promises = [
      deleteProjects({
        ...makeDeleteProjectsArgs({
          query: {
            name: { eq: "Concurrent Project 1" },
          },
        }),
        by: "deleter-1",
        byType: "user",
        storage,
      }),
      deleteProjects({
        ...makeDeleteProjectsArgs({
          query: {
            name: { eq: "Concurrent Project 2" },
          },
        }),
        by: "deleter-2",
        byType: "user",
        storage,
      }),
      deleteProjects({
        ...makeDeleteProjectsArgs({
          query: {
            name: { eq: "Concurrent Project 3" },
          },
        }),
        by: "deleter-3",
        byType: "user",
        storage,
      }),
    ];

    await Promise.all(promises);

    // Verify all projects are deleted
    const projectsAfter = await getProjects({
      args: {
        query: { orgId: defaultGroupId },
      },
      storage,
    });
    expect(projectsAfter.projects).toHaveLength(0);
  });

  it("handles deleting projects across different groups", async () => {
    const project1Args = makeAddProjectArgs({
      name: "Cross Group Project 1",
      orgId: "group-1",
    });
    const project2Args = makeAddProjectArgs({
      name: "Cross Group Project 2",
      orgId: "group-2",
    });
    const project3Args = makeAddProjectArgs({
      name: "Cross Group Project 3",
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

    // Verify projects exist before deletion
    const group1ProjectsBefore = await getProjects({
      args: {
        query: { orgId: "group-1" },
      },
      storage,
    });
    expect(group1ProjectsBefore.projects).toHaveLength(2);

    const group2ProjectsBefore = await getProjects({
      args: {
        query: { orgId: "group-2" },
      },
      storage,
    });
    expect(group2ProjectsBefore.projects).toHaveLength(1);

    // Delete projects in group-1
    await deleteProjects({
      ...makeDeleteProjectsArgs({
        query: {
          orgId: "group-1",
        },
        deleteMany: true,
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify group-1 projects are deleted
    const group1ProjectsAfter = await getProjects({
      args: {
        query: { orgId: "group-1" },
      },
      storage,
    });
    expect(group1ProjectsAfter.projects).toHaveLength(0);

    // Verify group-2 project still exists
    const group2ProjectsAfter = await getProjects({
      args: {
        query: { orgId: "group-2" },
      },
      storage,
    });
    expect(group2ProjectsAfter.projects).toHaveLength(1);
    expect(group2ProjectsAfter.projects[0].name).toBe("Cross Group Project 2");
  });
});

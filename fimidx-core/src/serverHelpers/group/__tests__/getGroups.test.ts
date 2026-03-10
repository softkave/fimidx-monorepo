import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, objFields as objFieldsTable } from "../../../db/fimidx.sqlite.js";
import type { GetGroupsEndpointArgs } from "../../../definitions/group.js";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addGroup } from "../addGroup.js";
import { getGroups } from "../getGroups.js";

const defaultProjectId = "test-project-getGroups";
const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";

// Test counter to ensure unique names
let testCounter = 0;

function makeGetGroupsArgs(
  overrides: Partial<GetGroupsEndpointArgs> = {}
): GetGroupsEndpointArgs {
  return {
    query: {
      projectId: defaultProjectId,
      ...overrides.query,
    },
    page: overrides.page,
    limit: overrides.limit,
    sort: overrides.sort,
  };
}

function makeAddGroupArgs(overrides: any = {}) {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  return {
    name: `Test Group ${uniqueId}`,
    description: "Test description",
    projectId: defaultProjectId,
    ...overrides,
  };
}

// Helper function to create groups with specific names for testing
function makeTestGroupArgs(name: string, overrides: any = {}) {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  return {
    name: `${name}_${uniqueId}`,
    description: "Test description",
    projectId: defaultProjectId,
    ...overrides,
  };
}

// Helper function to insert objFields for the "name" field
async function insertNameFieldForSorting(params: {
  projectId: string;
  groupId: string;
  tag: string;
}) {
  const { projectId, groupId, tag } = params;
  const now = new Date();

  const nameField = {
    id: uuidv7(),
    createdAt: now,
    updatedAt: now,
    projectId,
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
  await db.insert(objFieldsTable).values(nameField);

  return nameField;
}

describe("getGroups integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    // Test will use the default storage type from createDefaultStorage()
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    // Clean up test data before each test using hard deletes for complete isolation
    try {
      // Delete all groups for all test projects using hard deletes
      const testProjectIds = [
        defaultProjectId,
        "test-project-getGroups-1",
        "test-project-getGroups-2",
      ];
      for (const projectId of testProjectIds) {
        await storage.bulkDelete({
          query: { metaQuery: { projectId: { eq: projectId } } },
          tag: kObjTags.group,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true, // Use hard delete for test cleanup
        });
      }

      // Clean up objFields for test projects
      for (const projectId of testProjectIds) {
        await db
          .delete(objFieldsTable)
          .where(
            and(
              eq(objFieldsTable.projectId, projectId),
              eq(objFieldsTable.tag, kObjTags.group)
            )
          );
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  afterEach(async () => {
    // Clean up after each test using hard deletes for complete isolation
    try {
      // Delete all groups for all test projects using hard deletes
      const testProjectIds = [
        defaultProjectId,
        "test-project-getGroups-1",
        "test-project-getGroups-2",
      ];

      for (const projectId of testProjectIds) {
        await storage.bulkDelete({
          query: { metaQuery: { projectId: { eq: projectId } } },
          tag: kObjTags.group,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true, // Use hard delete for test cleanup
        });
      }

      // Clean up objFields for test projects
      for (const projectId of testProjectIds) {
        await db
          .delete(objFieldsTable)
          .where(
            and(
              eq(objFieldsTable.projectId, projectId),
              eq(objFieldsTable.tag, kObjTags.group)
            )
          );
      }
    } catch (error) {
      console.error(error);
      // Ignore errors in cleanup
    }
  });

  it("returns empty array when no groups exist", async () => {
    const args = makeGetGroupsArgs();

    const result = await getGroups({ args, storage });

    expect(result.groups).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });

  it("verifies test isolation by checking empty state", async () => {
    // This test verifies that our cleanup is working
    const args = makeGetGroupsArgs();
    const result = await getGroups({ args, storage });

    // Should be empty after cleanup
    expect(result.groups).toEqual([]);

    // Create one group
    const groupArgs = makeAddGroupArgs({ name: "Isolation Test Group" });
    await addGroup({
      args: groupArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    // Should find exactly one group
    const result2 = await getGroups({ args, storage });
    expect(result2.groups).toHaveLength(1);
    expect(result2.groups[0].name).toBe("Isolation Test Group");
  });

  it("retrieves all groups in an project", async () => {
    // Create multiple groups
    const group1 = await addGroup({
      args: makeAddGroupArgs({ name: "First Group" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const group2 = await addGroup({
      args: makeAddGroupArgs({ name: "Second Group" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const group3 = await addGroup({
      args: makeAddGroupArgs({ name: "Third Group" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs();

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);

    const groupNames = result.groups.map((g) => g.name).sort();
    expect(groupNames).toEqual(["First Group", "Second Group", "Third Group"]);
  });

  it("filters groups by name", async () => {
    // Create groups with different names
    await addGroup({
      args: makeAddGroupArgs({ name: "Alpha Group" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: makeAddGroupArgs({ name: "Beta Group" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: makeAddGroupArgs({ name: "Gamma Group" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
        name: { eq: "Beta Group" },
      },
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].name).toBe("Beta Group");
  });

  it("filters groups by name using in operator", async () => {
    // Create groups with different names
    const alphaGroupArgs = makeTestGroupArgs("Alpha");
    const betaGroupArgs = makeTestGroupArgs("Beta");
    const gammaGroupArgs = makeTestGroupArgs("Gamma");

    const alphaGroup = await addGroup({
      args: alphaGroupArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const betaGroup = await addGroup({
      args: betaGroupArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const gammaGroup = await addGroup({
      args: gammaGroupArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    // First, let's verify all groups exist
    const allGroups = await getGroups({
      args: makeGetGroupsArgs(),
      storage,
    });

    const args = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
        name: { in: [alphaGroupArgs.name, betaGroupArgs.name] }, // Use in operator to match specific names
      },
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(2);
    const groupNames = result.groups.map((g) => g.name).sort();
    expect(groupNames).toEqual(
      [alphaGroupArgs.name, betaGroupArgs.name].sort()
    );
  });

  it("filters groups by createdBy", async () => {
    // Create groups with different creators
    await addGroup({
      args: makeAddGroupArgs({ name: "Group by User A" }),
      by: "user-a",
      byType: "user",
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: makeAddGroupArgs({ name: "Group by User B" }),
      by: "user-b",
      byType: "user",
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: makeAddGroupArgs({ name: "Another Group by User A" }),
      by: "user-a",
      byType: "user",
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
        createdBy: { eq: "user-a" },
      },
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(2);
    expect(result.groups.every((g) => g.createdBy === "user-a")).toBe(true);
  });

  it("filters groups by meta fields", async () => {
    // Create groups with different meta data
    await addGroup({
      args: makeAddGroupArgs({
        name: "Group with Meta A",
        meta: { category: "important", priority: "high" },
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: makeAddGroupArgs({
        name: "Group with Meta B",
        meta: { category: "important", priority: "low" },
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: makeAddGroupArgs({
        name: "Group with Meta C",
        meta: { category: "unimportant", priority: "high" },
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
        meta: [
          {
            op: "eq",
            field: "category",
            value: "important",
          },
        ],
      },
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(2);
    expect(result.groups.every((g) => g.meta?.category === "important")).toBe(
      true
    );
  });

  it("filters groups by multiple meta fields", async () => {
    // Create groups with different meta data
    const groupAArgs = makeTestGroupArgs("GroupA", {
      meta: { category: "important", priority: "high" },
    });
    const groupBArgs = makeTestGroupArgs("GroupB", {
      meta: { category: "important", priority: "low" },
    });
    const groupCArgs = makeTestGroupArgs("GroupC", {
      meta: { category: "unimportant", priority: "high" },
    });

    await addGroup({
      args: groupAArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: groupBArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: groupCArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
        meta: [
          {
            op: "eq",
            field: "category",
            value: "important",
          },
          {
            op: "eq",
            field: "priority",
            value: "high",
          },
        ],
      },
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].meta?.category).toBe("important");
    expect(result.groups[0].meta?.priority).toBe("high");
  });

  it("filters groups by date range", async () => {
    // Create groups at different times
    const group1 = await addGroup({
      args: makeAddGroupArgs({ name: "Old Group" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    // Wait a bit to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    const group2 = await addGroup({
      args: makeAddGroupArgs({ name: "New Group" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
        createdAt: { gt: group1.group.createdAt.getTime() },
      },
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].name).toBe("New Group");
  });

  it("filters groups by id", async () => {
    const group1 = await addGroup({
      args: makeAddGroupArgs({ name: "Target Group" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: makeAddGroupArgs({ name: "Other Group" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
        id: { eq: group1.group.id },
      },
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].id).toBe(group1.group.id);
    expect(result.groups[0].name).toBe("Target Group");
  });

  it("handles pagination correctly", async () => {
    // Create 5 groups
    for (let i = 1; i <= 5; i++) {
      await addGroup({
        args: makeAddGroupArgs({ name: `Group ${i}` }),
        by: defaultBy,
        byType: defaultByType,
        groupId: defaultGroupId,
        storage,
      });
    }

    // First page with limit 2
    const args1 = makeGetGroupsArgs({
      page: 1,
      limit: 2,
    });

    const result1 = await getGroups({ args: args1, storage });

    expect(result1.groups).toHaveLength(2);
    expect(result1.hasMore).toBe(true);
    expect(result1.page).toBe(1);
    expect(result1.limit).toBe(2);

    // Second page with limit 2
    const args2 = makeGetGroupsArgs({
      page: 2,
      limit: 2,
    });

    const result2 = await getGroups({ args: args2, storage });

    expect(result2.groups).toHaveLength(2);
    expect(result2.hasMore).toBe(true);
    expect(result2.page).toBe(2);
    expect(result2.limit).toBe(2);

    // Third page with limit 2
    const args3 = makeGetGroupsArgs({
      page: 3,
      limit: 2,
    });

    const result3 = await getGroups({ args: args3, storage });

    expect(result3.groups).toHaveLength(1);
    expect(result3.hasMore).toBe(false);
    expect(result3.page).toBe(3);
    expect(result3.limit).toBe(2);
  });

  it("sorts groups by name in ascending order", async () => {
    // Insert the name field definition for sorting
    await insertNameFieldForSorting({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      tag: kObjTags.group,
    });

    // Create groups in random order
    const zebraArgs = makeTestGroupArgs("Zebra");
    const alphaArgs = makeTestGroupArgs("Alpha");
    const betaArgs = makeTestGroupArgs("Beta");

    await addGroup({
      args: zebraArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: alphaArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: betaArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs({
      sort: [{ field: "name", direction: "asc" }],
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(3);
    const sortedNames = [alphaArgs.name, betaArgs.name, zebraArgs.name].sort();
    expect(result.groups.map((g) => g.name)).toEqual(sortedNames);
  });

  it("sorts groups by name in descending order", async () => {
    // Insert the name field definition for sorting
    await insertNameFieldForSorting({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      tag: kObjTags.group,
    });

    // Create groups in random order
    const alphaArgs = makeTestGroupArgs("Alpha");
    const zebraArgs = makeTestGroupArgs("Zebra");
    const betaArgs = makeTestGroupArgs("Beta");

    await addGroup({
      args: alphaArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: zebraArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: betaArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs({
      sort: [{ field: "name", direction: "desc" }],
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(3);
    const sortedNames = [alphaArgs.name, betaArgs.name, zebraArgs.name]
      .sort()
      .reverse();
    expect(result.groups.map((g) => g.name)).toEqual(sortedNames);
  });

  it("sorts groups by creation date", async () => {
    // Insert the name field definition for sorting (needed for objRecord fields)
    await insertNameFieldForSorting({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      tag: kObjTags.group,
    });

    // Create groups with delays to ensure different timestamps
    const group1Args = makeTestGroupArgs("First");
    const group1 = await addGroup({
      args: group1Args,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const group2Args = makeTestGroupArgs("Second");
    const group2 = await addGroup({
      args: group2Args,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const group3Args = makeTestGroupArgs("Third");
    const group3 = await addGroup({
      args: group3Args,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs({
      sort: [{ field: "createdAt", direction: "desc" }],
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(3);
    expect(result.groups[0].name).toBe(group3Args.name);
    expect(result.groups[1].name).toBe(group2Args.name);
    expect(result.groups[2].name).toBe(group1Args.name);
  });

  it("uses default pagination values when not provided", async () => {
    // Create 3 groups
    const groupArgs = [];
    for (let i = 1; i <= 3; i++) {
      const args = makeTestGroupArgs(`Group${i}`);
      groupArgs.push(args);
      await addGroup({
        args,
        by: defaultBy,
        byType: defaultByType,
        groupId: defaultGroupId,
        storage,
      });
    }

    const args = makeGetGroupsArgs({
      // page and limit not provided
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });

  it("filters groups by multiple criteria", async () => {
    // Create groups with different characteristics
    const targetGroupArgs = makeTestGroupArgs("Target", {
      meta: { category: "important", priority: "high" },
    });
    await addGroup({
      args: targetGroupArgs,
      by: "user-a",
      byType: "user",
      groupId: defaultGroupId,
      storage,
    });

    const otherGroupArgs = makeTestGroupArgs("Other", {
      meta: { category: "important", priority: "low" },
    });
    await addGroup({
      args: otherGroupArgs,
      by: "user-a",
      byType: "user",
      groupId: defaultGroupId,
      storage,
    });

    const targetGroup2Args = makeTestGroupArgs("Target2", {
      meta: { category: "unimportant", priority: "high" },
    });
    await addGroup({
      args: targetGroup2Args,
      by: "user-b",
      byType: "user",
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
        name: { eq: targetGroupArgs.name },
        createdBy: { eq: "user-a" },
        meta: [
          {
            op: "eq",
            field: "category",
            value: "important",
          },
        ],
      },
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].name).toBe(targetGroupArgs.name);
    expect(result.groups[0].createdBy).toBe("user-a");
    expect(result.groups[0].meta?.category).toBe("important");
  });

  it("handles groups with empty meta fields", async () => {
    await addGroup({
      args: makeAddGroupArgs({
        name: "Group with Meta",
        meta: { key: "value" },
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: makeAddGroupArgs({
        name: "Group without Meta",
        meta: undefined,
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
        meta: [
          {
            op: "eq",
            field: "key",
            value: "value",
          },
        ],
      },
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].name).toBe("Group with Meta");
  });

  it("handles groups with empty description", async () => {
    const groupWithDescArgs = makeTestGroupArgs("GroupWithDesc", {
      description: "Some description",
    });
    await addGroup({
      args: groupWithDescArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const groupWithoutDescArgs = makeTestGroupArgs("GroupWithoutDesc", {
      description: undefined,
    });
    await addGroup({
      args: groupWithoutDescArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    // Query for all groups in the project to verify both exist
    const args = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
      },
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(2);
    expect(
      result.groups.find((g) => g.name === groupWithDescArgs.name)?.description
    ).toBe("Some description");
    expect(
      result.groups.find((g) => g.name === groupWithoutDescArgs.name)
        ?.description
    ).toBeUndefined();
  });

  it("filters groups by updatedBy", async () => {
    // Create groups with different updaters
    const groupAArgs = makeTestGroupArgs("GroupByUserA");
    await addGroup({
      args: groupAArgs,
      by: "user-a",
      byType: "user",
      groupId: defaultGroupId,
      storage,
    });

    const groupBArgs = makeTestGroupArgs("GroupByUserB");
    await addGroup({
      args: groupBArgs,
      by: "user-b",
      byType: "user",
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
        updatedBy: { eq: "user-a" },
      },
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].updatedBy).toBe("user-a");
  });

  it("filters groups by updatedAt date range", async () => {
    // Create groups at different times
    const group1Args = makeTestGroupArgs("Old");
    const group1 = await addGroup({
      args: group1Args,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const group2Args = makeTestGroupArgs("New");
    const group2 = await addGroup({
      args: group2Args,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
        updatedAt: { gte: group2.group.updatedAt.getTime() },
      },
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].name).toBe(group2Args.name);
  });

  it("handles complex meta queries with different operators", async () => {
    // Create groups with different meta data
    const groupAArgs = makeTestGroupArgs("GroupA", {
      meta: { priority: "high", count: 10 },
    });
    await addGroup({
      args: groupAArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const groupBArgs = makeTestGroupArgs("GroupB", {
      meta: { priority: "medium", count: 5 },
    });
    await addGroup({
      args: groupBArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const groupCArgs = makeTestGroupArgs("GroupC", {
      meta: { priority: "low", count: 15 },
    });
    await addGroup({
      args: groupCArgs,
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    // Query for groups with priority not equal to "low" AND count greater than "5"
    const args = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
        meta: [
          {
            op: "neq",
            field: "priority",
            value: "low",
          },
          {
            op: "gt",
            field: "count",
            value: 5,
          },
        ],
      },
    });

    const result = await getGroups({ args, storage });

    // Should return Group A (high priority, count 10) and Group C (low priority, count 15)
    // But since we're filtering for priority != "low" AND count > "5", only Group A should match
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].name).toBe(groupAArgs.name);
    expect(result.groups[0].meta?.priority).toBe("high");
    expect(result.groups[0].meta?.count).toBe(10);
  });

  it("returns correct group structure", async () => {
    const group = await addGroup({
      args: makeAddGroupArgs({
        name: "Test Group",
        description: "Test description",
        meta: { key: "value" },
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
        id: { eq: group.group.id },
      },
    });

    const result = await getGroups({ args, storage });

    expect(result.groups).toHaveLength(1);
    const retrievedGroup = result.groups[0];

    expect(retrievedGroup.id).toBe(group.group.id);
    expect(retrievedGroup.name).toBe("Test Group");
    expect(retrievedGroup.description).toBe("Test description");
    expect(retrievedGroup.meta).toEqual({ key: "value" });
    expect(retrievedGroup.projectId).toBe(defaultProjectId);
    expect(retrievedGroup.groupId).toBe(defaultGroupId);
    expect(retrievedGroup.createdBy).toBe(defaultBy);
    expect(retrievedGroup.createdByType).toBe(defaultByType);
    expect(retrievedGroup.updatedBy).toBe(defaultBy);
    expect(retrievedGroup.updatedByType).toBe(defaultByType);
    expect(retrievedGroup.createdAt).toBeInstanceOf(Date);
    expect(retrievedGroup.updatedAt).toBeInstanceOf(Date);
  });

  it("handles groups across different projects", async () => {
    // Create groups in different projects
    await addGroup({
      args: makeAddGroupArgs({
        name: "Group in Project 1",
        projectId: "test-project-getGroups-1",
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: makeAddGroupArgs({
        name: "Group in Project 2",
        projectId: "test-project-getGroups-2",
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addGroup({
      args: makeAddGroupArgs({
        name: "Group in Default Project",
        projectId: defaultProjectId,
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    // Query for groups in project-1
    const args1 = makeGetGroupsArgs({
      query: {
        projectId: "test-project-getGroups-1",
      },
    });

    const result1 = await getGroups({ args: args1, storage });

    expect(result1.groups).toHaveLength(1);
    expect(result1.groups[0].name).toBe("Group in Project 1");
    expect(result1.groups[0].projectId).toBe("test-project-getGroups-1");

    // Query for groups in project-2
    const args2 = makeGetGroupsArgs({
      query: {
        projectId: "test-project-getGroups-2",
      },
    });

    const result2 = await getGroups({ args: args2, storage });

    expect(result2.groups).toHaveLength(1);
    expect(result2.groups[0].name).toBe("Group in Project 2");
    expect(result2.groups[0].projectId).toBe("test-project-getGroups-2");

    // Query for groups in default project
    const args3 = makeGetGroupsArgs({
      query: {
        projectId: defaultProjectId,
      },
    });

    const result3 = await getGroups({ args: args3, storage });

    expect(result3.groups).toHaveLength(1);
    expect(result3.groups[0].name).toBe("Group in Default Project");
    expect(result3.groups[0].projectId).toBe(defaultProjectId);
  });
});

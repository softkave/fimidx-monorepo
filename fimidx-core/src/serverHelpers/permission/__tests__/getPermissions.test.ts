import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, objFields as objFieldsTable } from "../../../db/fimidx.sqlite.js";
import { kObjTags } from "../../../definitions/obj.js";
import type {
  AddPermissionsEndpointArgs,
  GetPermissionsEndpointArgs,
} from "../../../definitions/permission.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addPermissions } from "../addPermissions.js";
import { getPermissions } from "../getPermissions.js";

const defaultProjectId = "test-project-getPermissions";
const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";

// Test counter to ensure unique permissions
let testCounter = 0;

function makeAddPermissionsArgs(
  overrides: Partial<AddPermissionsEndpointArgs> = {}
): AddPermissionsEndpointArgs {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  return {
    projectId: defaultProjectId,
    permissions: [
      {
        entity: "user",
        action: "read",
        target: "document",
        description: "Test permission",
        meta: { key: "value" },
      },
    ],
    ...overrides,
  };
}

function makeGetPermissionsArgs(
  overrides: Partial<GetPermissionsEndpointArgs> = {}
): GetPermissionsEndpointArgs {
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

// Helper function to insert objFields for the "action" field for sorting
async function insertActionFieldForSorting(params: {
  groupId: string;
  tag: string;
}) {
  const { groupId, tag } = params;
  const now = new Date();

  const actionField = {
    id: uuidv7(),
    createdAt: now,
    updatedAt: now,
    projectId: defaultProjectId,
    groupId,
    tag,
    field: "action",
    path: "action",
    type: "string",
    arrayTypes: [],
    isArrayCompressed: false,
    fieldKeys: ["action"],
    fieldKeyTypes: ["string"],
    valueTypes: ["string"],
  };

  // Insert the field definition
  await db.insert(objFieldsTable).values(actionField);

  return actionField;
}

describe("getPermissions integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    try {
      await storage.bulkDelete({
        query: { projectId: defaultProjectId },
        tag: kObjTags.permission,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true,
      });

      // Clean up objFields for test group
      await db
        .delete(objFieldsTable)
        .where(
          and(
            eq(objFieldsTable.projectId, defaultProjectId),
            eq(objFieldsTable.groupId, defaultGroupId),
            eq(objFieldsTable.tag, kObjTags.permission)
          )
        );
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  afterEach(async () => {
    try {
      await storage.bulkDelete({
        query: { projectId: defaultProjectId },
        tag: kObjTags.permission,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true,
      });

      // Clean up objFields for test group
      await db
        .delete(objFieldsTable)
        .where(
          and(
            eq(objFieldsTable.projectId, defaultProjectId),
            eq(objFieldsTable.groupId, defaultGroupId),
            eq(objFieldsTable.tag, kObjTags.permission)
          )
        );
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  it("returns empty array when no permissions exist", async () => {
    const args = makeGetPermissionsArgs();

    const result = await getPermissions({
      args,
      storage,
    });

    expect(result.permissions).toEqual([]);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.hasMore).toBe(false);
  });

  it("retrieves all permissions for an project", async () => {
    // Create test permissions
    const addArgs1 = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
          description: "Read permission",
        },
        {
          entity: "user",
          action: "write",
          target: "document",
          description: "Write permission",
        },
      ],
    });

    await addPermissions({
      args: addArgs1,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetPermissionsArgs();

    const result = await getPermissions({
      args,
      storage,
    });

    expect(result.permissions).toHaveLength(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.hasMore).toBe(false);

    const readPermission = result.permissions.find((p) => p.action === "read");
    const writePermission = result.permissions.find(
      (p) => p.action === "write"
    );

    expect(readPermission).toBeDefined();
    expect(writePermission).toBeDefined();
    expect(readPermission?.entity).toBe("user");
    expect(writePermission?.entity).toBe("user");
  });

  it("filters permissions by entity", async () => {
    // Create test permissions
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
        {
          entity: "admin",
          action: "delete",
          target: "document",
        },
      ],
    });

    await addPermissions({
      args: addArgs,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetPermissionsArgs({
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
    });

    const result = await getPermissions({
      args,
      storage,
    });

    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].entity).toBe("user");
    expect(result.permissions[0].action).toBe("read");
  });

  it("filters permissions by action", async () => {
    // Create test permissions
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
        {
          entity: "user",
          action: "write",
          target: "document",
        },
      ],
    });

    await addPermissions({
      args: addArgs,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetPermissionsArgs({
      query: {
        projectId: defaultProjectId,
        action: { eq: "write" },
      },
    });

    const result = await getPermissions({
      args,
      storage,
    });

    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].action).toBe("write");
  });

  it("filters permissions by target", async () => {
    // Create test permissions
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
        {
          entity: "user",
          action: "read",
          target: "image",
        },
      ],
    });

    await addPermissions({
      args: addArgs,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetPermissionsArgs({
      query: {
        projectId: defaultProjectId,
        target: { eq: "image" },
      },
    });

    const result = await getPermissions({
      args,
      storage,
    });

    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].target).toBe("image");
  });

  it("filters permissions by createdBy", async () => {
    // Create test permissions
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
    });

    await addPermissions({
      args: addArgs,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetPermissionsArgs({
      query: {
        projectId: defaultProjectId,
        createdBy: { eq: defaultBy },
      },
    });

    const result = await getPermissions({
      args,
      storage,
    });

    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].createdBy).toBe(defaultBy);
  });

  it("supports pagination", async () => {
    // Create multiple test permissions
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        { entity: "user1", action: "read", target: "doc1" },
        { entity: "user2", action: "read", target: "doc2" },
        { entity: "user3", action: "read", target: "doc3" },
        { entity: "user4", action: "read", target: "doc4" },
        { entity: "user5", action: "read", target: "doc5" },
      ],
    });

    await addPermissions({
      args: addArgs,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // First page
    const args1 = makeGetPermissionsArgs({
      page: 1,
      limit: 2,
    });

    const result1 = await getPermissions({
      args: args1,
      storage,
    });

    expect(result1.permissions).toHaveLength(2);
    expect(result1.page).toBe(1);
    expect(result1.limit).toBe(2);
    expect(result1.hasMore).toBe(true);

    // Second page
    const args2 = makeGetPermissionsArgs({
      page: 2,
      limit: 2,
    });

    const result2 = await getPermissions({
      args: args2,
      storage,
    });

    expect(result2.permissions).toHaveLength(2);
    expect(result2.page).toBe(2);
    expect(result2.limit).toBe(2);
    expect(result2.hasMore).toBe(true);

    // Third page
    const args3 = makeGetPermissionsArgs({
      page: 3,
      limit: 2,
    });

    const result3 = await getPermissions({
      args: args3,
      storage,
    });

    expect(result3.permissions).toHaveLength(1);
    expect(result3.page).toBe(3);
    expect(result3.limit).toBe(2);
    expect(result3.hasMore).toBe(false);
  });

  it("supports sorting", async () => {
    // Insert the action field definition for sorting
    await insertActionFieldForSorting({
      groupId: defaultGroupId,
      tag: kObjTags.permission,
    });

    // Create test permissions
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        { entity: "user", action: "write", target: "document" },
        { entity: "user", action: "read", target: "document" },
        { entity: "user", action: "delete", target: "document" },
      ],
    });

    await addPermissions({
      args: addArgs,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetPermissionsArgs({
      sort: [{ field: "action", direction: "asc" }],
    });

    const result = await getPermissions({
      args,
      storage,
    });

    expect(result.permissions).toHaveLength(3);
    expect(result.permissions[0].action).toBe("delete");
    expect(result.permissions[1].action).toBe("read");
    expect(result.permissions[2].action).toBe("write");
  });

  it("filters permissions with complex entity objects", async () => {
    // Create test permissions with complex entities
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: { type: "user", id: "123" },
          action: "read",
          target: "document",
        },
        {
          entity: { type: "admin", id: "456" },
          action: "delete",
          target: "document",
        },
      ],
    });

    await addPermissions({
      args: addArgs,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetPermissionsArgs({
      query: {
        projectId: defaultProjectId,
        entity: [{ op: "eq", field: "type", value: "user" }],
      },
    });

    const result = await getPermissions({
      args,
      storage,
    });

    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].entity).toEqual({ type: "user", id: "123" });
  });
});

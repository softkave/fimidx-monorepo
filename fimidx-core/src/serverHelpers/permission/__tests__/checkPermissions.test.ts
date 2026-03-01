import { and, eq } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, objFields as objFieldsTable } from "../../../db/fimidx.sqlite.js";
import { kObjTags } from "../../../definitions/obj.js";
import type {
  AddPermissionsEndpointArgs,
  CheckPermissionsEndpointArgs,
} from "../../../definitions/permission.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addPermissions } from "../addPermissions.js";
import { checkPermissions } from "../checkPermissions.js";

const defaultProjectId = "test-project-checkPermissions";
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

function makeCheckPermissionsArgs(
  overrides: Partial<CheckPermissionsEndpointArgs> = {}
): CheckPermissionsEndpointArgs {
  return {
    projectId: defaultProjectId,
    items: [
      {
        entity: "user",
        action: "read",
        target: "document",
      },
    ],
    ...overrides,
  };
}

describe("checkPermissions integration", () => {
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

  it("returns true for existing permission", async () => {
    // Create test permission
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
          description: "Test permission",
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

    // Check the permission
    const checkArgs = makeCheckPermissionsArgs({
      items: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
    });

    const result = await checkPermissions({
      args: checkArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].hasPermission).toBe(true);
  });

  it("returns false for non-existing permission", async () => {
    // Check non-existing permission
    const checkArgs = makeCheckPermissionsArgs({
      items: [
        {
          entity: "non-existent",
          action: "read",
          target: "document",
        },
      ],
    });

    const result = await checkPermissions({
      args: checkArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].hasPermission).toBe(false);
  });

  it("checks multiple permissions and returns correct results", async () => {
    // Create test permissions
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
          description: "User read permission",
        },
        {
          entity: "admin",
          action: "delete",
          target: "document",
          description: "Admin delete permission",
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

    // Check multiple permissions
    const checkArgs = makeCheckPermissionsArgs({
      items: [
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
        {
          entity: "guest",
          action: "write",
          target: "document",
        },
      ],
    });

    const result = await checkPermissions({
      args: checkArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.results).toHaveLength(3);
    expect(result.results[0].hasPermission).toBe(true); // user read
    expect(result.results[1].hasPermission).toBe(true); // admin delete
    expect(result.results[2].hasPermission).toBe(false); // guest write
  });

  it("checks permissions with complex entity objects", async () => {
    // Create test permission with complex entity
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: { type: "user", id: "123" },
          action: "read",
          target: "document",
          description: "Complex permission",
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

    // Check the complex permission
    const checkArgs = makeCheckPermissionsArgs({
      items: [
        {
          entity: { type: "user", id: "123" },
          action: "read",
          target: "document",
        },
      ],
    });

    const result = await checkPermissions({
      args: checkArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].hasPermission).toBe(true);
  });

  it("returns false for complex entity with different values", async () => {
    // Create test permission with complex entity
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: { type: "user", id: "123" },
          action: "read",
          target: "document",
          description: "Complex permission",
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

    // Check with different complex entity
    const checkArgs = makeCheckPermissionsArgs({
      items: [
        {
          entity: { type: "user", id: "456" }, // Different ID
          action: "read",
          target: "document",
        },
      ],
    });

    const result = await checkPermissions({
      args: checkArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].hasPermission).toBe(false);
  });

  it("checks permissions with complex action objects", async () => {
    // Create test permission with complex action
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: { operation: "read", scope: "document" },
          target: "document",
          description: "Complex action permission",
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

    // Check the complex action permission
    const checkArgs = makeCheckPermissionsArgs({
      items: [
        {
          entity: "user",
          action: { operation: "read", scope: "document" },
          target: "document",
        },
      ],
    });

    const result = await checkPermissions({
      args: checkArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].hasPermission).toBe(true);
  });

  it("checks permissions with complex target objects", async () => {
    // Create test permission with complex target
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: { resource: "document", id: "456" },
          description: "Complex target permission",
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

    // Check the complex target permission
    const checkArgs = makeCheckPermissionsArgs({
      items: [
        {
          entity: "user",
          action: "read",
          target: { resource: "document", id: "456" },
        },
      ],
    });

    const result = await checkPermissions({
      args: checkArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].hasPermission).toBe(true);
  });

  it("handles empty items array", async () => {
    const checkArgs = makeCheckPermissionsArgs({
      items: [],
    });

    const result = await checkPermissions({
      args: checkArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.results).toHaveLength(0);
  });

  it("checks permissions across different projects", async () => {
    // Create permissions in different projects
    const addArgs1 = makeAddPermissionsArgs({
      projectId: "project1",
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
    });

    const addArgs2 = makeAddPermissionsArgs({
      projectId: "project2",
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
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

    await addPermissions({
      args: addArgs2,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Check permissions in project1
    const checkArgs1 = makeCheckPermissionsArgs({
      projectId: "project1",
      items: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
    });

    const result1 = await checkPermissions({
      args: checkArgs1,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result1.results).toHaveLength(1);
    expect(result1.results[0].hasPermission).toBe(true);

    // Check permissions in project2
    const checkArgs2 = makeCheckPermissionsArgs({
      projectId: "project2",
      items: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
    });

    const result2 = await checkPermissions({
      args: checkArgs2,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result2.results).toHaveLength(1);
    expect(result2.results[0].hasPermission).toBe(true);

    // Check permissions in non-existent project
    const checkArgs3 = makeCheckPermissionsArgs({
      projectId: "non-existent",
      items: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
    });

    const result3 = await checkPermissions({
      args: checkArgs3,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result3.results).toHaveLength(1);
    expect(result3.results[0].hasPermission).toBe(false);
  });
});

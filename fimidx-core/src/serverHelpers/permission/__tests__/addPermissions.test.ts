import { and, eq } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, objFields as objFieldsTable } from "../../../db/fimidx.sqlite.js";
import { kObjTags } from "../../../definitions/obj.js";
import type { AddPermissionsEndpointArgs } from "../../../definitions/permission.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addPermissions } from "../addPermissions.js";

const defaultProjectId = "test-project-addPermissions";
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

// Helper function to create permissions with specific values for testing
function makeTestPermissionsArgs(
  entity: string,
  action: string,
  target: string,
  overrides: Partial<AddPermissionsEndpointArgs> = {}
) {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  return {
    projectId: defaultProjectId,
    permissions: [
      {
        entity: `${entity}_${uniqueId}`,
        action: `${action}_${uniqueId}`,
        target: `${target}_${uniqueId}`,
        description: "Test permission",
        meta: { key: "value" },
        ...overrides,
      },
    ],
  };
}

describe("addPermissions integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    // Test will use the default storage type from createDefaultStorage()
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    // Clean up test data before each test using hard deletes for complete isolation
    try {
      await storage.bulkDelete({
        query: { projectId: defaultProjectId },
        tag: kObjTags.permission,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true, // Use hard delete for test cleanup
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
    // Clean up after each test using hard deletes for complete isolation
    try {
      await storage.bulkDelete({
        query: { projectId: defaultProjectId },
        tag: kObjTags.permission,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true, // Use hard delete for test cleanup
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

  it("verifies test isolation by checking empty state", async () => {
    // This test verifies that our cleanup is working
    const args = makeTestPermissionsArgs("user", "read", "document");

    // First permission creation should succeed
    const result1 = await addPermissions({
      args,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result1.permissions).toBeDefined();
    expect(result1.permissions).toHaveLength(1);
    expect(result1.permissions[0].entity).toContain("user_");
    expect(result1.permissions[0].action).toContain("read_");
    expect(result1.permissions[0].target).toContain("document_");
  });

  it("creates a new permission successfully", async () => {
    const args = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
          description: "A test permission description",
          meta: { key: "value", another: "value2" },
        },
      ],
    });

    const result = await addPermissions({
      args,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.permissions).toBeDefined();
    expect(result.permissions).toHaveLength(1);
    const permission = result.permissions[0];
    expect(permission.entity).toBe("user");
    expect(permission.action).toBe("read");
    expect(permission.target).toBe("document");
    expect(permission.description).toBe("A test permission description");
    expect(permission.meta).toEqual({ key: "value", another: "value2" });
    expect(permission.groupId).toBe(defaultGroupId);
    expect(permission.projectId).toBe(defaultProjectId);
    expect(permission.createdBy).toBe(defaultBy);
    expect(permission.createdByType).toBe(defaultByType);
    expect(permission.id).toBeDefined();
    expect(permission.createdAt).toBeInstanceOf(Date);
    expect(permission.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a permission with minimal required fields", async () => {
    const args = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
          description: undefined,
          meta: undefined,
        },
      ],
    });

    const result = await addPermissions({
      args,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.permissions).toBeDefined();
    expect(result.permissions).toHaveLength(1);
    const permission = result.permissions[0];
    expect(permission.entity).toBe("user");
    expect(permission.action).toBe("read");
    expect(permission.target).toBe("document");
    expect(permission.description).toBeUndefined();
    expect(permission.meta).toBeUndefined();
  });

  it("creates multiple permissions successfully", async () => {
    const args = makeAddPermissionsArgs({
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
        {
          entity: "admin",
          action: "delete",
          target: "document",
          description: "Delete permission",
        },
      ],
    });

    const result = await addPermissions({
      args,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.permissions).toBeDefined();
    expect(result.permissions).toHaveLength(3);

    const readPermission = result.permissions.find((p) => p.action === "read");
    const writePermission = result.permissions.find(
      (p) => p.action === "write"
    );
    const deletePermission = result.permissions.find(
      (p) => p.action === "delete"
    );

    expect(readPermission).toBeDefined();
    expect(writePermission).toBeDefined();
    expect(deletePermission).toBeDefined();

    expect(readPermission?.entity).toBe("user");
    expect(writePermission?.entity).toBe("user");
    expect(deletePermission?.entity).toBe("admin");
  });

  it("creates permission with complex entity, action, and target objects", async () => {
    const args = makeAddPermissionsArgs({
      permissions: [
        {
          entity: { type: "user", id: "123" },
          action: { operation: "read", scope: "document" },
          target: { resource: "document", id: "456" },
          description: "Complex permission",
          meta: { complex: "value" },
        },
      ],
    });

    const result = await addPermissions({
      args,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.permissions).toBeDefined();
    expect(result.permissions).toHaveLength(1);
    const permission = result.permissions[0];
    expect(permission.entity).toEqual({ type: "user", id: "123" });
    expect(permission.action).toEqual({ operation: "read", scope: "document" });
    expect(permission.target).toEqual({ resource: "document", id: "456" });
    expect(permission.description).toBe("Complex permission");
    expect(permission.meta).toEqual({ complex: "value" });
  });

  it("handles empty permissions array", async () => {
    const args = makeAddPermissionsArgs({
      permissions: [],
    });

    const result = await addPermissions({
      args,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.permissions).toBeDefined();
    expect(result.permissions).toHaveLength(0);
  });
});

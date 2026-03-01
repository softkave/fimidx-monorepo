import { and, eq } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, objFields as objFieldsTable } from "../../../db/fimidx.sqlite.js";
import { kObjTags } from "../../../definitions/obj.js";
import type {
  AddPermissionsEndpointArgs,
  UpdatePermissionsEndpointArgs,
} from "../../../definitions/permission.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addPermissions } from "../addPermissions.js";
import { getPermissions } from "../getPermissions.js";
import { updatePermissions } from "../updatePermissions.js";

const defaultProjectId = "test-project-updatePermissions";
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

function makeUpdatePermissionsArgs(
  overrides: Partial<UpdatePermissionsEndpointArgs> = {}
): UpdatePermissionsEndpointArgs {
  return {
    query: {
      projectId: defaultProjectId,
      ...overrides.query,
    },
    update: {
      ...overrides.update,
    },
    updateMany: overrides.updateMany,
  };
}

describe("updatePermissions integration", () => {
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

  it("updates a single permission by entity", async () => {
    // Create test permission
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
          description: "Original description",
          meta: { original: "value" },
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

    // Update the permission
    const updateArgs = makeUpdatePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
      update: {
        description: "Updated description",
        meta: { updated: "value" },
      },
    });

    await updatePermissions({
      args: updateArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const getArgs = {
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
    };

    const result = await getPermissions({
      args: getArgs,
      storage,
    });

    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].description).toBe("Updated description");
    expect(result.permissions[0].meta).toEqual({ updated: "value" });
    expect(result.permissions[0].entity).toBe("user"); // Should remain unchanged
    expect(result.permissions[0].action).toBe("read"); // Should remain unchanged
    expect(result.permissions[0].target).toBe("document"); // Should remain unchanged
  });

  it("updates permission entity", async () => {
    // Create test permission
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

    // Update the entity
    const updateArgs = makeUpdatePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
      update: {
        entity: "admin",
      },
    });

    await updatePermissions({
      args: updateArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const getArgs = {
      query: {
        projectId: defaultProjectId,
        entity: { eq: "admin" },
      },
    };

    const result = await getPermissions({
      args: getArgs,
      storage,
    });

    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].entity).toBe("admin");
  });

  it("updates permission action", async () => {
    // Create test permission
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

    // Update the action
    const updateArgs = makeUpdatePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        action: { eq: "read" },
      },
      update: {
        action: "write",
      },
    });

    await updatePermissions({
      args: updateArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const getArgs = {
      query: {
        projectId: defaultProjectId,
        action: { eq: "write" },
      },
    };

    const result = await getPermissions({
      args: getArgs,
      storage,
    });

    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].action).toBe("write");
  });

  it("updates permission target", async () => {
    // Create test permission
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

    // Update the target
    const updateArgs = makeUpdatePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        target: { eq: "document" },
      },
      update: {
        target: "image",
      },
    });

    await updatePermissions({
      args: updateArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const getArgs = {
      query: {
        projectId: defaultProjectId,
        target: { eq: "image" },
      },
    };

    const result = await getPermissions({
      args: getArgs,
      storage,
    });

    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].target).toBe("image");
  });

  it("updates multiple permissions when updateMany is true", async () => {
    // Create multiple test permissions
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
          description: "Original 1",
        },
        {
          entity: "user",
          action: "write",
          target: "document",
          description: "Original 2",
        },
        {
          entity: "admin",
          action: "delete",
          target: "document",
          description: "Original 3",
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

    // Update all user permissions
    const updateArgs = makeUpdatePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
      update: {
        description: "Updated for all users",
      },
      updateMany: true,
    });

    await updatePermissions({
      args: updateArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the updates
    const getArgs = {
      query: {
        projectId: defaultProjectId,
      },
    };

    const result = await getPermissions({
      args: getArgs,
      storage,
    });

    expect(result.permissions).toHaveLength(3);

    const userPermissions = result.permissions.filter(
      (p) => p.entity === "user"
    );
    const adminPermission = result.permissions.find(
      (p) => p.entity === "admin"
    );

    expect(userPermissions).toHaveLength(2);
    userPermissions.forEach((permission) => {
      expect(permission.description).toBe("Updated for all users");
    });

    expect(adminPermission?.description).toBe("Original 3"); // Should remain unchanged
  });

  it("updates only one permission when updateMany is false", async () => {
    // Create multiple test permissions
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
          description: "Original 1",
        },
        {
          entity: "user",
          action: "write",
          target: "document",
          description: "Original 2",
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

    // Update only one permission
    const updateArgs = makeUpdatePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
      update: {
        description: "Updated single",
      },
      updateMany: false,
    });

    await updatePermissions({
      args: updateArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only one was updated
    const getArgs = {
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
    };

    const result = await getPermissions({
      args: getArgs,
      storage,
    });

    expect(result.permissions).toHaveLength(2);

    const updatedCount = result.permissions.filter(
      (p) => p.description === "Updated single"
    ).length;
    const originalCount = result.permissions.filter(
      (p) => p.description === "Original 1" || p.description === "Original 2"
    ).length;

    expect(updatedCount).toBe(1);
    expect(originalCount).toBe(1);
  });

  it("updates complex entity, action, and target objects", async () => {
    // Create test permission with complex objects
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: { type: "user", id: "123" },
          action: { operation: "read", scope: "document" },
          target: { resource: "document", id: "456" },
          description: "Original",
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

    // Update with new complex objects
    const updateArgs = makeUpdatePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        entity: [{ op: "eq" as const, field: "type", value: "user" }],
      },
      update: {
        entity: { type: "admin", id: "789" },
        action: { operation: "write", scope: "all" },
        target: { resource: "all", id: "999" },
        description: "Updated complex",
      },
    });

    await updatePermissions({
      args: updateArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const getArgs = {
      query: {
        projectId: defaultProjectId,
        entity: [{ op: "eq" as const, field: "type", value: "admin" }],
      },
    };

    const result = await getPermissions({
      args: getArgs,
      storage,
    });

    expect(result.permissions).toHaveLength(1);
    const permission = result.permissions[0];
    expect(permission.entity).toEqual({ type: "admin", id: "789" });
    expect(permission.action).toEqual({ operation: "write", scope: "all" });
    expect(permission.target).toEqual({ resource: "all", id: "999" });
    expect(permission.description).toBe("Updated complex");
  });

  it("updates meta field", async () => {
    // Create test permission
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
          meta: { original: "value" },
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

    // Update meta
    const updateArgs = makeUpdatePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
      update: {
        meta: { updated: "value", new: "field" },
      },
    });

    await updatePermissions({
      args: updateArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify the update
    const getArgs = {
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
    };

    const result = await getPermissions({
      args: getArgs,
      storage,
    });

    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].meta).toEqual({
      updated: "value",
      new: "field",
    });
  });
});

import { and, eq } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, objFields as objFieldsTable } from "../../../db/fimidx.postgres.js";
import { kObjTags } from "../../../definitions/obj.js";
import type {
  AddPermissionsEndpointArgs,
  DeletePermissionsEndpointArgs,
} from "../../../definitions/permission.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addPermissions } from "../addPermissions.js";
import { deletePermissions } from "../deletePermissions.js";
import { getPermissions } from "../getPermissions.js";

const defaultProjectId = "test-project-deletePermissions";
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

function makeDeletePermissionsArgs(
  overrides: Partial<DeletePermissionsEndpointArgs> = {}
): DeletePermissionsEndpointArgs {
  return {
    query: {
      projectId: defaultProjectId,
      ...overrides.query,
    },
    deleteMany: overrides.deleteMany,
  };
}

describe("deletePermissions integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    try {
      await storage.bulkDelete({
        query: { metaQuery: { projectId: { eq: defaultProjectId } } },
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
        query: { metaQuery: { projectId: { eq: defaultProjectId } } },
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

  it("deletes a single permission by entity", async () => {
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

    // Verify permission exists
    const getArgsBefore = {
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
    };

    const resultBefore = await getPermissions({
      args: getArgsBefore,
      storage,
    });

    expect(resultBefore.permissions).toHaveLength(1);

    // Delete the permission
    const deleteArgs = makeDeletePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
      deleteMany: false,
    });

    await deletePermissions({
      ...deleteArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify permission is deleted
    const getArgsAfter = {
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
    };

    const resultAfter = await getPermissions({
      args: getArgsAfter,
      storage,
    });

    expect(resultAfter.permissions).toHaveLength(0);
  });

  it("deletes a single permission by action", async () => {
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

    // Delete the permission
    const deleteArgs = makeDeletePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        action: { eq: "read" },
      },
      deleteMany: false,
    });

    await deletePermissions({
      ...deleteArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify permission is deleted
    const getArgsAfter = {
      query: {
        projectId: defaultProjectId,
        action: { eq: "read" },
      },
    };

    const resultAfter = await getPermissions({
      args: getArgsAfter,
      storage,
    });

    expect(resultAfter.permissions).toHaveLength(0);
  });

  it("deletes a single permission by target", async () => {
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

    // Delete the permission
    const deleteArgs = makeDeletePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        target: { eq: "document" },
      },
      deleteMany: false,
    });

    await deletePermissions({
      ...deleteArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify permission is deleted
    const getArgsAfter = {
      query: {
        projectId: defaultProjectId,
        target: { eq: "document" },
      },
    };

    const resultAfter = await getPermissions({
      args: getArgsAfter,
      storage,
    });

    expect(resultAfter.permissions).toHaveLength(0);
  });

  it("deletes multiple permissions when deleteMany is true", async () => {
    // Create multiple test permissions
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
          description: "User read permission",
        },
        {
          entity: "user",
          action: "write",
          target: "document",
          description: "User write permission",
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

    // Verify all permissions exist
    const getArgsBefore = {
      query: {
        projectId: defaultProjectId,
      },
    };

    const resultBefore = await getPermissions({
      args: getArgsBefore,
      storage,
    });

    expect(resultBefore.permissions).toHaveLength(3);

    // Delete all user permissions
    const deleteArgs = makeDeletePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
      deleteMany: true,
    });

    await deletePermissions({
      ...deleteArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only admin permission remains
    const getArgsAfter = {
      query: {
        projectId: defaultProjectId,
      },
    };

    const resultAfter = await getPermissions({
      args: getArgsAfter,
      storage,
    });

    expect(resultAfter.permissions).toHaveLength(1);
    expect(resultAfter.permissions[0].entity).toBe("admin");
    expect(resultAfter.permissions[0].action).toBe("delete");
  });

  it("deletes only one permission when deleteMany is false", async () => {
    // Create multiple test permissions
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
          description: "User read permission",
        },
        {
          entity: "user",
          action: "write",
          target: "document",
          description: "User write permission",
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

    // Verify both permissions exist
    const getArgsBefore = {
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
    };

    const resultBefore = await getPermissions({
      args: getArgsBefore,
      storage,
    });

    expect(resultBefore.permissions).toHaveLength(2);

    // Delete only one permission
    const deleteArgs = makeDeletePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
      deleteMany: false,
    });

    await deletePermissions({
      ...deleteArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify only one permission remains
    const getArgsAfter = {
      query: {
        projectId: defaultProjectId,
        entity: { eq: "user" },
      },
    };

    const resultAfter = await getPermissions({
      args: getArgsAfter,
      storage,
    });

    expect(resultAfter.permissions).toHaveLength(1);
  });

  it("deletes permissions by createdBy", async () => {
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

    // Delete by createdBy
    const deleteArgs = makeDeletePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        createdBy: { eq: defaultBy },
      },
      deleteMany: true,
    });

    await deletePermissions({
      ...deleteArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify permission is deleted
    const getArgsAfter = {
      query: {
        projectId: defaultProjectId,
        createdBy: { eq: defaultBy },
      },
    };

    const resultAfter = await getPermissions({
      args: getArgsAfter,
      storage,
    });

    expect(resultAfter.permissions).toHaveLength(0);
  });

  it("deletes permissions with complex entity objects", async () => {
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

    // Delete by complex entity query
    const deleteArgs = makeDeletePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        entity: [{ op: "eq" as const, field: "type", value: "user" }],
      },
      deleteMany: true,
    });

    await deletePermissions({
      ...deleteArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify permission is deleted
    const getArgsAfter = {
      query: {
        projectId: defaultProjectId,
        entity: [{ op: "eq" as const, field: "type", value: "user" }],
      },
    };

    const resultAfter = await getPermissions({
      args: getArgsAfter,
      storage,
    });

    expect(resultAfter.permissions).toHaveLength(0);
  });

  it("handles deletion of non-existent permissions gracefully", async () => {
    // Try to delete non-existent permission
    const deleteArgs = makeDeletePermissionsArgs({
      query: {
        projectId: defaultProjectId,
        entity: { eq: "non-existent" },
      },
      deleteMany: false,
    });

    // This should not throw an error
    await expect(
      deletePermissions({
        ...deleteArgs,
        by: defaultBy,
        byType: defaultByType,
        storage,
      })
    ).resolves.not.toThrow();
  });

  it("deletes multiple permissions in one call when queries array is provided (OR delete)", async () => {
    const addArgs = makeAddPermissionsArgs({
      permissions: [
        { entity: "user1", action: "read", target: "doc", description: "P1" },
        { entity: "user2", action: "write", target: "doc", description: "P2" },
        { entity: "user3", action: "delete", target: "doc", description: "P3" },
      ],
    });
    await addPermissions({
      args: addArgs,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const resultBefore = await getPermissions({
      args: { query: { projectId: defaultProjectId } },
      storage,
    });
    expect(resultBefore.permissions).toHaveLength(3);

    await deletePermissions({
      queries: [
        { projectId: defaultProjectId, entity: { eq: "user1" } },
        { projectId: defaultProjectId, entity: { eq: "user2" } },
      ],
      deleteMany: true,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const resultAfter = await getPermissions({
      args: { query: { projectId: defaultProjectId } },
      storage,
    });
    expect(resultAfter.permissions).toHaveLength(1);
    expect(resultAfter.permissions[0].entity).toBe("user3");
  });

  it("deletes all permissions for an project", async () => {
    // Create multiple test permissions
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
        {
          entity: "guest",
          action: "view",
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

    // Verify all permissions exist
    const getArgsBefore = {
      query: {
        projectId: defaultProjectId,
      },
    };

    const resultBefore = await getPermissions({
      args: getArgsBefore,
      storage,
    });

    expect(resultBefore.permissions).toHaveLength(3);

    // Delete all permissions for the project
    const deleteArgs = makeDeletePermissionsArgs({
      query: {
        projectId: defaultProjectId,
      },
      deleteMany: true,
    });

    await deletePermissions({
      ...deleteArgs,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify all permissions are deleted
    const getArgsAfter = {
      query: {
        projectId: defaultProjectId,
      },
    };

    const resultAfter = await getPermissions({
      args: getArgsAfter,
      storage,
    });

    expect(resultAfter.permissions).toHaveLength(0);
  });
});

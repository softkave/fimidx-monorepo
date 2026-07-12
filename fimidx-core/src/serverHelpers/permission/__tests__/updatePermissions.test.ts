import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getMongoConnection } from "../../../db/fimidx.mongo.js";
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

function makeAddPermissionsArgs(
  overrides: Partial<AddPermissionsEndpointArgs> = {},
): AddPermissionsEndpointArgs {
  testCounter++;
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
  overrides: Partial<UpdatePermissionsEndpointArgs> = {},
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
        query: { metaQuery: { projectId: { eq: defaultProjectId } } },
        tag: kObjTags.permission,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true,
      });

      await (
        await getObjFieldsCollection()
      ).deleteMany({
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        tag: kObjTags.permission,
      });
    } catch {
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

      await (
        await getObjFieldsCollection()
      ).deleteMany({
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        tag: kObjTags.permission,
      });
    } catch {
      // Ignore errors in cleanup
    }
  });

  it("removeAllPermissions deletes all permissions matching query", async () => {
    await addPermissions({
      args: makeAddPermissionsArgs({
        permissions: [
          { entity: "user", action: "read", target: "document" },
          { entity: "user", action: "write", target: "document" },
          { entity: "admin", action: "delete", target: "document" },
        ],
      }),
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await updatePermissions({
      args: makeUpdatePermissionsArgs({
        query: { projectId: defaultProjectId, entity: { eq: "user" } },
        update: { removeAllPermissions: true },
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const result = await getPermissions({
      args: { query: { projectId: defaultProjectId } },
      storage,
    });
    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].entity).toBe("admin");
  });

  it("removePermissions deletes matching entity+action+target", async () => {
    await addPermissions({
      args: makeAddPermissionsArgs({
        permissions: [
          { entity: "user", action: "read", target: "document" },
          { entity: "user", action: "write", target: "document" },
          { entity: "user", action: "read", target: "image" },
        ],
      }),
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await updatePermissions({
      args: makeUpdatePermissionsArgs({
        update: {
          removePermissions: [
            { entity: "user", action: "write", target: "document" },
          ],
        },
      }),
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const result = await getPermissions({
      args: { query: { projectId: defaultProjectId } },
      storage,
    });
    expect(result.permissions).toHaveLength(2);
    const writeDoc = result.permissions.find(
      (p) => p.action === "write" && p.target === "document",
    );
    expect(writeDoc).toBeUndefined();
  });

  it("addPermissions adds new permissions when groupId provided", async () => {
    await addPermissions({
      args: makeAddPermissionsArgs({
        permissions: [{ entity: "user", action: "read", target: "document" }],
      }),
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await updatePermissions({
      args: makeUpdatePermissionsArgs({
        update: {
          addPermissions: [
            {
              entity: "admin",
              action: "write",
              target: "settings",
              description: "Admin write",
            },
          ],
        },
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const result = await getPermissions({
      args: { query: { projectId: defaultProjectId } },
      storage,
    });
    expect(result.permissions).toHaveLength(2);
    const adminPerm = result.permissions.find(
      (p) => p.entity === "admin" && p.action === "write",
    );
    expect(adminPerm).toBeDefined();
    expect(adminPerm!.target).toBe("settings");
    expect(adminPerm!.description).toBe("Admin write");
  });

  it("throws when addPermissions used without groupId", async () => {
    await expect(
      updatePermissions({
        args: makeUpdatePermissionsArgs({
          update: {
            addPermissions: [
              { entity: "admin", action: "write", target: "settings" },
            ],
          },
        }),
        by: defaultBy,
        byType: defaultByType,
        storage,
      }),
    ).rejects.toThrow("groupId is required");
  });

  it("combines removeAllPermissions and addPermissions", async () => {
    await addPermissions({
      args: makeAddPermissionsArgs({
        permissions: [
          { entity: "user", action: "read", target: "document" },
          { entity: "user", action: "write", target: "document" },
        ],
      }),
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await updatePermissions({
      args: makeUpdatePermissionsArgs({
        query: { projectId: defaultProjectId, entity: { eq: "user" } },
        update: {
          removeAllPermissions: true,
          addPermissions: [{ entity: "user", action: "admin", target: "all" }],
        },
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const result = await getPermissions({
      args: { query: { projectId: defaultProjectId } },
      storage,
    });
    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].entity).toBe("user");
    expect(result.permissions[0].action).toBe("admin");
    expect(result.permissions[0].target).toBe("all");
  });

  describe("meta field updates", () => {
    it("should update meta field with shallowMerge by default", async () => {
      await addPermissions({
        args: makeAddPermissionsArgs({
          permissions: [
            {
              entity: "user",
              action: "read",
              target: "document",
              meta: { existing: "value", toKeep: "preserved" },
            },
          ],
        }),
        groupId: defaultGroupId,
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      await updatePermissions({
        args: makeUpdatePermissionsArgs({
          query: { projectId: defaultProjectId, entity: { eq: "user" } },
          update: {
            meta: { newField: "newValue", existing: "updated" },
          },
        }),
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      const result = await getPermissions({
        args: { query: { projectId: defaultProjectId } },
        storage,
      });
      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].meta).toEqual({
        existing: "updated",
        toKeep: "preserved",
        newField: "newValue",
      });
    });

    it("should use replace metaUpdateWay when specified", async () => {
      await addPermissions({
        args: makeAddPermissionsArgs({
          permissions: [
            {
              entity: "user",
              action: "read",
              target: "document",
              meta: { existing: "value", toRemove: "willBeGone" },
            },
          ],
        }),
        groupId: defaultGroupId,
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      await updatePermissions({
        args: {
          query: { projectId: defaultProjectId, entity: { eq: "user" } },
          update: {
            meta: { newField: "newValue" },
          },
          metaUpdateWay: "replace",
        },
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      const result = await getPermissions({
        args: { query: { projectId: defaultProjectId } },
        storage,
      });
      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].meta).toEqual({
        newField: "newValue",
      });
    });

    it("should use deepMerge metaUpdateWay when specified", async () => {
      await addPermissions({
        args: makeAddPermissionsArgs({
          permissions: [
            {
              entity: "user",
              action: "read",
              target: "document",
              meta: { nested: { a: 1, b: 2 }, topLevel: "keep" },
            },
          ],
        }),
        groupId: defaultGroupId,
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      await updatePermissions({
        args: {
          query: { projectId: defaultProjectId, entity: { eq: "user" } },
          update: {
            meta: { nested: { c: 3 } },
          },
          metaUpdateWay: "deepMerge",
        },
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      const result = await getPermissions({
        args: { query: { projectId: defaultProjectId } },
        storage,
      });
      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].meta).toEqual({
        nested: { a: 1, b: 2, c: 3 },
        topLevel: "keep",
      });
    });

    it("should update multiple permissions when updateMany is true", async () => {
      await addPermissions({
        args: makeAddPermissionsArgs({
          permissions: [
            {
              entity: "user",
              action: "read",
              target: "document",
              meta: { original: "first" },
            },
            {
              entity: "user",
              action: "write",
              target: "document",
              meta: { original: "second" },
            },
          ],
        }),
        groupId: defaultGroupId,
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      await updatePermissions({
        args: {
          query: { projectId: defaultProjectId, entity: { eq: "user" } },
          update: {
            meta: { added: "toAll" },
          },
          updateMany: true,
        },
        by: defaultBy,
        byType: defaultByType,
        storage,
      });

      const result = await getPermissions({
        args: { query: { projectId: defaultProjectId } },
        storage,
      });
      expect(result.permissions).toHaveLength(2);
      for (const perm of result.permissions) {
        expect(perm.meta).toHaveProperty("added", "toAll");
        expect(perm.meta).toHaveProperty("original");
      }
    });
  });
});

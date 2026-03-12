import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getObjModel } from "../../../db/fimidx.mongo.js";
import type { IInputObjRecord, IObj } from "../../../definitions/obj.js";
import { createStorage } from "../../../storage/config.js";
import { cleanupDeletedObjs, deleteManyObjs } from "../deleteObjs.js";

const backends: { type: "mongo" | "postgres"; name: string }[] = [
  { type: "mongo", name: "MongoDB" },
  // { type: "postgres", name: "Postgres" },
];

function makeInputObjRecord(
  overrides: Partial<IInputObjRecord> = {}
): IInputObjRecord {
  return {
    name: "Test Object",
    value: Math.random(),
    ...overrides,
  };
}

function makeObjFields(overrides: Partial<IObj> = {}): IObj {
  const now = new Date();
  return {
    id: uuidv7(),
    createdAt: now,
    updatedAt: now,
    createdBy: "tester",
    createdByType: "user",
    updatedBy: "tester",
    updatedByType: "user",
    projectId: "test-project",
    groupId: "test-group",
    tag: "test-tag",
    objRecord: makeInputObjRecord(),
    deletedAt: null,
    deletedBy: null,
    deletedByType: null,
    shouldIndex: true,
    fieldsToIndex: null,
    ...overrides,
  };
}

// Use unique identifiers for each test file to prevent conflicts
const defaultProjectId = "test-project-deleteObjs";
const defaultTag = "test-tag-deleteObjs";

describe.each(backends)(
  "deleteManyObjs & cleanupDeletedObjs integration (%s)",
  (backend) => {
    let storage: ReturnType<typeof createStorage>;
    let cleanup: (() => Promise<void>) | undefined;

    beforeAll(async () => {
      storage = createStorage({ type: backend.type });
      if (backend.type === "mongo") {
        const model = getObjModel();
        if (model && model.db && model.db.asPromise) await model.db.asPromise();
        cleanup = async () => {
          await model.db.close();
        };
      }
    });

    afterAll(async () => {
      if (cleanup) await cleanup();
    });

    beforeEach(async () => {
      if (backend.type === "mongo") {
        const model = getObjModel();
        await model.deleteMany({
          projectId: defaultProjectId,
          tag: defaultTag,
        });
      } else if (backend.type === "postgres") {
        const { fimidxPostgresDb, objs } = await import(
          "../../../db/fimidx.postgres.js"
        );
        await fimidxPostgresDb
          .delete(objs)
          .where(
            and(eq(objs.projectId, defaultProjectId), eq(objs.tag, defaultTag))
          );
      }
    });

    it("soft deletes objects by projectId and tag", async () => {
      const obj = makeObjFields({
        projectId: defaultProjectId,
        tag: defaultTag,
      });
      await storage.create({ objs: [obj] });
      const result = await deleteManyObjs({
        objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
        tag: obj.tag,
        deletedBy: "deleter",
        deletedByType: "user",
        storageType: backend.type,
        hardDelete: false,
      });
      expect(result.deletedCount).toBeGreaterThanOrEqual(1);
      // Check that the object is now soft deleted
      const readResult = await storage.read({
        query: { metaQuery: { projectId: { eq: obj.projectId } } },
        tag: obj.tag,
        includeDeleted: true,
      });
      const deletedObj = readResult.objs.find((o: IObj) => o.id === obj.id);
      expect(deletedObj).toBeDefined();
      expect(deletedObj!.deletedAt).not.toBeNull();
      expect(deletedObj!.deletedBy).toBe("deleter");
      expect(deletedObj!.deletedByType).toBe("user");
    });

    it("does not delete objects if no match", async () => {
      const result = await deleteManyObjs({
        objQuery: { metaQuery: { projectId: { eq: "nonexistent-project" } } },
        tag: "nonexistent-tag",
        deletedBy: "deleter",
        deletedByType: "user",
        storageType: backend.type,
      });
      expect(result.deletedCount).toBe(0);
    });

    it("cleanupDeletedObjs removes soft deleted objects", async () => {
      const obj = makeObjFields({
        projectId: defaultProjectId,
        tag: defaultTag,
      });
      await storage.create({ objs: [obj] });
      // Soft delete
      await deleteManyObjs({
        objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
        tag: obj.tag,
        deletedBy: "deleter",
        deletedByType: "user",
        storageType: backend.type,
        hardDelete: false,
      });
      // Cleanup
      const cleanupResult = await cleanupDeletedObjs({
        storageType: backend.type,
      });
      expect(cleanupResult.cleanedCount).toBeGreaterThanOrEqual(1);
      // Check that the object is now gone
      const readResult = await storage.read({
        query: { metaQuery: { projectId: { eq: obj.projectId } } },
        tag: obj.tag,
        includeDeleted: true,
      });
      const deletedObj = readResult.objs.find((o: IObj) => o.id === obj.id);
      expect(deletedObj).toBeUndefined();
    });
  }
);

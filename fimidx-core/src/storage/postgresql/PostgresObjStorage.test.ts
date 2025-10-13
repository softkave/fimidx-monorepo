import assert from "assert";
import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fimidxPostgresDb, objs } from "../../db/fimidx.postgres.js";
import type {
  IInputObjRecord,
  IObj,
  IObjField,
} from "../../definitions/obj.js";
import { PostgresObjStorage } from "./PostgresObjStorage.js";

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
    appId: "test-app",
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

describe.skip("PostgresObjStorage (integration)", () => {
  let storage: PostgresObjStorage;

  beforeAll(async () => {
    storage = new PostgresObjStorage();
  });

  afterAll(async () => {
    // Optionally close DB connection if needed
  });

  beforeEach(async () => {
    // Clean up the table before each test
    await fimidxPostgresDb.delete(objs);
  });

  it("should create objects", async () => {
    const obj = makeObjFields();
    const result = await storage.create({ objs: [obj] });
    expect(result.objs).toHaveLength(1);
    const inDb = (await fimidxPostgresDb
      .select()
      .from(objs)
      .where(eq(objs.id, obj.id))
      .limit(1)) as IObj[];
    expect(inDb.length).toBe(1);
    expect(inDb[0].id).toBe(obj.id);
    expect(inDb[0].objRecord.name).toBe("Test Object");
  });

  it("should read objects", async () => {
    const obj = makeObjFields();
    await fimidxPostgresDb.insert(objs).values(obj);
    assert.ok(obj.appId);
    assert.ok(obj.tag);
    const result = await storage.read({
      query: { appId: obj.appId },
      tag: obj.tag,
      limit: 10,
    });
    expect(result.objs.length).toBeGreaterThanOrEqual(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should update objects", async () => {
    const obj = makeObjFields();
    await fimidxPostgresDb.insert(objs).values(obj);
    assert.ok(obj.appId);
    assert.ok(obj.tag);
    const newName = "Updated Name";
    const result = await storage.update({
      query: { appId: obj.appId },
      tag: obj.tag,
      update: { name: newName },
      by: "updater",
      byType: "user",
    });
    expect(result.updatedCount).toBeGreaterThanOrEqual(1);
    const updated = (await fimidxPostgresDb
      .select()
      .from(objs)
      .where(eq(objs.id, obj.id))
      .limit(1)) as IObj[];
    expect(updated[0].objRecord.name).toBe(newName);
    expect(updated[0].updatedBy).toBe("updater");
  });

  it("should soft-delete objects", async () => {
    const obj = makeObjFields();
    await fimidxPostgresDb.insert(objs).values(obj);
    assert.ok(obj.appId);
    assert.ok(obj.tag);
    const result = await storage.delete({
      query: { appId: obj.appId },
      tag: obj.tag,
      deletedBy: "deleter",
      deletedByType: "user",
    });
    expect(result.deletedCount).toBeGreaterThanOrEqual(1);
    const deleted = (await fimidxPostgresDb
      .select()
      .from(objs)
      .where(eq(objs.id, obj.id))
      .limit(1)) as IObj[];
    expect(deleted[0].deletedAt).toBeTruthy();
    expect(deleted[0].deletedBy).toBe("deleter");
  });

  it("should bulk upsert objects", async () => {
    const items = [
      makeInputObjRecord({ name: "Bulk1" }),
      makeInputObjRecord({ name: "Bulk2" }),
    ];
    const params = {
      items,
      conflictOnKeys: ["name"],
      onConflict: "replace" as const,
      tag: "bulk-tag",
      appId: "bulk-app",
      groupId: "bulk-group",
      createdBy: "bulk-tester",
      createdByType: "user",
      shouldIndex: true,
    };
    const result = await storage.bulkUpsert(params);
    expect(result.newObjs.length).toBe(2);
    // Upsert again with same names, should update not insert
    const result2 = await storage.bulkUpsert(params);
    expect(result2.updatedObjs.length).toBe(2);
    expect(result2.newObjs.length).toBe(0);
  });

  it("should bulk update objects", async () => {
    const objsArr = Array.from({ length: 3 }, (_, i) =>
      makeObjFields({
        objRecord: { name: `BulkUpd${i}` },
        appId: "bulkupd-app",
        tag: "bulkupd-tag",
      })
    );
    await fimidxPostgresDb.insert(objs).values(objsArr);
    const result = await storage.bulkUpdate({
      query: { appId: "bulkupd-app" },
      tag: "bulkupd-tag",
      update: { updated: true },
      by: "batch-updater",
      byType: "user",
      batchSize: 2,
    });
    expect(result.updatedCount).toBe(3);
    const updatedObjs = (await fimidxPostgresDb
      .select()
      .from(objs)
      .where(and(eq(objs.appId, "bulkupd-app"), eq(objs.tag, "bulkupd-tag")))
      .limit(3)) as IObj[];
    updatedObjs.forEach((obj) => expect(obj.objRecord.updated).toBe(true));
  });

  it("should bulk delete objects", async () => {
    const objsArr = Array.from({ length: 3 }, (_, i) =>
      makeObjFields({
        objRecord: { name: `BulkDel${i}` },
        appId: "bulkdel-app",
        tag: "bulkdel-tag",
      })
    );
    await fimidxPostgresDb.insert(objs).values(objsArr);
    const result = await storage.bulkDelete({
      query: { appId: "bulkdel-app" },
      tag: "bulkdel-tag",
      deletedBy: "bulk-deleter",
      deletedByType: "user",
      batchSize: 2,
      deleteMany: true,
    });
    expect(result.deletedCount).toBe(3);
    const deletedObjs = (await fimidxPostgresDb
      .select()
      .from(objs)
      .where(and(eq(objs.appId, "bulkdel-app"), eq(objs.tag, "bulkdel-tag")))
      .limit(3)) as IObj[];
    deletedObjs.forEach((obj) => expect(obj.deletedAt).toBeTruthy());
  });

  it("should cleanup deleted objects", async () => {
    const obj = makeObjFields({
      appId: "cleanup-app",
      tag: "cleanup-tag",
      deletedAt: new Date(),
      deletedBy: "cleanup",
      deletedByType: "user",
    });
    await fimidxPostgresDb.insert(objs).values(obj);
    const result = await storage.cleanupDeletedObjs();
    expect(result.cleanedCount).toBeGreaterThanOrEqual(1);
    const inDb = (await fimidxPostgresDb
      .select()
      .from(objs)
      .where(and(eq(objs.appId, "cleanup-app"), eq(objs.tag, "cleanup-tag")))
      .limit(1)) as IObj[];
    expect(inDb.length).toBe(0);
  });

  it("should respect conflict resolution: ignore", async () => {
    const items = [makeInputObjRecord({ name: "Conflict1", arr: [1] })];
    const params = {
      items,
      conflictOnKeys: ["name"],
      onConflict: "replace" as const,
      tag: "conflict-tag",
      appId: "conflict-app",
      groupId: "conflict-group",
      createdBy: "conflict-tester",
      createdByType: "user",
      shouldIndex: true,
    };
    await storage.bulkUpsert(params);
    // Try upsert with ignore
    const paramsIgnore = { ...params, onConflict: "ignore" as const };
    const result = await storage.bulkUpsert(paramsIgnore);
    expect(result.ignoredItems.length).toBe(1);
    expect(result.updatedObjs.length).toBe(0);
    expect(result.newObjs.length).toBe(0);
  });

  it("should respect conflict resolution: fail", async () => {
    const items = [makeInputObjRecord({ name: "Fail1" })];
    const params = {
      items,
      conflictOnKeys: ["name"],
      onConflict: "replace" as const,
      tag: "fail-tag",
      appId: "fail-app",
      groupId: "fail-group",
      createdBy: "fail-tester",
      createdByType: "user",
      shouldIndex: true,
    };
    await storage.bulkUpsert(params);
    // Try upsert with fail
    const paramsFail = { ...params, onConflict: "fail" as const };
    const result = await storage.bulkUpsert(paramsFail);
    expect(result.failedItems.length).toBe(1);
    expect(result.updatedObjs.length).toBe(0);
    expect(result.newObjs.length).toBe(0);
  });

  it("should merge fields with merge strategy", async () => {
    const obj = makeObjFields({ objRecord: { a: 1, b: 2 } });
    await fimidxPostgresDb.insert(objs).values(obj);
    assert.ok(obj.appId);
    assert.ok(obj.tag);
    await storage.update({
      query: { appId: obj.appId },
      tag: obj.tag,
      update: { b: 3, c: 4 },
      by: "merger",
      byType: "user",
      updateWay: "merge",
    });
    const updated = (await fimidxPostgresDb
      .select()
      .from(objs)
      .where(eq(objs.id, obj.id))
      .limit(1)) as IObj[];
    expect(updated[0].objRecord.a).toBe(1);
    expect(updated[0].objRecord.b).toBe(3);
    expect(updated[0].objRecord.c).toBe(4);
  });

  it("should merge arrays with mergeButReplaceArrays", async () => {
    const obj = makeObjFields({ objRecord: { arr: [1, 2], x: 1 } });
    await fimidxPostgresDb.insert(objs).values(obj);
    assert.ok(obj.appId);
    assert.ok(obj.tag);
    await storage.update({
      query: { appId: obj.appId },
      tag: obj.tag,
      update: { arr: [3, 4] },
      by: "merger",
      byType: "user",
      updateWay: "mergeButReplaceArrays",
    });
    const updated = (await fimidxPostgresDb
      .select()
      .from(objs)
      .where(eq(objs.id, obj.id))
      .limit(1)) as IObj[];
    expect(Array.isArray(updated[0].objRecord.arr)).toBe(true);
    expect(updated[0].objRecord.arr).toEqual([3, 4]);
  });

  it("should merge arrays with mergeButConcatArrays", async () => {
    const obj = makeObjFields({ objRecord: { arr: [1, 2] } });
    await fimidxPostgresDb.insert(objs).values(obj);
    assert.ok(obj.appId);
    assert.ok(obj.tag);
    await storage.update({
      query: { appId: obj.appId },
      tag: obj.tag,
      update: { arr: [3, 4] },
      by: "merger",
      byType: "user",
      updateWay: "mergeButConcatArrays",
    });
    const updated = (await fimidxPostgresDb
      .select()
      .from(objs)
      .where(eq(objs.id, obj.id))
      .limit(1)) as IObj[];
    expect(updated[0].objRecord.arr).toEqual([1, 2, 3, 4]);
  });

  it("should merge arrays with mergeButKeepArrays", async () => {
    const obj = makeObjFields({ objRecord: { arr: [1, 2] } });
    await fimidxPostgresDb.insert(objs).values(obj);
    assert.ok(obj.appId);
    assert.ok(obj.tag);
    await storage.update({
      query: { appId: obj.appId },
      tag: obj.tag,
      update: { arr: [3, 4] },
      by: "merger",
      byType: "user",
      updateWay: "mergeButKeepArrays",
    });
    const updated = (await fimidxPostgresDb
      .select()
      .from(objs)
      .where(eq(objs.id, obj.id))
      .limit(1)) as IObj[];
    expect(updated[0].objRecord.arr).toEqual([1, 2]);
  });

  it("should process items in batches in bulkUpsert", async () => {
    const items = Array.from({ length: 7 }, (_, i) =>
      makeInputObjRecord({ name: `Batch${i}` })
    );
    const params = {
      items,
      conflictOnKeys: ["name"],
      onConflict: "replace" as const,
      tag: "batch-tag",
      appId: "batch-app",
      groupId: "batch-group",
      createdBy: "batch-tester",
      createdByType: "user",
      shouldIndex: true,
      batchSize: 3,
    };
    const result = await storage.bulkUpsert(params);
    expect(result.newObjs.length).toBe(7);
    // Upsert again, should update all
    const result2 = await storage.bulkUpsert(params);
    expect(result2.updatedObjs.length).toBe(7);
  });

  it("should process items in batches in bulkUpdate", async () => {
    const objsArr = Array.from({ length: 5 }, (_, i) =>
      makeObjFields({
        objRecord: { name: `BulkUpd${i}` },
        appId: "bulkupd2-app",
        tag: "bulkupd2-tag",
      })
    );
    await fimidxPostgresDb.insert(objs).values(objsArr);
    const result = await storage.bulkUpdate({
      query: { appId: "bulkupd2-app" },
      tag: "bulkupd2-tag",
      update: { updated: true },
      by: "batch-updater",
      byType: "user",
      batchSize: 2,
    });
    expect(result.updatedCount).toBe(5);
    const updatedObjs = (await fimidxPostgresDb
      .select()
      .from(objs)
      .where(and(eq(objs.appId, "bulkupd2-app"), eq(objs.tag, "bulkupd2-tag")))
      .limit(5)) as IObj[];
    updatedObjs.forEach((obj) => expect(obj.objRecord.updated).toBe(true));
  });

  it("should rollback on transaction error", async () => {
    const obj = makeObjFields();
    await storage.create({ objs: [obj] });
    let errorCaught = false;
    try {
      await storage.withTransaction(async (txStorage) => {
        await txStorage.update({
          query: { appId: String(obj.appId) },
          tag: String(obj.tag),
          update: { name: "TxFail" },
          by: "tx",
          byType: "user",
        });
        throw new Error("fail tx");
      });
    } catch (e) {
      errorCaught = true;
    }
    expect(errorCaught).toBe(true);
    const inDb = (await fimidxPostgresDb
      .select()
      .from(objs)
      .where(eq(objs.id, obj.id))
      .limit(1)) as IObj[];
    expect(inDb[0]?.objRecord?.name ?? "").not.toBe("TxFail");
  });

  it("should commit on successful transaction", async () => {
    const obj = makeObjFields();
    await storage.create({ objs: [obj] });
    await storage.withTransaction(async (txStorage) => {
      await txStorage.update({
        query: { appId: String(obj.appId) },
        tag: String(obj.tag),
        update: { name: "TxSuccess" },
        by: "tx",
        byType: "user",
      });
    });
    const inDb = (await fimidxPostgresDb
      .select()
      .from(objs)
      .where(eq(objs.id, obj.id))
      .limit(1)) as IObj[];
    expect(inDb[0]?.objRecord?.name ?? "").toBe("TxSuccess");
  });

  describe("complex queries", () => {
    it("should query nested fields (objRecord.user.name)", async () => {
      const obj1 = makeObjFields({
        objRecord: { user: { name: "john", age: 30 } },
        tag: "nested-tag",
        appId: "nested-app",
      });
      const obj2 = makeObjFields({
        objRecord: { user: { name: "jane", age: 25 } },
        tag: "nested-tag",
        appId: "nested-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2]);
      const result = await storage.read({
        query: {
          appId: "nested-app",
          partQuery: {
            and: [{ op: "eq", field: "user.name", value: "john" }],
          },
        },
        tag: "nested-tag",
      });
      expect(result.objs.length).toBe(1);
      expect(result.objs[0].objRecord.user.name).toBe("john");
    });

    it("should query arrays with in (objRecord.metadata.tags)", async () => {
      const obj1 = makeObjFields({
        objRecord: { metadata: { tags: ["important", "urgent"] } },
        tag: "array-tag",
        appId: "array-app",
      });
      const obj2 = makeObjFields({
        objRecord: { metadata: { tags: ["other"] } },
        tag: "array-tag",
        appId: "array-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2]);
      const result = await storage.read({
        query: {
          appId: "array-app",
          partQuery: {
            and: [
              {
                op: "in",
                field: "metadata.tags",
                value: ["important", "urgent"],
              },
            ],
          },
        },
        tag: "array-tag",
      });
      expect(result.objs.length).toBe(1);
      expect(result.objs[0].objRecord.metadata.tags).toContain("important");
    });

    it("should query string fields with in operator (objRecord.name)", async () => {
      const obj1 = makeObjFields({
        objRecord: { name: "Alpha Group" },
        tag: "string-in-tag",
        appId: "string-in-app",
      });
      const obj2 = makeObjFields({
        objRecord: { name: "Beta Group" },
        tag: "string-in-tag",
        appId: "string-in-app",
      });
      const obj3 = makeObjFields({
        objRecord: { name: "Gamma Group" },
        tag: "string-in-tag",
        appId: "string-in-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2, obj3]);

      // First, let's verify all objects exist
      const allObjs = await storage.read({
        query: { appId: "string-in-app" },
        tag: "string-in-tag",
      });

      const result = await storage.read({
        query: {
          appId: "string-in-app",
          partQuery: {
            and: [
              {
                op: "in",
                field: "name",
                value: ["Alpha Group", "Beta Group"],
              },
            ],
          },
        },
        tag: "string-in-tag",
      });

      expect(result.objs).toHaveLength(2);
      const objectNames = result.objs.map((o) => o.objRecord.name).sort();
      expect(objectNames).toEqual(["Alpha Group", "Beta Group"]);
    });

    it("should query boolean field existence (objRecord.settings.enabled)", async () => {
      const obj1 = makeObjFields({
        objRecord: { settings: { enabled: true } },
        tag: "exists-tag",
        appId: "exists-app",
      });
      const obj2 = makeObjFields({
        objRecord: { settings: {} },
        tag: "exists-tag",
        appId: "exists-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2]);
      const result = await storage.read({
        query: {
          appId: "exists-app",
          partQuery: {
            and: [{ op: "exists", field: "settings.enabled", value: true }],
          },
        },
        tag: "exists-tag",
      });
      expect(result.objs.length).toBe(1);
      expect(result.objs[0].objRecord.settings.enabled).toBe(true);
    });

    it("should query numeric comparisons (objRecord.stats.views >= 1000)", async () => {
      const obj1 = makeObjFields({
        objRecord: { stats: { views: 1500 } },
        tag: "num-tag",
        appId: "num-app",
      });
      const obj2 = makeObjFields({
        objRecord: { stats: { views: 500 } },
        tag: "num-tag",
        appId: "num-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2]);
      const result = await storage.read({
        query: {
          appId: "num-app",
          partQuery: {
            and: [{ op: "gte", field: "stats.views", value: 1000 }],
          },
        },
        tag: "num-tag",
      });
      expect(result.objs.length).toBe(1);
      expect(result.objs[0].objRecord.stats.views).toBe(1500);
    });

    it("should query numeric between (objRecord.created between [2020, 2025])", async () => {
      const obj1 = makeObjFields({
        objRecord: { created: 2022 },
        tag: "between-tag",
        appId: "between-app",
      });
      const obj2 = makeObjFields({
        objRecord: { created: 2019 },
        tag: "between-tag",
        appId: "between-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2]);
      const result = await storage.read({
        query: {
          appId: "between-app",
          partQuery: {
            and: [{ op: "between", field: "created", value: [2020, 2025] }],
          },
        },
        tag: "between-tag",
      });
      expect(result.objs.length).toBe(1);
      expect(result.objs[0].objRecord.created).toBe(2022);
    });

    it("should support logical AND/OR", async () => {
      const obj1 = makeObjFields({
        objRecord: { status: "active", score: 200 },
        tag: "logic-tag",
        appId: "logic-app",
      });
      const obj2 = makeObjFields({
        objRecord: { status: "inactive", score: 50 },
        tag: "logic-tag",
        appId: "logic-app",
      });
      const obj3 = makeObjFields({
        objRecord: { status: "active", score: 80 },
        tag: "logic-tag",
        appId: "logic-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2, obj3]);
      const result = await storage.read({
        query: {
          appId: "logic-app",
          partQuery: {
            and: [
              { op: "eq", field: "status", value: "active" },
              { op: "gt", field: "score", value: 100 },
            ],
            or: [
              { op: "eq", field: "status", value: "inactive" },
              { op: "lt", field: "score", value: 100 },
            ],
          },
        },
        tag: "logic-tag",
      });
      // Should match obj1 (AND) and obj2/obj3 (OR)
      const ids = result.objs.map((o) => o.id);
      expect(ids).toContain(obj1.id);
      expect(ids).toContain(obj2.id);
      expect(ids).toContain(obj3.id);
    });

    it("should support meta queries (createdAt, updatedBy)", async () => {
      const now = new Date();
      const obj1 = makeObjFields({
        createdAt: now,
        updatedBy: "user1",
        tag: "meta-tag",
        appId: "meta-app",
      });
      const obj2 = makeObjFields({
        createdAt: new Date(now.getTime() - 100000000),
        updatedBy: "user2",
        tag: "meta-tag",
        appId: "meta-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2]);
      const result = await storage.read({
        query: {
          appId: "meta-app",
          metaQuery: {
            createdAt: {
              gte: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
            },
            updatedBy: { in: ["user1"] },
          },
        },
        tag: "meta-tag",
      });
      expect(result.objs.length).toBe(1);
      expect(result.objs[0].updatedBy).toBe("user1");
    });

    it("should query using metaQuery with updatedAt (like indexObjs)", async () => {
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago

      const obj1 = makeObjFields({
        updatedAt: now,
        tag: "meta-updated-tag",
        appId: "meta-updated-app",
      });
      const obj2 = makeObjFields({
        updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 48), // 2 days ago
        tag: "meta-updated-tag",
        appId: "meta-updated-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2]);

      const result = await storage.read({
        query: {
          metaQuery: {
            updatedAt: {
              gte: cutoffDate.getTime(),
            },
          },
        },
        tag: "meta-updated-tag",
      });

      expect(result.objs.length).toBe(1);
      expect(result.objs[0].id).toBe(obj1.id);
    });

    it("should query using topLevelFields with shouldIndex (like indexObjs)", async () => {
      const obj1 = makeObjFields({
        shouldIndex: true,
        tag: "top-level-tag",
        appId: "top-level-app",
      });
      const obj2 = makeObjFields({
        shouldIndex: false,
        tag: "top-level-tag",
        appId: "top-level-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2]);

      const result = await storage.read({
        query: {
          topLevelFields: {
            shouldIndex: true,
          },
        },
        tag: "top-level-tag",
      });

      expect(result.objs.length).toBe(1);
      expect(result.objs[0].id).toBe(obj1.id);
      expect(result.objs[0].shouldIndex).toBe(true);
    });

    it("should query using both metaQuery and topLevelFields together (like indexObjs)", async () => {
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago

      // Object 1: shouldIndex=true, updatedAt=now (should match)
      const obj1 = makeObjFields({
        shouldIndex: true,
        updatedAt: now,
        tag: "combined-tag",
        appId: "combined-app",
      });

      // Object 2: shouldIndex=false, updatedAt=now (should not match - wrong shouldIndex)
      const obj2 = makeObjFields({
        shouldIndex: false,
        updatedAt: now,
        tag: "combined-tag",
        appId: "combined-app",
      });

      // Object 3: shouldIndex=true, updatedAt=2 days ago (should not match - wrong updatedAt)
      const obj3 = makeObjFields({
        shouldIndex: true,
        updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 48),
        tag: "combined-tag",
        appId: "combined-app",
      });

      // Object 4: shouldIndex=false, updatedAt=2 days ago (should not match - both wrong)
      const obj4 = makeObjFields({
        shouldIndex: false,
        updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 48),
        tag: "combined-tag",
        appId: "combined-app",
      });

      await fimidxPostgresDb.insert(objs).values([obj1, obj2, obj3, obj4]);

      const result = await storage.read({
        query: {
          metaQuery: {
            updatedAt: {
              gte: cutoffDate.getTime(),
            },
          },
          topLevelFields: {
            shouldIndex: true,
          },
        },
        tag: "combined-tag",
      });

      expect(result.objs.length).toBe(1);
      expect(result.objs[0].id).toBe(obj1.id);
      expect(result.objs[0].shouldIndex).toBe(true);
      expect(result.objs[0].updatedAt.getTime()).toBeGreaterThanOrEqual(
        cutoffDate.getTime()
      );
    });
  });

  describe("sorting", () => {
    it("should sort by simple string field in objRecord", async () => {
      const obj1 = makeObjFields({
        objRecord: { name: "Charlie" },
        tag: "sort-string-tag",
        appId: "sort-string-app",
      });
      const obj2 = makeObjFields({
        objRecord: { name: "Alice" },
        tag: "sort-string-tag",
        appId: "sort-string-app",
      });
      const obj3 = makeObjFields({
        objRecord: { name: "Bob" },
        tag: "sort-string-tag",
        appId: "sort-string-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2, obj3]);

      const result = await storage.read({
        query: { appId: "sort-string-app" },
        tag: "sort-string-tag",
        sort: [{ field: "objRecord.name", direction: "asc" }],
        fields: new Map<string, IObjField>([
          [
            "name",
            {
              id: "name-field",
              path: "name",
              type: "string",
              arrayTypes: ["string"],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              appId: "sort-string-app",
              groupId: "test-group",
              tag: "sort-string-tag",
            },
          ],
        ]),
      });

      expect(result.objs).toHaveLength(3);
      expect(result.objs[0].objRecord.name).toBe("Alice");
      expect(result.objs[1].objRecord.name).toBe("Bob");
      expect(result.objs[2].objRecord.name).toBe("Charlie");
    });

    it("should sort by simple number field in objRecord", async () => {
      const obj1 = makeObjFields({
        objRecord: { score: 300 },
        tag: "sort-number-tag",
        appId: "sort-number-app",
      });
      const obj2 = makeObjFields({
        objRecord: { score: 100 },
        tag: "sort-number-tag",
        appId: "sort-number-app",
      });
      const obj3 = makeObjFields({
        objRecord: { score: 200 },
        tag: "sort-number-tag",
        appId: "sort-number-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2, obj3]);

      const result = await storage.read({
        query: { appId: "sort-number-app" },
        tag: "sort-number-tag",
        sort: [{ field: "objRecord.score", direction: "asc" }],
        fields: new Map<string, IObjField>([
          [
            "score",
            {
              id: "score-field",
              path: "score",
              type: "string",
              arrayTypes: ["string"],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              appId: "sort-number-app",
              groupId: "test-group",
              tag: "sort-number-tag",
            },
          ],
        ]),
      });

      expect(result.objs).toHaveLength(3);
      expect(result.objs[0].objRecord.score).toBe(100);
      expect(result.objs[1].objRecord.score).toBe(200);
      expect(result.objs[2].objRecord.score).toBe(300);
    });

    it("should sort by nested field in objRecord", async () => {
      const obj1 = makeObjFields({
        objRecord: { user: { age: 30 } },
        tag: "sort-nested-tag",
        appId: "sort-nested-app",
      });
      const obj2 = makeObjFields({
        objRecord: { user: { age: 25 } },
        tag: "sort-nested-tag",
        appId: "sort-nested-app",
      });
      const obj3 = makeObjFields({
        objRecord: { user: { age: 35 } },
        tag: "sort-nested-tag",
        appId: "sort-nested-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2, obj3]);

      const result = await storage.read({
        query: { appId: "sort-nested-app" },
        tag: "sort-nested-tag",
        sort: [{ field: "objRecord.user.age", direction: "asc" }],
        fields: new Map<string, IObjField>([
          [
            "user.age",
            {
              id: "user-age-field",
              path: "user.age",
              type: "string",
              arrayTypes: ["string"],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              appId: "sort-nested-app",
              groupId: "test-group",
              tag: "sort-nested-tag",
            },
          ],
        ]),
      });

      expect(result.objs).toHaveLength(3);
      expect(result.objs[0].objRecord.user.age).toBe(25);
      expect(result.objs[1].objRecord.user.age).toBe(30);
      expect(result.objs[2].objRecord.user.age).toBe(35);
    });

    it("should sort by deeply nested field in objRecord", async () => {
      const obj1 = makeObjFields({
        objRecord: { stats: { views: { daily: 1500 } } },
        tag: "sort-deep-tag",
        appId: "sort-deep-app",
      });
      const obj2 = makeObjFields({
        objRecord: { stats: { views: { daily: 500 } } },
        tag: "sort-deep-tag",
        appId: "sort-deep-app",
      });
      const obj3 = makeObjFields({
        objRecord: { stats: { views: { daily: 1000 } } },
        tag: "sort-deep-tag",
        appId: "sort-deep-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2, obj3]);

      const result = await storage.read({
        query: { appId: "sort-deep-app" },
        tag: "sort-deep-tag",
        sort: [{ field: "objRecord.stats.views.daily", direction: "asc" }],
        fields: new Map<string, IObjField>([
          [
            "stats.views.daily",
            {
              id: "stats-views-daily-field",
              path: "stats.views.daily",
              type: "string",
              arrayTypes: ["string"],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              appId: "sort-deep-app",
              groupId: "test-group",
              tag: "sort-deep-tag",
            },
          ],
        ]),
      });

      expect(result.objs).toHaveLength(3);
      expect(result.objs[0].objRecord.stats.views.daily).toBe(500);
      expect(result.objs[1].objRecord.stats.views.daily).toBe(1000);
      expect(result.objs[2].objRecord.stats.views.daily).toBe(1500);
    });

    it("should sort by multiple fields in objRecord", async () => {
      const obj1 = makeObjFields({
        objRecord: { category: "A", priority: 1 },
        tag: "sort-multi-tag",
        appId: "sort-multi-app",
      });
      const obj2 = makeObjFields({
        objRecord: { category: "A", priority: 2 },
        tag: "sort-multi-tag",
        appId: "sort-multi-app",
      });
      const obj3 = makeObjFields({
        objRecord: { category: "B", priority: 1 },
        tag: "sort-multi-tag",
        appId: "sort-multi-app",
      });
      const obj4 = makeObjFields({
        objRecord: { category: "B", priority: 2 },
        tag: "sort-multi-tag",
        appId: "sort-multi-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2, obj3, obj4]);

      const result = await storage.read({
        query: { appId: "sort-multi-app" },
        tag: "sort-multi-tag",
        sort: [
          { field: "objRecord.category", direction: "asc" },
          { field: "objRecord.priority", direction: "desc" },
        ],
        fields: new Map<string, IObjField>([
          [
            "category",
            {
              id: "category-field",
              path: "category",
              type: "string",
              arrayTypes: ["string"],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              appId: "sort-multi-app",
              groupId: "test-group",
              tag: "sort-multi-tag",
            },
          ],
          [
            "priority",
            {
              id: "priority-field",
              path: "priority",
              type: "string",
              arrayTypes: ["string"],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              appId: "sort-multi-app",
              groupId: "test-group",
              tag: "sort-multi-tag",
            },
          ],
        ]),
      });

      expect(result.objs).toHaveLength(4);
      // Should be sorted by category ASC, then priority DESC
      expect(result.objs[0].objRecord.category).toBe("A");
      expect(result.objs[0].objRecord.priority).toBe(2);
      expect(result.objs[1].objRecord.category).toBe("A");
      expect(result.objs[1].objRecord.priority).toBe(1);
      expect(result.objs[2].objRecord.category).toBe("B");
      expect(result.objs[2].objRecord.priority).toBe(2);
      expect(result.objs[3].objRecord.category).toBe("B");
      expect(result.objs[3].objRecord.priority).toBe(1);
    });

    it("should sort by top-level fields (createdAt, updatedAt)", async () => {
      const now = new Date();
      const obj1 = makeObjFields({
        createdAt: new Date(now.getTime() + 1000),
        updatedAt: new Date(now.getTime() + 2000),
        tag: "sort-top-level-tag",
        appId: "sort-top-level-app",
      });
      const obj2 = makeObjFields({
        createdAt: now,
        updatedAt: new Date(now.getTime() + 1000),
        tag: "sort-top-level-tag",
        appId: "sort-top-level-app",
      });
      const obj3 = makeObjFields({
        createdAt: new Date(now.getTime() + 2000),
        updatedAt: now,
        tag: "sort-top-level-tag",
        appId: "sort-top-level-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2, obj3]);

      const result = await storage.read({
        query: { appId: "sort-top-level-app" },
        tag: "sort-top-level-tag",
        sort: [
          { field: "createdAt", direction: "asc" },
          { field: "updatedAt", direction: "desc" },
        ],
      });

      expect(result.objs).toHaveLength(3);
      // Should be sorted by createdAt ASC, then updatedAt DESC
      expect(result.objs[0].id).toBe(obj2.id); // earliest createdAt
      expect(result.objs[1].id).toBe(obj1.id); // middle createdAt, higher updatedAt
      expect(result.objs[2].id).toBe(obj3.id); // latest createdAt
    });

    it("should skip sorting by fields not in fields parameter", async () => {
      const obj1 = makeObjFields({
        objRecord: { name: "Charlie", score: 300 },
        tag: "sort-skip-tag",
        appId: "sort-skip-app",
      });
      const obj2 = makeObjFields({
        objRecord: { name: "Alice", score: 100 },
        tag: "sort-skip-tag",
        appId: "sort-skip-app",
      });
      const obj3 = makeObjFields({
        objRecord: { name: "Bob", score: 200 },
        tag: "sort-skip-tag",
        appId: "sort-skip-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2, obj3]);

      const result = await storage.read({
        query: { appId: "sort-skip-app" },
        tag: "sort-skip-tag",
        sort: [
          { field: "objRecord.name", direction: "asc" }, // Should be skipped (not in fields)
          { field: "objRecord.score", direction: "asc" }, // Should work (in fields)
        ],
        fields: new Map<string, IObjField>([
          [
            "score",
            {
              id: "score-field",
              path: "score",
              type: "string",
              arrayTypes: ["string"],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              appId: "sort-skip-app",
              groupId: "test-group",
              tag: "sort-skip-tag",
            },
          ],
          // Note: name field is not included in fields, so it should be skipped
        ]),
      });

      expect(result.objs).toHaveLength(3);
      // Should be sorted by score ASC since name is skipped
      expect(result.objs[0].objRecord.score).toBe(100);
      expect(result.objs[1].objRecord.score).toBe(200);
      expect(result.objs[2].objRecord.score).toBe(300);
    });

    it("should handle mixed field types in sorting", async () => {
      const obj1 = makeObjFields({
        objRecord: {
          status: "active",
          priority: 1,
          metadata: {
            views: 100,
            tags: ["important"],
          },
        },
        tag: "sort-mixed-tag",
        appId: "sort-mixed-app",
      });
      const obj2 = makeObjFields({
        objRecord: {
          status: "inactive",
          priority: 2,
          metadata: {
            views: 200,
            tags: ["urgent"],
          },
        },
        tag: "sort-mixed-tag",
        appId: "sort-mixed-app",
      });
      const obj3 = makeObjFields({
        objRecord: {
          status: "active",
          priority: 3,
          metadata: {
            views: 150,
            tags: ["normal"],
          },
        },
        tag: "sort-mixed-tag",
        appId: "sort-mixed-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2, obj3]);

      const result = await storage.read({
        query: { appId: "sort-mixed-app" },
        tag: "sort-mixed-tag",
        sort: [
          { field: "objRecord.status", direction: "asc" },
          { field: "objRecord.priority", direction: "desc" },
          { field: "objRecord.metadata.views", direction: "asc" },
        ],
        fields: new Map<string, IObjField>([
          [
            "priority",
            {
              id: "priority-field",
              path: "priority",
              type: "string",
              arrayTypes: ["string"],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              appId: "sort-mixed-app",
              groupId: "test-group",
              tag: "sort-mixed-tag",
            },
          ],
          [
            "metadata.views",
            {
              id: "metadata-views-field",
              path: "metadata.views",
              type: "string",
              arrayTypes: ["string"],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              appId: "sort-mixed-app",
              groupId: "test-group",
              tag: "sort-mixed-tag",
            },
          ],
        ]),
      });

      expect(result.objs).toHaveLength(3);
      // Should be sorted by status ASC, then priority DESC (if available), then metadata.views ASC
      // The exact order depends on how the PostgresQueryTransformer handles mixed field types
    });

    it("should handle empty sort array", async () => {
      const obj1 = makeObjFields({
        objRecord: { name: "First" },
        tag: "sort-empty-tag",
        appId: "sort-empty-app",
      });
      const obj2 = makeObjFields({
        objRecord: { name: "Second" },
        tag: "sort-empty-tag",
        appId: "sort-empty-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1, obj2]);

      const result = await storage.read({
        query: { appId: "sort-empty-app" },
        tag: "sort-empty-tag",
        sort: [], // Empty sort array
      });

      expect(result.objs).toHaveLength(2);
      // Should use default sorting (createdAt DESC)
    });

    it("should handle sort with invalid field names", async () => {
      const obj1 = makeObjFields({
        objRecord: { name: "Test" },
        tag: "sort-invalid-tag",
        appId: "sort-invalid-app",
      });
      await fimidxPostgresDb.insert(objs).values([obj1]);

      const result = await storage.read({
        query: { appId: "sort-invalid-app" },
        tag: "sort-invalid-tag",
        sort: [
          { field: "objRecord.nonexistent", direction: "asc" }, // Should be skipped (not in fields)
          { field: "objRecord.name", direction: "asc" }, // Should work (in fields)
        ],
        fields: new Map<string, IObjField>([
          [
            "name",
            {
              id: "name-field",
              path: "name",
              type: "string",
              arrayTypes: ["string"],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              appId: "sort-invalid-app",
              groupId: "test-group",
              tag: "sort-invalid-tag",
            },
          ],
        ]),
      });

      expect(result.objs).toHaveLength(1);
      // Should be sorted by name ASC since nonexistent is skipped
      expect(result.objs[0].objRecord.name).toBe("Test");
    });
  });

  it("should handle array field queries with reportsTo.userId", async () => {
    const obj = makeObjFields({
      objRecord: {
        reportsTo: [
          { userId: "user1", role: "admin" },
          { userId: "user2", role: "user" },
        ],
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    // Create array field metadata
    const fieldsMap = new Map<string, IObjField>([
      [
        "reportsTo",
        {
          id: "array-field-1",
          path: "reportsTo",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [{ op: "eq", field: "reportsTo.userId", value: "user1" }],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle array field queries with logsQuery.and.op", async () => {
    const obj = makeObjFields({
      objRecord: {
        logsQuery: {
          and: [
            { op: "eq", field: "status", value: "active" },
            { op: "in", field: "type", value: ["error", "warning"] },
          ],
        },
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    // Create array field metadata
    const fieldsMap = new Map<string, IObjField>([
      [
        "logsQuery.and",
        {
          id: "array-field-2",
          path: "logsQuery.and",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [{ op: "eq", field: "logsQuery.and.op", value: "eq" }],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle deeply nested array field queries", async () => {
    const obj = makeObjFields({
      objRecord: {
        logsQuery: {
          and: [
            {
              op: [
                { subOp: "eq", value: "test" },
                { subOp: "neq", value: "other" },
              ],
            },
          ],
        },
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    // Create array field metadata for both levels
    const fieldsMap = new Map<string, IObjField>([
      [
        "logsQuery.and",
        {
          id: "array-field-3",
          path: "logsQuery.and",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      [
        "logsQuery.and.op",
        {
          id: "array-field-4",
          path: "logsQuery.and.op",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [{ op: "eq", field: "logsQuery.and.op.subOp", value: "eq" }],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle array field queries with 'in' operation", async () => {
    const obj = makeObjFields({
      objRecord: {
        reportsTo: [
          { userId: "user1", role: "admin" },
          { userId: "user2", role: "user" },
          { userId: "user3", role: "moderator" },
        ],
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    const fieldsMap = new Map<string, IObjField>([
      [
        "reportsTo",
        {
          id: "array-field-5",
          path: "reportsTo",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [
            { op: "in", field: "reportsTo.userId", value: ["user1", "user3"] },
          ],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle array field queries with 'not_in' operation", async () => {
    const obj = makeObjFields({
      objRecord: {
        reportsTo: [
          { userId: "user1", role: "admin" },
          { userId: "user2", role: "user" },
        ],
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    const fieldsMap = new Map<string, IObjField>([
      [
        "reportsTo",
        {
          id: "array-field-6",
          path: "reportsTo",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [
            {
              op: "not_in",
              field: "reportsTo.userId",
              value: ["user3", "user4"],
            },
          ],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle array field queries with numeric comparisons", async () => {
    const obj = makeObjFields({
      objRecord: {
        scores: [
          { value: 85, category: "math" },
          { value: 92, category: "science" },
          { value: 78, category: "history" },
        ],
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    const fieldsMap = new Map<string, IObjField>([
      [
        "scores",
        {
          id: "array-field-7",
          path: "scores",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [{ op: "gte", field: "scores.value", value: 90 }],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle array field queries with 'exists' operation", async () => {
    const obj = makeObjFields({
      objRecord: {
        reportsTo: [
          { userId: "user1", role: "admin", permissions: ["read", "write"] },
          { userId: "user2", role: "user" }, // no permissions field
        ],
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    const fieldsMap = new Map<string, IObjField>([
      [
        "reportsTo",
        {
          id: "array-field-8",
          path: "reportsTo",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [{ op: "exists", field: "reportsTo.permissions", value: true }],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle array field queries with 'like' operation", async () => {
    const obj = makeObjFields({
      objRecord: {
        reportsTo: [
          { userId: "user1", email: "admin@example.com" },
          { userId: "user2", email: "user@test.org" },
        ],
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    const fieldsMap = new Map<string, IObjField>([
      [
        "reportsTo",
        {
          id: "array-field-9",
          path: "reportsTo",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [
            { op: "like", field: "reportsTo.email", value: ".*@example\\.com" },
          ],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle mixed array and regular field queries", async () => {
    const obj = makeObjFields({
      objRecord: {
        name: "Test Object",
        reportsTo: [
          { userId: "user1", role: "admin" },
          { userId: "user2", role: "user" },
        ],
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    const fieldsMap = new Map<string, IObjField>([
      [
        "reportsTo",
        {
          id: "array-field-10",
          path: "reportsTo",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [
            { op: "eq", field: "name", value: "Test Object" },
            { op: "eq", field: "reportsTo.userId", value: "user1" },
          ],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle empty array field queries gracefully", async () => {
    const obj = makeObjFields({
      objRecord: {
        reportsTo: [],
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    const fieldsMap = new Map<string, IObjField>([
      [
        "reportsTo",
        {
          id: "array-field-11",
          path: "reportsTo",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [{ op: "eq", field: "reportsTo.userId", value: "user1-empty" }],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(0);
  });

  it("should handle array field queries with logical AND operations", async () => {
    const obj = makeObjFields({
      objRecord: {
        reportsTo: [
          { userId: "user1", role: "admin", active: true },
          { userId: "user2", role: "user", active: false },
        ],
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    const fieldsMap = new Map<string, IObjField>([
      [
        "reportsTo",
        {
          id: "array-field-12",
          path: "reportsTo",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [
            { op: "eq", field: "reportsTo.userId", value: "user1" },
            { op: "eq", field: "reportsTo.active", value: true },
          ],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle array field queries with logical OR operations", async () => {
    const obj = makeObjFields({
      objRecord: {
        reportsTo: [
          { userId: "user1", role: "admin" },
          { userId: "user2", role: "user" },
        ],
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    const fieldsMap = new Map<string, IObjField>([
      [
        "reportsTo",
        {
          id: "array-field-13",
          path: "reportsTo",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          or: [
            { op: "eq", field: "reportsTo.userId", value: "user1" },
            { op: "eq", field: "reportsTo.userId", value: "user2" },
          ],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle array field queries with 'between' operation", async () => {
    const obj = makeObjFields({
      objRecord: {
        scores: [
          { value: 85, category: "math" },
          { value: 92, category: "science" },
          { value: 78, category: "history" },
        ],
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    const fieldsMap = new Map<string, IObjField>([
      [
        "scores",
        {
          id: "array-field-14",
          path: "scores",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [{ op: "between", field: "scores.value", value: [80, 95] }],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle array field queries with array of primitives", async () => {
    const obj = makeObjFields({
      objRecord: {
        tags: ["javascript", "typescript", "react"],
        permissions: ["read", "write", "delete"],
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    const fieldsMap = new Map<string, IObjField>([
      [
        "tags",
        {
          id: "array-field-15",
          path: "tags",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [{ op: "eq", field: "tags", value: "typescript" }],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle array field queries with 'neq' operation", async () => {
    const obj = makeObjFields({
      objRecord: {
        reportsTo: [
          { userId: "user1", role: "admin" },
          { userId: "user2", role: "user" },
        ],
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    const fieldsMap = new Map<string, IObjField>([
      [
        "reportsTo",
        {
          id: "array-field-16",
          path: "reportsTo",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [{ op: "neq", field: "reportsTo.userId", value: "user3" }],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle array field queries with complex nested structures", async () => {
    const obj = makeObjFields({
      objRecord: {
        workflow: {
          steps: [
            {
              id: "step1",
              actions: [
                { type: "email", config: { template: "welcome" } },
                { type: "sms", config: { message: "Hello" } },
              ],
            },
            {
              id: "step2",
              actions: [
                { type: "webhook", config: { url: "https://api.example.com" } },
              ],
            },
          ],
        },
      },
    });

    await fimidxPostgresDb.insert(objs).values(obj);

    const fieldsMap = new Map<string, IObjField>([
      [
        "workflow.steps",
        {
          id: "array-field-17",
          path: "workflow.steps",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      [
        "workflow.steps.actions",
        {
          id: "array-field-18",
          path: "workflow.steps.actions",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj.appId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        appId: obj.appId,
        partQuery: {
          and: [
            { op: "eq", field: "workflow.steps.actions.type", value: "email" },
          ],
        },
      },
      tag: obj.tag,
      fields: fieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle array field queries with mixed array and scalar at same path", async () => {
    const obj1 = makeObjFields({
      objRecord: { reportsTo: [{ userId: "user1" }] },
    });
    const obj2 = makeObjFields({
      objRecord: { reportsTo: { userId: "user2" } },
    });
    await fimidxPostgresDb.insert(objs).values([obj1, obj2]);
    const fieldsMap = new Map<string, IObjField>([
      [
        "reportsTo",
        {
          id: "array-field-mixed",
          path: "reportsTo",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          appId: obj1.appId!,
          groupId: obj1.groupId!,
          tag: obj1.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);
    const fieldsMapScalar = new Map<string, IObjField>([
      [
        "reportsTo.userId",
        {
          id: "reportsTo-field",
          path: "reportsTo.userId",
          type: "string",
          arrayTypes: ["string"],
          isArrayCompressed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          appId: obj1.appId!,
          groupId: obj1.groupId!,
          tag: obj1.tag!,
        },
      ],
    ]);
    // Should find obj1 for array, obj2 for scalar
    const result1 = await storage.read({
      query: {
        appId: obj1.appId,
        partQuery: {
          and: [{ op: "eq", field: "reportsTo.userId", value: "user1" }],
        },
      },
      tag: obj1.tag,
      fields: fieldsMap,
    });
    const result2 = await storage.read({
      query: {
        appId: obj2.appId,
        partQuery: {
          and: [{ op: "eq", field: "reportsTo.userId", value: "user2" }],
        },
      },
      tag: obj2.tag,
      fields: fieldsMapScalar,
    });
    expect(result1.objs.some((o) => o.id === obj1.id)).toBe(true);
    expect(result2.objs.some((o) => o.id === obj2.id)).toBe(true);
  });
});

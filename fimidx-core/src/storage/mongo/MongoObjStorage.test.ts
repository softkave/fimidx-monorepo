import assert from "assert";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getObjModel } from "../../db/fimidx.mongo.js";
import type { IInputObjRecord, IObj } from "../../definitions/obj.js";
import { MongoObjStorage } from "./MongoObjStorage.js";

describe("MongoObjStorage (integration)", () => {
  let storage: MongoObjStorage;
  let objModel: ReturnType<typeof getObjModel>;

  beforeAll(async () => {
    objModel = getObjModel();
    storage = new MongoObjStorage(objModel);
    // Wait for connection
    await objModel.db.asPromise();
  });

  afterAll(async () => {
    await objModel.db.close();
  });

  beforeEach(async () => {
    // Clean up the collection before each test
    await objModel.deleteMany({});
  });

  function makeInputObjRecord(
    overrides: Partial<IInputObjRecord> = {}
  ): IInputObjRecord {
    return {
      name: "Test Object",
      value: Math.random(),
      ...overrides,
    };
  }

  function makeObjFields(overrides: Partial<IObj> = {}): Partial<IObj> {
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

  it("should create objects", async () => {
    const obj = makeObjFields();
    const result = await storage.create({ objs: [obj as IObj] });
    expect(result.objs).toHaveLength(1);
    const inDb = await objModel.findOne({ id: obj.id }).lean();
    expect(inDb).toBeTruthy();
    if (!inDb) throw new Error("Object not found in DB");
    expect(inDb.id ?? "").toBe(obj.id ?? "");
    expect(inDb.objRecord?.name ?? "").toBe("Test Object");
  });

  it("should read objects", async () => {
    const obj = makeObjFields();
    await objModel.create(obj);
    assert.ok(obj.projectId);
    assert.ok(obj.tag);
    const result = await storage.read({
      query: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      limit: 10,
    });
    expect(result.objs.length).toBeGreaterThanOrEqual(1);
    expect(result.objs[0]?.id ?? "").toBe(obj.id ?? "");
  });

  it("should update objects", async () => {
    const obj = makeObjFields();
    await objModel.create(obj);
    assert.ok(obj.projectId);
    assert.ok(obj.tag);
    const newName = "Updated Name";
    const result = await storage.update({
      query: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      update: { name: newName },
      by: "updater",
      byType: "user",
    });
    expect(result.updatedCount).toBeGreaterThanOrEqual(1);
    const updated = await objModel.findOne({ id: obj.id }).lean();
    expect(updated).toBeTruthy();
    if (!updated) throw new Error("Updated object not found in DB");
    expect(updated.objRecord?.name ?? "").toBe(newName);
    expect(updated.updatedBy ?? "").toBe("updater");
  });

  it("should soft-delete objects", async () => {
    const obj = makeObjFields();
    await objModel.create(obj);
    assert.ok(obj.projectId);
    assert.ok(obj.tag);
    const result = await storage.delete({
      query: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      deletedBy: "deleter",
      deletedByType: "user",
    });
    expect(result.deletedCount).toBeGreaterThanOrEqual(1);
    const deleted = await objModel.findOne({ id: obj.id }).lean();
    expect(deleted).toBeTruthy();
    if (!deleted) throw new Error("Deleted object not found in DB");
    expect(deleted.deletedAt).toBeTruthy();
    expect(deleted.deletedBy ?? "").toBe("deleter");
  });

  it("should bulk delete using obj-level OR query", async () => {
    const tag = "bulk-delete-or-tag";
    const projectId = "bulk-delete-or-project";

    const objA1 = makeObjFields({
      objRecord: { type: "A" },
      tag,
      projectId,
    });
    const objA2 = makeObjFields({
      objRecord: { type: "A", extra: 1 },
      tag,
      projectId,
    });
    const objB1 = makeObjFields({
      objRecord: { type: "B" },
      tag,
      projectId,
    });
    const controlObj = makeObjFields({
      objRecord: { type: "C" },
      tag,
      projectId,
    });

    await objModel.insertMany([objA1, objA2, objB1, controlObj]);

    const result = await storage.bulkDelete({
      query: {
        or: [
          {
            metaQuery: { projectId: { eq: projectId } },
            recordQuery: [{ op: "eq", field: "type", value: "A" }],
          },
          {
            metaQuery: { projectId: { eq: projectId } },
            recordQuery: [{ op: "eq", field: "type", value: "B" }],
          },
        ],
      },
      tag,
      deletedBy: "bulk-deleter",
      deletedByType: "user",
      deleteMany: true,
      hardDelete: true,
    });

    expect(result.deletedCount).toBe(3);

    const remaining = await objModel.find({ tag }).lean();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].objRecord?.type).toBe("C");
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
      projectId: "bulk-project",
      groupId: "bulk-group",
      createdBy: "bulk-tester",
      createdByType: "user",
      shouldIndex: true,
    };
    const result = await storage.bulkUpsert(params);
    expect(result.newObjs.length).toBe(2);
    // Upsert again with same names, should update not insert
    const result2 = await storage.bulkUpsert({ ...params });
    expect(result2.updatedObjs.length).toBe(2);
    expect(result2.newObjs.length).toBe(0);
  });

  it("should respect conflict resolution: ignore", async () => {
    const items = [makeInputObjRecord({ name: "Conflict1", arr: [1] })];
    const params = {
      items,
      conflictOnKeys: ["name"],
      onConflict: "replace" as const,
      tag: "conflict-tag",
      projectId: "conflict-project",
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
      projectId: "fail-project",
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
    await objModel.create(obj);
    assert.ok(obj.projectId);
    assert.ok(obj.tag);
    await storage.update({
      query: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      update: { b: 3, c: 4 },
      by: "merger",
      byType: "user",
      updateWay: "merge",
    });
    const updated = await objModel.findOne({ id: obj.id }).lean();
    expect(updated).toBeTruthy();
    if (!updated) throw new Error("Updated object not found in DB");
    expect(updated.objRecord.a).toBe(1);
    expect(updated.objRecord.b).toBe(3);
    expect(updated.objRecord.c).toBe(4);
  });

  it("should merge arrays with mergeButReplaceArrays", async () => {
    const obj = makeObjFields({ objRecord: { arr: [1, 2], x: 1 } });
    await objModel.create(obj);
    assert.ok(obj.projectId);
    assert.ok(obj.tag);
    await storage.update({
      query: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      update: { arr: [3, 4] },
      by: "merger",
      byType: "user",
      updateWay: "mergeButReplaceArrays",
    });
    const updated = await objModel.findOne({ id: obj.id }).lean();
    expect(updated).toBeTruthy();
    if (!updated) throw new Error("Updated object not found in DB");
    expect(Array.isArray(updated.objRecord.arr)).toBe(true);
    expect(updated.objRecord.arr).toEqual([3, 4]);
  });

  it("should merge arrays with mergeButConcatArrays", async () => {
    const obj = makeObjFields({ objRecord: { arr: [1, 2] } });
    await objModel.create(obj);
    assert.ok(obj.projectId);
    assert.ok(obj.tag);
    await storage.update({
      query: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      update: { arr: [3, 4] },
      by: "merger",
      byType: "user",
      updateWay: "mergeButConcatArrays",
    });
    const updated = await objModel.findOne({ id: obj.id }).lean();
    expect(updated).toBeTruthy();
    if (!updated) throw new Error("Updated object not found in DB");
    expect(updated.objRecord.arr).toEqual([1, 2, 3, 4]);
  });

  it("should merge arrays with mergeButKeepArrays", async () => {
    const obj = makeObjFields({ objRecord: { arr: [1, 2] } });
    await objModel.create(obj);
    assert.ok(obj.projectId);
    assert.ok(obj.tag);
    await storage.update({
      query: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      update: { arr: [3, 4] },
      by: "merger",
      byType: "user",
      updateWay: "mergeButKeepArrays",
    });
    const updated = await objModel.findOne({ id: obj.id }).lean();
    expect(updated).toBeTruthy();
    if (!updated) throw new Error("Updated object not found in DB");
    expect(updated.objRecord.arr).toEqual([1, 2]);
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
      projectId: "batch-project",
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
    const objs = Array.from({ length: 5 }, (_, i) =>
      makeObjFields({
        objRecord: { name: `BulkUpd${i}` },
        projectId: "bulkupd-project",
        tag: "bulkupd-tag",
      })
    );
    await objModel.insertMany(objs);
    const result = await storage.bulkUpdate({
      query: { metaQuery: { projectId: { eq: "bulkupd-project" } } },
      tag: "bulkupd-tag",
      update: { updated: true },
      by: "batch-updater",
      byType: "user",
      batchSize: 2,
    });
    expect(result.updatedCount).toBe(5);
    const updatedObjs = await objModel
      .find({ projectId: "bulkupd-project", tag: "bulkupd-tag" })
      .lean();
    updatedObjs.forEach((obj) =>
      expect(obj.objRecord?.updated ?? false).toBe(true)
    );
  });

  it("should rollback on transaction error", async () => {
    const obj = makeObjFields();
    await storage.create({ objs: [obj as IObj] });
    let errorCaught = false;
    try {
      await storage.withTransaction(async (txStorage) => {
        await txStorage.update({
          query: { metaQuery: { projectId: { eq: String(obj.projectId) } } },
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
    const inDb = await objModel.findOne({ id: obj.id }).lean();
    expect(inDb?.objRecord?.name ?? "").not.toBe("TxFail");
  });

  it("should commit on successful transaction", async () => {
    const obj = makeObjFields();
    await storage.create({ objs: [obj as IObj] });
    await storage.withTransaction(async (txStorage) => {
      await txStorage.update({
        query: { metaQuery: { projectId: { eq: String(obj.projectId) } } },
        tag: String(obj.tag),
        update: { name: "TxSuccess" },
        by: "tx",
        byType: "user",
      });
    });
    const inDb = await objModel.findOne({ id: obj.id }).lean();
    expect(inDb?.objRecord?.name ?? "").toBe("TxSuccess");
  });

  describe("complex queries", () => {
    it("should query nested fields (objRecord.user.name)", async () => {
      const obj1 = makeObjFields({
        objRecord: { user: { name: "john", age: 30 } },
        tag: "nested-tag",
        projectId: "nested-project",
      });
      const obj2 = makeObjFields({
        objRecord: { user: { name: "jane", age: 25 } },
        tag: "nested-tag",
        projectId: "nested-project",
      });
      await objModel.insertMany([obj1, obj2]);
      const result = await storage.read({
        query: {
          metaQuery: { projectId: { eq: "nested-project" } },
          recordQuery: [{ op: "eq", field: "user.name", value: "john" }],
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
        projectId: "array-project",
      });
      const obj2 = makeObjFields({
        objRecord: { metadata: { tags: ["other"] } },
        tag: "array-tag",
        projectId: "array-project",
      });
      await objModel.insertMany([obj1, obj2]);
      const result = await storage.read({
        query: {
          metaQuery: { projectId: { eq: "array-project" } },
          recordQuery: [
            {
              op: "in",
              field: "metadata.tags",
              value: ["important", "urgent"],
            },
          ],
        },
        tag: "array-tag",
      });
      expect(result.objs.length).toBe(1);
      expect(result.objs[0].objRecord.metadata.tags).toContain("important");
    });

    it("should query boolean field existence (objRecord.settings.enabled)", async () => {
      const obj1 = makeObjFields({
        objRecord: { settings: { enabled: true } },
        tag: "exists-tag",
        projectId: "exists-project",
      });
      const obj2 = makeObjFields({
        objRecord: { settings: {} },
        tag: "exists-tag",
        projectId: "exists-project",
      });
      await objModel.insertMany([obj1, obj2]);
      const result = await storage.read({
        query: {
          metaQuery: { projectId: { eq: "exists-project" } },
          recordQuery: [
            { op: "exists", field: "settings.enabled", value: true },
          ],
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
        projectId: "num-project",
      });
      const obj2 = makeObjFields({
        objRecord: { stats: { views: 500 } },
        tag: "num-tag",
        projectId: "num-project",
      });
      await objModel.insertMany([obj1, obj2]);
      const result = await storage.read({
        query: {
          metaQuery: { projectId: { eq: "num-project" } },
          recordQuery: [{ op: "gte", field: "stats.views", value: 1000 }],
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
        projectId: "between-project",
      });
      const obj2 = makeObjFields({
        objRecord: { created: 2019 },
        tag: "between-tag",
        projectId: "between-project",
      });
      await objModel.insertMany([obj1, obj2]);
      const result = await storage.read({
        query: {
          metaQuery: { projectId: { eq: "between-project" } },
          recordQuery: [
            { op: "between", field: "created", value: [2020, 2025] },
          ],
        },
        tag: "between-tag",
      });
      expect(result.objs.length).toBe(1);
      expect(result.objs[0].objRecord.created).toBe(2022);
    });

    it("should support logical OR at obj-level", async () => {
      const obj1 = makeObjFields({
        objRecord: { status: "active", score: 200 },
        tag: "logic-tag",
        projectId: "logic-project",
      });
      const obj2 = makeObjFields({
        objRecord: { status: "inactive", score: 50 },
        tag: "logic-tag",
        projectId: "logic-project",
      });
      const obj3 = makeObjFields({
        objRecord: { status: "active", score: 80 },
        tag: "logic-tag",
        projectId: "logic-project",
      });
      await objModel.insertMany([obj1, obj2, obj3]);
      const result = await storage.read({
        query: {
          or: [
            {
              metaQuery: { projectId: { eq: "logic-project" } },
              recordQuery: [
                { op: "eq", field: "status", value: "active" },
                { op: "gt", field: "score", value: 100 },
              ],
            },
            {
              metaQuery: { projectId: { eq: "logic-project" } },
              recordQuery: [{ op: "eq", field: "status", value: "inactive" }],
            },
            {
              metaQuery: { projectId: { eq: "logic-project" } },
              recordQuery: [{ op: "lt", field: "score", value: 100 }],
            },
          ],
        },
        tag: "logic-tag",
      });
      // Should match obj1 (leaf A) and obj2/obj3 (leaf B/C)
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
        projectId: "meta-project",
      });
      const obj2 = makeObjFields({
        createdAt: new Date(now.getTime() - 100000000),
        updatedBy: "user2",
        tag: "meta-tag",
        projectId: "meta-project",
      });
      await objModel.insertMany([obj1, obj2]);
      const result = await storage.read({
        query: {
          metaQuery: {
            projectId: { eq: "meta-project" },
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
        projectId: "meta-updated-project",
      });
      const obj2 = makeObjFields({
        updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 48), // 2 days ago
        tag: "meta-updated-tag",
        projectId: "meta-updated-project",
      });
      await objModel.insertMany([obj1, obj2]);

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
        projectId: "top-level-project",
      });
      const obj2 = makeObjFields({
        shouldIndex: false,
        tag: "top-level-tag",
        projectId: "top-level-project",
      });
      await objModel.insertMany([obj1, obj2]);

      const result = await storage.read({
        query: {
          metaQuery: {
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
        projectId: "combined-project",
      });

      // Object 2: shouldIndex=false, updatedAt=now (should not match - wrong shouldIndex)
      const obj2 = makeObjFields({
        shouldIndex: false,
        updatedAt: now,
        tag: "combined-tag",
        projectId: "combined-project",
      });

      // Object 3: shouldIndex=true, updatedAt=2 days ago (should not match - wrong updatedAt)
      const obj3 = makeObjFields({
        shouldIndex: true,
        updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 48),
        tag: "combined-tag",
        projectId: "combined-project",
      });

      // Object 4: shouldIndex=false, updatedAt=2 days ago (should not match - both wrong)
      const obj4 = makeObjFields({
        shouldIndex: false,
        updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 48),
        tag: "combined-tag",
        projectId: "combined-project",
      });

      await objModel.insertMany([obj1, obj2, obj3, obj4]);

      const result = await storage.read({
        query: {
          metaQuery: {
            updatedAt: {
              gte: cutoffDate.getTime(),
            },
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
        projectId: "sort-string-project",
      });
      const obj2 = makeObjFields({
        objRecord: { name: "Alice" },
        tag: "sort-string-tag",
        projectId: "sort-string-project",
      });
      const obj3 = makeObjFields({
        objRecord: { name: "Bob" },
        tag: "sort-string-tag",
        projectId: "sort-string-project",
      });
      await objModel.insertMany([obj1, obj2, obj3]);

      const result = await storage.read({
        query: { metaQuery: { projectId: { eq: "sort-string-project" } } },
        tag: "sort-string-tag",
        sort: [{ field: "objRecord.name", direction: "asc" }],
        fields: new Map([
          [
            "name",
            {
              id: "name-field",
              path: "name",
              type: "string",
              arrayTypes: [],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              projectId: "sort-string-project",
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
        projectId: "sort-number-project",
      });
      const obj2 = makeObjFields({
        objRecord: { score: 100 },
        tag: "sort-number-tag",
        projectId: "sort-number-project",
      });
      const obj3 = makeObjFields({
        objRecord: { score: 200 },
        tag: "sort-number-tag",
        projectId: "sort-number-project",
      });
      await objModel.insertMany([obj1, obj2, obj3]);

      const result = await storage.read({
        query: { metaQuery: { projectId: { eq: "sort-number-project" } } },
        tag: "sort-number-tag",
        sort: [{ field: "objRecord.score", direction: "asc" }],
        fields: new Map([
          [
            "score",
            {
              id: "score-field",
              path: "score",
              type: "number",
              arrayTypes: [],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              projectId: "sort-number-project",
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
        projectId: "sort-nested-project",
      });
      const obj2 = makeObjFields({
        objRecord: { user: { age: 25 } },
        tag: "sort-nested-tag",
        projectId: "sort-nested-project",
      });
      const obj3 = makeObjFields({
        objRecord: { user: { age: 35 } },
        tag: "sort-nested-tag",
        projectId: "sort-nested-project",
      });
      await objModel.insertMany([obj1, obj2, obj3]);

      const result = await storage.read({
        query: { metaQuery: { projectId: { eq: "sort-nested-project" } } },
        tag: "sort-nested-tag",
        sort: [{ field: "objRecord.user.age", direction: "asc" }],
        fields: new Map([
          [
            "user.age",
            {
              id: "user-age-field",
              path: "user.age",
              type: "number",
              arrayTypes: [],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              projectId: "sort-nested-project",
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
        projectId: "sort-deep-project",
      });
      const obj2 = makeObjFields({
        objRecord: { stats: { views: { daily: 500 } } },
        tag: "sort-deep-tag",
        projectId: "sort-deep-project",
      });
      const obj3 = makeObjFields({
        objRecord: { stats: { views: { daily: 1000 } } },
        tag: "sort-deep-tag",
        projectId: "sort-deep-project",
      });
      await objModel.insertMany([obj1, obj2, obj3]);

      const result = await storage.read({
        query: { metaQuery: { projectId: { eq: "sort-deep-project" } } },
        tag: "sort-deep-tag",
        sort: [{ field: "objRecord.stats.views.daily", direction: "asc" }],
        fields: new Map([
          [
            "stats.views.daily",
            {
              id: "stats-views-daily-field",
              path: "stats.views.daily",
              type: "number",
              arrayTypes: [],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              projectId: "sort-deep-project",
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
        projectId: "sort-multi-project",
      });
      const obj2 = makeObjFields({
        objRecord: { category: "A", priority: 2 },
        tag: "sort-multi-tag",
        projectId: "sort-multi-project",
      });
      const obj3 = makeObjFields({
        objRecord: { category: "B", priority: 1 },
        tag: "sort-multi-tag",
        projectId: "sort-multi-project",
      });
      const obj4 = makeObjFields({
        objRecord: { category: "B", priority: 2 },
        tag: "sort-multi-tag",
        projectId: "sort-multi-project",
      });
      await objModel.insertMany([obj1, obj2, obj3, obj4]);

      const result = await storage.read({
        query: { metaQuery: { projectId: { eq: "sort-multi-project" } } },
        tag: "sort-multi-tag",
        sort: [
          { field: "objRecord.category", direction: "asc" },
          { field: "objRecord.priority", direction: "desc" },
        ],
        fields: new Map([
          [
            "category",
            {
              id: "category-field",
              path: "category",
              type: "string",
              arrayTypes: [],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              projectId: "sort-multi-project",
              groupId: "test-group",
              tag: "sort-multi-tag",
            },
          ],
          [
            "priority",
            {
              id: "priority-field",
              path: "priority",
              type: "number",
              arrayTypes: [],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              projectId: "sort-multi-project",
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
        projectId: "sort-top-level-project",
      });
      const obj2 = makeObjFields({
        createdAt: now,
        updatedAt: new Date(now.getTime() + 1000),
        tag: "sort-top-level-tag",
        projectId: "sort-top-level-project",
      });
      const obj3 = makeObjFields({
        createdAt: new Date(now.getTime() + 2000),
        updatedAt: now,
        tag: "sort-top-level-tag",
        projectId: "sort-top-level-project",
      });
      await objModel.insertMany([obj1, obj2, obj3]);

      const result = await storage.read({
        query: { metaQuery: { projectId: { eq: "sort-top-level-project" } } },
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
        projectId: "sort-skip-project",
      });
      const obj2 = makeObjFields({
        objRecord: { name: "Alice", score: 100 },
        tag: "sort-skip-tag",
        projectId: "sort-skip-project",
      });
      const obj3 = makeObjFields({
        objRecord: { name: "Bob", score: 200 },
        tag: "sort-skip-tag",
        projectId: "sort-skip-project",
      });
      await objModel.insertMany([obj1, obj2, obj3]);

      const result = await storage.read({
        query: { metaQuery: { projectId: { eq: "sort-skip-project" } } },
        tag: "sort-skip-tag",
        sort: [
          { field: "objRecord.name", direction: "asc" }, // Should be skipped (not in fields)
          { field: "objRecord.score", direction: "asc" }, // Should work (in fields)
        ],
        fields: new Map([
          [
            "score",
            {
              id: "score-field",
              path: "score",
              type: "number",
              arrayTypes: [],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              projectId: "sort-skip-project",
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
        projectId: "sort-mixed-project",
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
        projectId: "sort-mixed-project",
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
        projectId: "sort-mixed-project",
      });
      await objModel.insertMany([obj1, obj2, obj3]);

      const result = await storage.read({
        query: { metaQuery: { projectId: { eq: "sort-mixed-project" } } },
        tag: "sort-mixed-tag",
        sort: [
          { field: "objRecord.status", direction: "asc" },
          { field: "objRecord.priority", direction: "desc" },
          { field: "objRecord.metadata.views", direction: "asc" },
        ],
        fields: new Map([
          [
            "priority",
            {
              id: "priority-field",
              path: "priority",
              type: "number",
              arrayTypes: [],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              projectId: "sort-mixed-project",
              groupId: "test-group",
              tag: "sort-mixed-tag",
            },
          ],
          [
            "metadata.views",
            {
              id: "metadata-views-field",
              path: "metadata.views",
              type: "number",
              arrayTypes: [],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              projectId: "sort-mixed-project",
              groupId: "test-group",
              tag: "sort-mixed-tag",
            },
          ],
        ]),
      });

      expect(result.objs).toHaveLength(3);
      // Should be sorted by status ASC, then priority DESC (if available), then metadata.views ASC
      // The exact order depends on how the MongoQueryTransformer handles mixed field types
    });

    it("should handle empty sort array", async () => {
      const obj1 = makeObjFields({
        objRecord: { name: "First" },
        tag: "sort-empty-tag",
        projectId: "sort-empty-project",
      });
      const obj2 = makeObjFields({
        objRecord: { name: "Second" },
        tag: "sort-empty-tag",
        projectId: "sort-empty-project",
      });
      await objModel.insertMany([obj1, obj2]);

      const result = await storage.read({
        query: { metaQuery: { projectId: { eq: "sort-empty-project" } } },
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
        projectId: "sort-invalid-project",
      });
      await objModel.insertMany([obj1]);

      const result = await storage.read({
        query: { metaQuery: { projectId: { eq: "sort-invalid-project" } } },
        tag: "sort-invalid-tag",
        sort: [
          { field: "objRecord.nonexistent", direction: "asc" }, // Should be skipped (not in fields)
          { field: "objRecord.name", direction: "asc" }, // Should work (in fields)
        ],
        fields: new Map([
          [
            "name",
            {
              id: "name-field",
              path: "name",
              type: "string",
              arrayTypes: [],
              isArrayCompressed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              projectId: "sort-invalid-project",
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

    await objModel.create(obj);

    // Create array field metadata
    const arrayFieldsMap = new Map([
      [
        "reportsTo",
        {
          id: "array-field-1",
          field: "reportsTo",
          path: "reportsTo",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [{ op: "eq", field: "reportsTo.userId", value: "user1" }],
      },
      tag: obj.tag,
      fields: arrayFieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle array field queries with query.and.op", async () => {
    const obj = makeObjFields({
      objRecord: {
        query: {
          and: [
            { op: "eq", field: "status", value: "active" },
            { op: "in", field: "type", value: ["error", "warning"] },
          ],
        },
      },
    });

    await objModel.create(obj);

    // Create array field metadata
    const arrayFieldsMap = new Map([
      [
        "query.and",
        {
          id: "array-field-2",
          field: "query.and",
          path: "query.and",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [{ op: "eq", field: "query.and.op", value: "eq" }],
      },
      tag: obj.tag,
      fields: arrayFieldsMap,
    });

    expect(result.objs).toHaveLength(1);
    expect(result.objs[0].id).toBe(obj.id);
  });

  it("should handle deeply nested array field queries", async () => {
    const obj = makeObjFields({
      objRecord: {
        query: {
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

    await objModel.create(obj);

    // Create array field metadata for both levels
    const arrayFieldsMap = new Map([
      [
        "query.and",
        {
          id: "array-field-3",
          field: "query.and",
          path: "query.and",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      [
        "query.and.op",
        {
          id: "array-field-4",
          field: "query.and.op",
          path: "query.and.op",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [{ op: "eq", field: "query.and.op.subOp", value: "eq" }],
      },
      tag: obj.tag,
      fields: arrayFieldsMap,
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

    await objModel.create(obj);

    const arrayFieldsMap = new Map([
      [
        "reportsTo",
        {
          id: "array-field-5",
          field: "reportsTo",
          path: "reportsTo",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [
          { op: "in", field: "reportsTo.userId", value: ["user1", "user3"] },
        ],
      },
      tag: obj.tag,
      fields: arrayFieldsMap,
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

    await objModel.create(obj);

    const arrayFieldsMap = new Map([
      [
        "reportsTo",
        {
          id: "array-field-6",
          field: "reportsTo",
          path: "reportsTo",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [
          {
            op: "not_in",
            field: "reportsTo.userId",
            value: ["user3", "user4"],
          },
        ],
      },
      tag: obj.tag,
      fields: arrayFieldsMap,
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

    await objModel.create(obj);

    const arrayFieldsMap = new Map([
      [
        "scores",
        {
          id: "array-field-7",
          field: "scores",
          path: "scores",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [{ op: "gte", field: "scores.value", value: 90 }],
      },
      tag: obj.tag,
      fields: arrayFieldsMap,
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

    await objModel.create(obj);

    const arrayFieldsMap = new Map([
      [
        "reportsTo",
        {
          id: "array-field-8",
          field: "reportsTo",
          path: "reportsTo",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [
          { op: "exists", field: "reportsTo.permissions", value: true },
        ],
      },
      tag: obj.tag,
      fields: arrayFieldsMap,
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

    await objModel.create(obj);

    const arrayFieldsMap = new Map([
      [
        "reportsTo",
        {
          id: "array-field-9",
          field: "reportsTo",
          path: "reportsTo",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [
          { op: "like", field: "reportsTo.email", value: ".*@example\\.com" },
        ],
      },
      tag: obj.tag,
      fields: arrayFieldsMap,
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

    await objModel.create(obj);

    const arrayFieldsMap = new Map([
      [
        "reportsTo",
        {
          id: "array-field-10",
          field: "reportsTo",
          path: "reportsTo",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [
          { op: "eq", field: "name", value: "Test Object" },
          { op: "eq", field: "reportsTo.userId", value: "user1" },
        ],
      },
      tag: obj.tag,
      fields: arrayFieldsMap,
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

    await objModel.create(obj);

    const arrayFieldsMap = new Map([
      [
        "reportsTo",
        {
          id: "array-field-11",
          field: "reportsTo",
          path: "reportsTo",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [{ op: "eq", field: "reportsTo.userId", value: "user1" }],
      },
      tag: obj.tag,
      fields: arrayFieldsMap,
    });

    expect(result.objs).toHaveLength(0);
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

    await objModel.create(obj);

    const arrayFieldsMap = new Map([
      [
        "scores",
        {
          id: "array-field-12",
          field: "scores",
          path: "scores",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [
          { op: "between", field: "scores.value", value: [80, 95] },
        ],
      },
      tag: obj.tag,
      fields: arrayFieldsMap,
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

    await objModel.create(obj);

    const arrayFieldsMap = new Map([
      [
        "tags",
        {
          id: "array-field-13",
          field: "tags",
          path: "tags",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [{ op: "eq", field: "tags", value: "typescript" }],
      },
      tag: obj.tag,
      fields: arrayFieldsMap,
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

    await objModel.create(obj);

    const arrayFieldsMap = new Map([
      [
        "reportsTo",
        {
          id: "array-field-14",
          field: "reportsTo",
          path: "reportsTo",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [{ op: "neq", field: "reportsTo.userId", value: "user3" }],
      },
      tag: obj.tag,
      fields: arrayFieldsMap,
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

    await objModel.create(obj);

    const arrayFieldsMap = new Map([
      [
        "workflow.steps",
        {
          id: "array-field-15",
          field: "workflow.steps",
          path: "workflow.steps",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      [
        "workflow.steps.actions",
        {
          id: "array-field-16",
          field: "workflow.steps.actions",
          path: "workflow.steps.actions",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj.projectId!,
          groupId: obj.groupId!,
          tag: obj.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [
          { op: "eq", field: "workflow.steps.actions.type", value: "email" },
        ],
      },
      tag: obj.tag,
      fields: arrayFieldsMap,
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
    await objModel.create([obj1, obj2]);
    const arrayFieldsMap = new Map([
      [
        "reportsTo",
        {
          id: "array-field-mixed",
          field: "reportsTo",
          path: "reportsTo",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          projectId: obj1.projectId!,
          groupId: obj1.groupId!,
          tag: obj1.tag!,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);
    // Should find obj1 for array, obj2 for scalar
    const result1 = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj1.projectId } },
        recordQuery: [{ op: "eq", field: "reportsTo.userId", value: "user1" }],
      },
      tag: obj1.tag,
      fields: arrayFieldsMap,
    });
    const result2 = await storage.read({
      query: {
        metaQuery: { projectId: { eq: obj2.projectId } },
        recordQuery: [{ op: "eq", field: "reportsTo.userId", value: "user2" }],
      },
      tag: obj2.tag,
      fields: new Map(),
    });
    expect(result1.objs.some((o) => o.id === obj1.id)).toBe(true);
    expect(result2.objs.some((o) => o.id === obj2.id)).toBe(true);
  });

  describe("read (pagination, includeDeleted, date)", () => {
    it("should return page, limit, and hasMore correctly", async () => {
      const tag = "page-tag";
      const projectId = "page-project";
      const objs = Array.from({ length: 5 }, (_, i) =>
        makeObjFields({
          objRecord: { name: `Item${i}` },
          tag,
          projectId,
        })
      );
      await objModel.insertMany(objs);
      const result = await storage.read({
        query: { metaQuery: { projectId: { eq: projectId } } },
        tag,
        page: 0,
        limit: 2,
      });
      expect(result.page).toBe(0);
      expect(result.limit).toBe(2);
      expect(result.objs).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      const result2 = await storage.read({
        query: { metaQuery: { projectId: { eq: projectId } } },
        tag,
        page: 2,
        limit: 2,
      });
      expect(result2.page).toBe(2);
      expect(result2.objs).toHaveLength(1);
      expect(result2.hasMore).toBe(false);
    });

    it("should exclude deleted by default and include them when includeDeleted is true", async () => {
      const objLive = makeObjFields({
        tag: "del-tag",
        projectId: "del-project",
        deletedAt: null,
      });
      const objDeleted = makeObjFields({
        tag: "del-tag",
        projectId: "del-project",
        deletedAt: new Date(),
        deletedBy: "user",
        deletedByType: "user",
      });
      await objModel.insertMany([objLive, objDeleted]);
      const resultDefault = await storage.read({
        query: { metaQuery: { projectId: { eq: "del-project" } } },
        tag: "del-tag",
      });
      expect(resultDefault.objs).toHaveLength(1);
      expect(resultDefault.objs[0].id).toBe(objLive.id);
      const resultInclude = await storage.read({
        query: { metaQuery: { projectId: { eq: "del-project" } } },
        tag: "del-tag",
        includeDeleted: true,
      });
      expect(resultInclude.objs).toHaveLength(2);
    });

    it("should use custom date when provided", async () => {
      const obj = makeObjFields({
        tag: "date-tag",
        projectId: "date-project",
      });
      await objModel.create(obj);
      const customDate = new Date("2020-06-01T00:00:00Z");
      const result = await storage.read({
        query: { metaQuery: { projectId: { eq: "date-project" } } },
        tag: "date-tag",
        date: customDate,
      });
      expect(result.objs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("update (no matches, shouldIndex, fieldsToIndex)", () => {
    it("should return updatedCount 0 and empty updatedObjs when no objects match", async () => {
      const result = await storage.update({
        query: { metaQuery: { projectId: { eq: "nonexistent-project" } } },
        tag: "nonexistent-tag",
        update: { name: "Noop" },
        by: "user",
        byType: "user",
      });
      expect(result.updatedCount).toBe(0);
      expect(result.updatedObjs).toEqual([]);
    });

    it("should apply shouldIndex and fieldsToIndex on update", async () => {
      const obj = makeObjFields({
        objRecord: { name: "Original" },
        shouldIndex: true,
        fieldsToIndex: ["name"],
        tag: "idx-tag",
        projectId: "idx-project",
      });
      await objModel.create(obj);
      await storage.update({
        query: { metaQuery: { projectId: { eq: "idx-project" } } },
        tag: "idx-tag",
        update: { name: "Updated" },
        by: "user",
        byType: "user",
        shouldIndex: false,
        fieldsToIndex: ["name", "other"],
      });
      const updated = await objModel.findOne({ id: obj.id }).lean();
      expect(updated).toBeTruthy();
      expect(updated?.shouldIndex).toBe(false);
      expect(updated?.fieldsToIndex).toEqual(["name", "other"]);
    });
  });

  describe("delete (no matches, date override)", () => {
    it("should return deletedCount 0 when no objects match", async () => {
      const result = await storage.delete({
        query: { metaQuery: { projectId: { eq: "nonexistent" } } },
        tag: "nonexistent-tag",
        deletedBy: "user",
        deletedByType: "user",
      });
      expect(result.deletedCount).toBe(0);
    });

    it("should use provided date for deletedAt", async () => {
      const obj = makeObjFields({
        tag: "deldate-tag",
        projectId: "deldate-project",
      });
      await objModel.create(obj);
      const deleteDate = new Date("2022-05-15T12:00:00Z");
      await storage.delete({
        query: { metaQuery: { projectId: { eq: "deldate-project" } } },
        tag: "deldate-tag",
        date: deleteDate,
        deletedBy: "user",
        deletedByType: "user",
      });
      const doc = await objModel.findOne({ id: obj.id }).lean();
      expect(doc?.deletedAt).toEqual(deleteDate);
    });
  });

  describe("bulkUpsert (edge cases)", () => {
    it("should treat all items as new when conflictOnKeys is empty", async () => {
      const items = [
        makeInputObjRecord({ name: "A" }),
        makeInputObjRecord({ name: "B" }),
      ];
      const result = await storage.bulkUpsert({
        items,
        conflictOnKeys: [],
        tag: "empty-conflict-tag",
        projectId: "empty-conflict-project",
        groupId: "g",
        createdBy: "u",
        createdByType: "user",
      });
      expect(result.newObjs.length).toBe(2);
      expect(result.updatedObjs.length).toBe(0);
      const result2 = await storage.bulkUpsert({
        items,
        conflictOnKeys: [],
        tag: "empty-conflict-tag",
        projectId: "empty-conflict-project",
        groupId: "g",
        createdBy: "u",
        createdByType: "user",
      });
      expect(result2.newObjs.length).toBe(2);
    });

    it("should apply fieldsToIndex and dedupe", async () => {
      const items = [makeInputObjRecord({ name: "F1", x: 1 })];
      const result = await storage.bulkUpsert({
        items,
        conflictOnKeys: ["name"],
        onConflict: "replace",
        tag: "fti-tag",
        projectId: "fti-project",
        groupId: "g",
        createdBy: "u",
        createdByType: "user",
        fieldsToIndex: ["name", "x", "name"],
      });
      expect(result.newObjs.length).toBe(1);
      const created = await objModel.findOne({ "objRecord.name": "F1" }).lean();
      expect(created?.fieldsToIndex).toEqual(["name", "x"]);
    });

    it("should handle empty items array", async () => {
      const result = await storage.bulkUpsert({
        items: [],
        conflictOnKeys: ["name"],
        tag: "empty-items-tag",
        projectId: "empty-items-project",
        groupId: "g",
        createdBy: "u",
        createdByType: "user",
      });
      expect(result.newObjs).toHaveLength(0);
      expect(result.updatedObjs).toHaveLength(0);
      expect(result.totalProcessed).toBe(0);
    });
  });

  describe("bulkUpdate (count, onProgress, no matches)", () => {
    it("should limit updates when count is provided", async () => {
      const objs = Array.from({ length: 5 }, (_, i) =>
        makeObjFields({
          objRecord: { name: `CU${i}` },
          tag: "count-tag",
          projectId: "count-project",
        })
      );
      await objModel.insertMany(objs);
      const result = await storage.bulkUpdate({
        query: { metaQuery: { projectId: { eq: "count-project" } } },
        tag: "count-tag",
        update: { touched: true },
        by: "u",
        byType: "user",
        count: 2,
      });
      expect(result.updatedCount).toBe(2);
      expect(result.totalProcessed).toBe(2);
      const touched = await objModel.countDocuments({
        "objRecord.touched": true,
      });
      expect(touched).toBe(2);
    });

    it("should call onProgress with totalProcessed and total", async () => {
      const objs = Array.from({ length: 3 }, (_, i) =>
        makeObjFields({
          objRecord: { name: `OP${i}` },
          tag: "progress-tag",
          projectId: "progress-project",
        })
      );
      await objModel.insertMany(objs);
      const progressCalls: [number, number][] = [];
      await storage.bulkUpdate({
        query: { metaQuery: { projectId: { eq: "progress-project" } } },
        tag: "progress-tag",
        update: { x: 1 },
        by: "u",
        byType: "user",
        onProgress: (processed, total) =>
          progressCalls.push([processed, total]),
      });
      expect(progressCalls.length).toBeGreaterThanOrEqual(1);
      expect(progressCalls.some(([p]) => p === 3)).toBe(true);
    });

    it("should return empty when no objects match", async () => {
      const result = await storage.bulkUpdate({
        query: { metaQuery: { projectId: { eq: "no-match-project" } } },
        tag: "no-match-tag",
        update: { x: 1 },
        by: "u",
        byType: "user",
      });
      expect(result.updatedCount).toBe(0);
      expect(result.updatedObjs).toHaveLength(0);
      expect(result.totalProcessed).toBe(0);
    });

    it("should apply shouldIndex and fieldsToIndex in bulkUpdate", async () => {
      const obj = makeObjFields({
        objRecord: { name: "BU" },
        shouldIndex: true,
        fieldsToIndex: ["name"],
        tag: "bu-idx-tag",
        projectId: "bu-idx-project",
      });
      await objModel.create(obj);
      await storage.bulkUpdate({
        query: { metaQuery: { projectId: { eq: "bu-idx-project" } } },
        tag: "bu-idx-tag",
        update: { extra: 1 },
        by: "u",
        byType: "user",
        shouldIndex: false,
        fieldsToIndex: ["name", "extra"],
      });
      const updated = await objModel.findOne({ id: obj.id }).lean();
      expect(updated?.shouldIndex).toBe(false);
      expect(updated?.fieldsToIndex).toEqual(["name", "extra"]);
    });
  });

  describe("bulkDelete (deleteMany false, hardDelete)", () => {
    it("should delete only one when deleteMany is false", async () => {
      const objs = Array.from({ length: 3 }, (_, i) =>
        makeObjFields({
          objRecord: { type: "T" },
          tag: "dm-false-tag",
          projectId: "dm-false-project",
        })
      );
      await objModel.insertMany(objs);
      const result = await storage.bulkDelete({
        query: { metaQuery: { projectId: { eq: "dm-false-project" } } },
        tag: "dm-false-tag",
        deletedBy: "u",
        deletedByType: "user",
        deleteMany: false,
      });
      expect(result.deletedCount).toBe(1);
      const remaining = await objModel.find({
        projectId: "dm-false-project",
        tag: "dm-false-tag",
        deletedAt: null,
      });
      expect(remaining).toHaveLength(2);
    });

    it("should hard delete when hardDelete is true", async () => {
      const obj = makeObjFields({
        tag: "hard-tag",
        projectId: "hard-project",
      });
      await objModel.create(obj);
      const result = await storage.bulkDelete({
        query: { metaQuery: { projectId: { eq: "hard-project" } } },
        tag: "hard-tag",
        deletedBy: "u",
        deletedByType: "user",
        deleteMany: true,
        hardDelete: true,
      });
      expect(result.deletedCount).toBe(1);
      const doc = await objModel.findOne({ id: obj.id }).lean();
      expect(doc).toBeNull();
    });
  });

  describe("cleanupDeletedObjs", () => {
    it("should permanently remove soft-deleted objects in batches", async () => {
      const obj1 = makeObjFields({
        tag: "cleanup-tag",
        projectId: "cleanup-project",
        deletedAt: new Date(),
        deletedBy: "u",
        deletedByType: "user",
      });
      const obj2 = makeObjFields({
        tag: "cleanup-tag",
        projectId: "cleanup-project",
        deletedAt: new Date(),
        deletedBy: "u",
        deletedByType: "user",
      });
      await objModel.insertMany([obj1, obj2]);
      const result = await storage.cleanupDeletedObjs({ batchSize: 10 });
      expect(result.cleanedCount).toBe(2);
      const found1 = await objModel.findOne({ id: obj1.id }).lean();
      const found2 = await objModel.findOne({ id: obj2.id }).lean();
      expect(found1).toBeNull();
      expect(found2).toBeNull();
    });

    it("should call onProgress with cleaned count", async () => {
      const obj = makeObjFields({
        tag: "cleanup-progress-tag",
        projectId: "cleanup-progress-project",
        deletedAt: new Date(),
        deletedBy: "u",
        deletedByType: "user",
      });
      await objModel.insertMany([obj]);
      const progressCalls: number[] = [];
      await storage.cleanupDeletedObjs({
        batchSize: 10,
        onProgress: (count) => progressCalls.push(count),
      });
      expect(progressCalls).toContain(1);
      expect(progressCalls[progressCalls.length - 1]).toBe(1);
    });

    it("should return cleanedCount 0 when no deleted objects exist", async () => {
      const result = await storage.cleanupDeletedObjs();
      expect(result.cleanedCount).toBe(0);
    });
  });
});

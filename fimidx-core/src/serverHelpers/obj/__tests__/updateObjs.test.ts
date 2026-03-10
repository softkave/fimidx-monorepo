import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getObjModel } from "../../../db/fimidx.mongo.js";
import type { IInputObjRecord, IObj } from "../../../definitions/obj.js";
import { createStorage } from "../../../storage/config.js";
import { getManyObjs } from "../getObjs.js";
import { updateManyObjs } from "../updateObjs.js";

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

function makeObjs(overrides: Partial<IObj> = {}): IObj {
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
const defaultProjectId = "test-project-updateObjs";
const defaultTag = "test-tag-updateObjs";
const defaultBy = "tester";
const defaultByType = "user";

describe.each(backends)("updateManyObjs integration (%s)", (backend) => {
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
      await model.deleteMany({ projectId: defaultProjectId, tag: defaultTag });
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

  it("updates objects by query (default updateWay)", async () => {
    const obj = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "bar", count: 1 },
    });
    await storage.create({ objs: [obj] });
    const update = { foo: "baz", count: 2 };
    const result = await updateManyObjs({
      objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      update,
      by: defaultBy,
      byType: defaultByType,
      storageType: backend.type,
    });
    expect(result.updatedCount).toBe(1);
    const read = await getManyObjs({
      objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      storageType: backend.type,
    });
    expect(read.objs[0].objRecord.foo).toBe("baz");
    expect(read.objs[0].objRecord.count).toBe(2);
  });

  it("updates with updateWay=replace", async () => {
    const obj = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "bar", arr: [1, 2] },
    });
    await storage.create({ objs: [obj] });
    const update = { foo: "replaced", arr: [9, 8] };
    const result = await updateManyObjs({
      objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      update,
      by: defaultBy,
      byType: defaultByType,
      updateWay: "replace",
      storageType: backend.type,
    });
    expect(result.updatedCount).toBe(1);
    const read = await getManyObjs({
      objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      storageType: backend.type,
    });
    expect(read.objs[0].objRecord).toEqual(update);
  });

  it("updates with updateWay=merge", async () => {
    const obj = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "bar", a: 1 },
    });
    await storage.create({ objs: [obj] });
    const update = { foo: "merged", b: 2 };
    const result = await updateManyObjs({
      objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      update,
      by: defaultBy,
      byType: defaultByType,
      updateWay: "merge",
      storageType: backend.type,
    });
    expect(result.updatedCount).toBe(1);
    const read = await getManyObjs({
      objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      storageType: backend.type,
    });
    expect(read.objs[0].objRecord.foo).toBe("merged");
    expect(read.objs[0].objRecord.a).toBe(1);
    expect(read.objs[0].objRecord.b).toBe(2);
  });

  it("updates with updateWay=mergeButReplaceArrays", async () => {
    const obj = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { arr: [1, 2], foo: "bar" },
    });
    await storage.create({ objs: [obj] });
    const update = { arr: [3, 4], foo: "baz" };
    const result = await updateManyObjs({
      objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      update,
      by: defaultBy,
      byType: defaultByType,
      updateWay: "mergeButReplaceArrays",
      storageType: backend.type,
    });
    expect(result.updatedCount).toBe(1);
    const read = await getManyObjs({
      objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      storageType: backend.type,
    });
    expect(read.objs[0].objRecord.arr).toEqual([3, 4]);
    expect(read.objs[0].objRecord.foo).toBe("baz");
  });

  it("updates with updateWay=mergeButConcatArrays", async () => {
    const obj = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { arr: [1, 2], foo: "bar" },
    });
    await storage.create({ objs: [obj] });
    const update = { arr: [3, 4], foo: "baz" };
    const result = await updateManyObjs({
      objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      update,
      by: defaultBy,
      byType: defaultByType,
      updateWay: "mergeButConcatArrays",
      storageType: backend.type,
    });
    expect(result.updatedCount).toBe(1);
    const read = await getManyObjs({
      objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      storageType: backend.type,
    });
    expect(read.objs[0].objRecord.arr).toEqual([1, 2, 3, 4]);
    expect(read.objs[0].objRecord.foo).toBe("baz");
  });

  it("updates with updateWay=mergeButKeepArrays", async () => {
    const obj = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { arr: [1, 2], foo: "bar" },
    });
    await storage.create({ objs: [obj] });
    const update = { arr: [3, 4], foo: "baz" };
    const result = await updateManyObjs({
      objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      update,
      by: defaultBy,
      byType: defaultByType,
      updateWay: "mergeButKeepArrays",
      storageType: backend.type,
    });
    expect(result.updatedCount).toBe(1);
    const read = await getManyObjs({
      objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      storageType: backend.type,
    });
    expect(read.objs[0].objRecord.arr).toEqual([1, 2]);
    expect(read.objs[0].objRecord.foo).toBe("baz");
  });

  it("respects count limit", async () => {
    const objs = [
      makeObjs({
        projectId: defaultProjectId,
        tag: defaultTag,
        objRecord: { foo: "a" },
      }),
      makeObjs({
        projectId: defaultProjectId,
        tag: defaultTag,
        objRecord: { foo: "b" },
      }),
      makeObjs({
        projectId: defaultProjectId,
        tag: defaultTag,
        objRecord: { foo: "c" },
      }),
    ];
    await storage.create({ objs });
    const update = { foo: "updated" };
    const result = await updateManyObjs({
      objQuery: { metaQuery: { projectId: { eq: defaultProjectId } } },
      tag: defaultTag,
      update,
      by: defaultBy,
      byType: defaultByType,
      count: 2,
      storageType: backend.type,
    });
    expect(result.updatedCount).toBe(2);
    const read = await getManyObjs({
      objQuery: { metaQuery: { projectId: { eq: defaultProjectId } } },
      tag: defaultTag,
      storageType: backend.type,
    });
    const updated = read.objs.filter((o) => o.objRecord.foo === "updated");
    expect(updated.length).toBe(2);
  });

  it("returns 0 if no match", async () => {
    const update = { foo: "no-match" };
    const result = await updateManyObjs({
      objQuery: { metaQuery: { projectId: { eq: "nonexistent-project" } } },
      tag: "nonexistent-tag",
      update,
      by: defaultBy,
      byType: defaultByType,
      storageType: backend.type,
    });
    expect(result.updatedCount).toBe(0);
  });
});

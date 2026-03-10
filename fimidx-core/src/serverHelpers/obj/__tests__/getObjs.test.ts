import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getObjModel } from "../../../db/fimidx.mongo.js";
import { db, objFields as objFieldsTable } from "../../../db/fimidx.sqlite.js";
import type {
  IInputObjRecord,
  IObj,
  IObjField,
  IObjSortList,
} from "../../../definitions/obj.js";
import { createStorage } from "../../../storage/config.js";
import { getManyObjs, metaQueryToRecordQueryList } from "../getObjs.js";

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

function makeObjField(overrides: Partial<IObjField> = {}): IObjField {
  const now = new Date();
  return {
    id: uuidv7(),
    createdAt: now,
    updatedAt: now,
    projectId: "test-project",
    groupId: "test-group",
    path: "order",
    type: "number",
    arrayTypes: [],
    isArrayCompressed: false,
    tag: "test-tag",
    ...overrides,
  };
}

async function setupObjFields(fields: IObjField[]) {
  // Clean up existing fields first
  if (fields.length > 0) {
    await db
      .delete(objFieldsTable)
      .where(
        and(
          eq(objFieldsTable.projectId, fields[0].projectId),
          eq(objFieldsTable.tag, fields[0].tag)
        )
      )
      .execute();
  }

  // Insert new fields
  if (fields.length > 0) {
    await db.insert(objFieldsTable).values(fields);
  }
}

describe("metaQueryToRecordQueryList", () => {
  it("converts string meta queries", () => {
    const metaQuery = {
      foo: { eq: "bar", neq: "baz", in: ["a", "b"], not_in: ["c"] },
    };
    const result = metaQueryToRecordQueryList({ metaQuery });
    expect(result).toEqual([
      { op: "eq", field: "foo", value: "bar" },
      { op: "neq", field: "foo", value: "baz" },
      { op: "in", field: "foo", value: ["a", "b"] },
      { op: "not_in", field: "foo", value: ["c"] },
    ]);
  });

  it("converts number meta queries", () => {
    const metaQuery = {
      num: {
        eq: 1,
        gt: 0,
        gte: 1,
        lt: 10,
        lte: 9,
        between: [1, 5] as [number, number],
      },
    };
    const result = metaQueryToRecordQueryList({ metaQuery });
    expect(result).toEqual([
      { op: "eq", field: "num", value: 1 },
      { op: "gt", field: "num", value: 0 },
      { op: "gte", field: "num", value: 1 },
      { op: "lt", field: "num", value: 10 },
      { op: "lte", field: "num", value: 9 },
      { op: "between", field: "num", value: [1, 5] },
    ]);
  });

  it("projectlies prefix if provided", () => {
    const metaQuery = { foo: { eq: "bar" } };
    const result = metaQueryToRecordQueryList({ metaQuery, prefix: "p" });
    expect(result).toEqual([{ op: "eq", field: "p.foo", value: "bar" }]);
  });

  it("returns undefined for empty metaQuery", () => {
    expect(metaQueryToRecordQueryList({ metaQuery: {} })).toBeUndefined();
  });
});

// Use unique identifiers for each test file to prevent conflicts
const defaultProjectId = "test-project-getObjs";
const defaultTag = "test-tag-getObjs";

describe.each(backends)("getManyObjs integration (%s)", (backend) => {
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

    // Clean up obj fields for all backends
    await db
      .delete(objFieldsTable)
      .where(
        and(
          eq(objFieldsTable.projectId, defaultProjectId),
          eq(objFieldsTable.tag, defaultTag)
        )
      )
      .execute();
  });

  it("returns objects by projectId and tag", async () => {
    const obj = makeObjs({ projectId: defaultProjectId, tag: defaultTag });
    await storage.create({ objs: [obj] });
    const result = await getManyObjs({
      objQuery: { metaQuery: { projectId: { eq: obj.projectId } } },
      tag: obj.tag,
      storageType: backend.type,
    });
    expect(result.objs.length).toBeGreaterThanOrEqual(1);
    expect(result.objs.some((o: IObj) => o.id === obj.id)).toBe(true);
  });

  it("supports recordQuery (eq)", async () => {
    const obj = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "bar" },
    });

    // Set up obj fields for querying
    const objField = makeObjField({
      projectId: defaultProjectId,
      tag: defaultTag,
      path: "foo",
      type: "string",
      arrayTypes: [],
    });
    await setupObjFields([objField]);

    await storage.create({ objs: [obj] });
    const result = await getManyObjs({
      objQuery: {
        metaQuery: { projectId: { eq: obj.projectId } },
        recordQuery: [{ op: "eq", field: "foo", value: "bar" }],
      },
      tag: obj.tag,
      storageType: backend.type,
    });
    expect(result.objs.length).toBeGreaterThanOrEqual(1);
    expect(result.objs.some((o: IObj) => o.id === obj.id)).toBe(true);
  });

  it("supports recordQuery (neq)", async () => {
    const obj1 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "bar" },
    });
    const obj2 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "baz" },
    });

    // Set up obj fields for querying
    const objField = makeObjField({
      projectId: defaultProjectId,
      tag: defaultTag,
      path: "foo",
      type: "string",
      arrayTypes: [],
    });
    await setupObjFields([objField]);

    await storage.create({ objs: [obj1, obj2] });
    const result = await getManyObjs({
      objQuery: {
        metaQuery: { projectId: { eq: defaultProjectId } },
        recordQuery: [{ op: "neq", field: "foo", value: "bar" }],
      },
      tag: defaultTag,
      storageType: backend.type,
    });
    expect(result.objs.length).toBeGreaterThanOrEqual(1);
    expect(result.objs.some((o: IObj) => o.id === obj2.id)).toBe(true);
    expect(result.objs.some((o: IObj) => o.id === obj1.id)).toBe(false);
  });

  it("supports recordQuery (in)", async () => {
    const obj1 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "bar" },
    });
    const obj2 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "baz" },
    });
    const obj3 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "qux" },
    });

    // Set up obj fields for querying
    const objField = makeObjField({
      projectId: defaultProjectId,
      tag: defaultTag,
      path: "foo",
      type: "string",
      arrayTypes: [],
    });
    await setupObjFields([objField]);

    await storage.create({ objs: [obj1, obj2, obj3] });
    const result = await getManyObjs({
      objQuery: {
        metaQuery: { projectId: { eq: defaultProjectId } },
        recordQuery: [{ op: "in", field: "foo", value: ["bar", "baz"] }],
      },
      tag: defaultTag,
      storageType: backend.type,
    });
    expect(result.objs.length).toBeGreaterThanOrEqual(2);
    expect(result.objs.some((o: IObj) => o.id === obj1.id)).toBe(true);
    expect(result.objs.some((o: IObj) => o.id === obj2.id)).toBe(true);
    expect(result.objs.some((o: IObj) => o.id === obj3.id)).toBe(false);
  });

  it("supports recordQuery (not_in)", async () => {
    const obj1 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "bar" },
    });
    const obj2 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "baz" },
    });
    const obj3 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "qux" },
    });

    // Set up obj fields for querying
    const objField = makeObjField({
      projectId: defaultProjectId,
      tag: defaultTag,
      path: "foo",
      type: "string",
      arrayTypes: [],
    });
    await setupObjFields([objField]);

    await storage.create({ objs: [obj1, obj2, obj3] });
    const result = await getManyObjs({
      objQuery: {
        metaQuery: { projectId: { eq: defaultProjectId } },
        recordQuery: [{ op: "not_in", field: "foo", value: ["bar", "baz"] }],
      },
      tag: defaultTag,
      storageType: backend.type,
    });
    expect(result.objs.length).toBeGreaterThanOrEqual(1);
    expect(result.objs.some((o: IObj) => o.id === obj1.id)).toBe(false);
    expect(result.objs.some((o: IObj) => o.id === obj2.id)).toBe(false);
    expect(result.objs.some((o: IObj) => o.id === obj3.id)).toBe(true);
  });

  it("supports recordQuery (gt, gte, lt, lte)", async () => {
    const obj1 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { num: 5 },
    });
    const obj2 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { num: 10 },
    });
    const obj3 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { num: 15 },
    });

    // Set up obj fields for querying
    const objField = makeObjField({
      projectId: defaultProjectId,
      tag: defaultTag,
      path: "num",
      type: "number",
      arrayTypes: [],
    });
    await setupObjFields([objField]);

    await storage.create({ objs: [obj1, obj2, obj3] });

    // Test gt
    let result = await getManyObjs({
      objQuery: {
        metaQuery: { projectId: { eq: defaultProjectId } },
        recordQuery: [{ op: "gt", field: "num", value: 5 }],
      },
      tag: defaultTag,
      storageType: backend.type,
    });
    expect(result.objs.length).toBeGreaterThanOrEqual(2);
    expect(result.objs.some((o: IObj) => o.id === obj1.id)).toBe(false);
    expect(result.objs.some((o: IObj) => o.id === obj2.id)).toBe(true);
    expect(result.objs.some((o: IObj) => o.id === obj3.id)).toBe(true);

    // Test gte
    result = await getManyObjs({
      objQuery: {
        metaQuery: { projectId: { eq: defaultProjectId } },
        recordQuery: [{ op: "gte", field: "num", value: 10 }],
      },
      tag: defaultTag,
      storageType: backend.type,
    });
    expect(result.objs.length).toBeGreaterThanOrEqual(2);
    expect(result.objs.some((o: IObj) => o.id === obj1.id)).toBe(false);
    expect(result.objs.some((o: IObj) => o.id === obj2.id)).toBe(true);
    expect(result.objs.some((o: IObj) => o.id === obj3.id)).toBe(true);

    // Test lt
    result = await getManyObjs({
      objQuery: {
        metaQuery: { projectId: { eq: defaultProjectId } },
        recordQuery: [{ op: "lt", field: "num", value: 15 }],
      },
      tag: defaultTag,
      storageType: backend.type,
    });
    expect(result.objs.length).toBeGreaterThanOrEqual(2);
    expect(result.objs.some((o: IObj) => o.id === obj1.id)).toBe(true);
    expect(result.objs.some((o: IObj) => o.id === obj2.id)).toBe(true);
    expect(result.objs.some((o: IObj) => o.id === obj3.id)).toBe(false);

    // Test lte
    result = await getManyObjs({
      objQuery: {
        metaQuery: { projectId: { eq: defaultProjectId } },
        recordQuery: [{ op: "lte", field: "num", value: 10 }],
      },
      tag: defaultTag,
      storageType: backend.type,
    });
    expect(result.objs.length).toBeGreaterThanOrEqual(2);
    expect(result.objs.some((o: IObj) => o.id === obj1.id)).toBe(true);
    expect(result.objs.some((o: IObj) => o.id === obj2.id)).toBe(true);
    expect(result.objs.some((o: IObj) => o.id === obj3.id)).toBe(false);
  });

  it("supports recordQuery (between)", async () => {
    const obj1 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { num: 5 },
    });
    const obj2 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { num: 10 },
    });
    const obj3 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { num: 15 },
    });

    // Set up obj fields for querying
    const objField = makeObjField({
      projectId: defaultProjectId,
      tag: defaultTag,
      path: "num",
      type: "number",
      arrayTypes: [],
    });
    await setupObjFields([objField]);

    await storage.create({ objs: [obj1, obj2, obj3] });
    const result = await getManyObjs({
      objQuery: {
        metaQuery: { projectId: { eq: defaultProjectId } },
        recordQuery: [{ op: "between", field: "num", value: [8, 12] }],
      },
      tag: defaultTag,
      storageType: backend.type,
    });
    expect(result.objs.length).toBeGreaterThanOrEqual(1);
    expect(result.objs.some((o: IObj) => o.id === obj1.id)).toBe(false);
    expect(result.objs.some((o: IObj) => o.id === obj2.id)).toBe(true);
    expect(result.objs.some((o: IObj) => o.id === obj3.id)).toBe(false);
  });

  it("supports multiple recordQuery conditions", async () => {
    const obj1 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "bar", num: 5 },
    });
    const obj2 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "bar", num: 15 },
    });
    const obj3 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "baz", num: 10 },
    });

    // Set up obj fields for querying
    const objFields = [
      makeObjField({
        projectId: defaultProjectId,
        tag: defaultTag,
        path: "foo",
        type: "string",
        arrayTypes: [],
      }),
      makeObjField({
        projectId: defaultProjectId,
        tag: defaultTag,
        path: "num",
        type: "number",
        arrayTypes: [],
      }),
    ];
    await setupObjFields(objFields);

    await storage.create({ objs: [obj1, obj2, obj3] });
    const result = await getManyObjs({
      objQuery: {
        metaQuery: { projectId: { eq: defaultProjectId } },
        recordQuery: [
          { op: "eq", field: "foo", value: "bar" },
          { op: "lt", field: "num", value: 10 },
        ],
      },
      tag: defaultTag,
      storageType: backend.type,
    });
    expect(result.objs.length).toBeGreaterThanOrEqual(1);
    expect(result.objs.some((o: IObj) => o.id === obj1.id)).toBe(true);
    expect(result.objs.some((o: IObj) => o.id === obj2.id)).toBe(false);
    expect(result.objs.some((o: IObj) => o.id === obj3.id)).toBe(false);
  });

  it("supports metaQuery", async () => {
    const obj1 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "bar", num: 5 },
    });
    const obj2 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { foo: "baz", num: 15 },
    });

    // Set up obj fields for querying
    const objFields = [
      makeObjField({
        projectId: defaultProjectId,
        tag: defaultTag,
        path: "foo",
        type: "string",
        arrayTypes: [],
      }),
      makeObjField({
        projectId: defaultProjectId,
        tag: defaultTag,
        path: "num",
        type: "number",
        arrayTypes: [],
      }),
    ];
    await setupObjFields(objFields);

    await storage.create({ objs: [obj1, obj2] });
    const result = await getManyObjs({
      objQuery: {
        metaQuery: {
          projectId: { eq: defaultProjectId },
          createdBy: { eq: "tester" },
        },
      },
      tag: defaultTag,
      storageType: backend.type,
    });
    expect(result.objs.length).toBeGreaterThanOrEqual(2);
    expect(result.objs.some((o: IObj) => o.id === obj1.id)).toBe(true);
    expect(result.objs.some((o: IObj) => o.id === obj2.id)).toBe(true);
  });

  it("supports sorting", async () => {
    const obj1 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { name: "Alice", age: 25 },
    });
    const obj2 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { name: "Bob", age: 30 },
    });
    const obj3 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      objRecord: { name: "Charlie", age: 20 },
    });

    // Set up obj fields for querying
    const objFields = [
      makeObjField({
        projectId: defaultProjectId,
        tag: defaultTag,
        path: "name",
        type: "string",
        arrayTypes: [],
      }),
      makeObjField({
        projectId: defaultProjectId,
        tag: defaultTag,
        path: "age",
        type: "number",
        arrayTypes: [],
      }),
    ];
    await setupObjFields(objFields);

    await storage.create({ objs: [obj1, obj2, obj3] });

    // Test ascending sort
    let result = await getManyObjs({
      objQuery: { metaQuery: { projectId: { eq: defaultProjectId } } },
      tag: defaultTag,
      sort: [{ field: "name", direction: "asc" }] as IObjSortList,
      storageType: backend.type,
    });
    expect(result.objs.length).toBe(3);
    expect(result.objs[0].objRecord.name).toBe("Alice");
    expect(result.objs[1].objRecord.name).toBe("Bob");
    expect(result.objs[2].objRecord.name).toBe("Charlie");

    // Test descending sort
    result = await getManyObjs({
      objQuery: { metaQuery: { projectId: { eq: defaultProjectId } } },
      tag: defaultTag,
      sort: [{ field: "age", direction: "desc" }] as IObjSortList,
      storageType: backend.type,
    });
    expect(result.objs.length).toBe(3);
    expect(result.objs[0].objRecord.age).toBe(30);
    expect(result.objs[1].objRecord.age).toBe(25);
    expect(result.objs[2].objRecord.age).toBe(20);
  });

  it("supports pagination", async () => {
    const objs = [
      makeObjs({
        projectId: defaultProjectId,
        tag: defaultTag,
        objRecord: { id: 1 },
      }),
      makeObjs({
        projectId: defaultProjectId,
        tag: defaultTag,
        objRecord: { id: 2 },
      }),
      makeObjs({
        projectId: defaultProjectId,
        tag: defaultTag,
        objRecord: { id: 3 },
      }),
      makeObjs({
        projectId: defaultProjectId,
        tag: defaultTag,
        objRecord: { id: 4 },
      }),
      makeObjs({
        projectId: defaultProjectId,
        tag: defaultTag,
        objRecord: { id: 5 },
      }),
    ];

    await storage.create({ objs });

    // Test first page
    let result = await getManyObjs({
      objQuery: { metaQuery: { projectId: { eq: defaultProjectId } } },
      tag: defaultTag,
      page: 0,
      limit: 2,
      storageType: backend.type,
    });
    expect(result.objs.length).toBe(2);
    expect(result.page).toBe(0);
    expect(result.limit).toBe(2);
    expect(result.hasMore).toBe(true);

    // Test second page
    result = await getManyObjs({
      objQuery: { metaQuery: { projectId: { eq: defaultProjectId } } },
      tag: defaultTag,
      page: 1,
      limit: 2,
      storageType: backend.type,
    });
    expect(result.objs.length).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
    expect(result.hasMore).toBe(true);

    // Test last page
    result = await getManyObjs({
      objQuery: { metaQuery: { projectId: { eq: defaultProjectId } } },
      tag: defaultTag,
      page: 2,
      limit: 2,
      storageType: backend.type,
    });
    expect(result.objs.length).toBe(1);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(2);
    expect(result.hasMore).toBe(false);
  });

  it("excludes deleted objects by default", async () => {
    const obj1 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
    });
    const obj2 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      deletedAt: new Date(),
      deletedBy: "deleter",
      deletedByType: "user",
    });

    await storage.create({ objs: [obj1, obj2] });
    const result = await getManyObjs({
      objQuery: { metaQuery: { projectId: { eq: defaultProjectId } } },
      tag: defaultTag,
      storageType: backend.type,
    });
    expect(result.objs.length).toBe(1);
    expect(result.objs[0].id).toBe(obj1.id);
  });

  it("includes deleted objects when topLevelFields.deletedAt is null", async () => {
    const obj1 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
    });
    const obj2 = makeObjs({
      projectId: defaultProjectId,
      tag: defaultTag,
      deletedAt: new Date(),
      deletedBy: "deleter",
      deletedByType: "user",
    });

    await storage.create({ objs: [obj1, obj2] });
    const result = await getManyObjs({
      objQuery: {
        metaQuery: {
          projectId: { eq: defaultProjectId },
          deletedAt: null,
        },
      },
      tag: defaultTag,
      storageType: backend.type,
    });
    expect(result.objs.length).toBe(2);
    expect(result.objs.some((o: IObj) => o.id === obj1.id)).toBe(true);
    expect(result.objs.some((o: IObj) => o.id === obj2.id)).toBe(true);
  });
});

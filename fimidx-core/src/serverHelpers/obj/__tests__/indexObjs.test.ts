import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getObjModel } from "../../../db/fimidx.mongo.js";
import { db, objFields as objFieldsTable } from "../../../db/fimidx.postgres.js";
import type { IInputObjRecord, IObj } from "../../../definitions/obj.js";
import type { IProjectObjRecord } from "../../../definitions/project.js";
import { createStorage } from "../../../storage/config.js";
import { addProject } from "../../project/addProject.js";
import { indexObjs, indexObjsBatch } from "../indexObjs.js";

const backends: { type: "mongo" | "postgres"; name: string }[] = [
  { type: "mongo", name: "MongoDB" },
  // { type: "postgres", name: "Postgres" },
];

const TEST_PROJECT_ID = "test-project-indexObjs";
const TEST_GROUP_ID = "test-group-indexObjs";
const TEST_TAG = "test-tag-indexObjs";

function makeInputObjRecord(
  overrides: Partial<IInputObjRecord> = {}
): IInputObjRecord {
  return {
    name: "Test Object",
    value: Math.random(),
    nested: {
      deep: {
        field: "nested-value",
        number: 42,
        boolean: true,
      },
    },
    array: ["item1", "item2", "item3"],
    ...overrides,
  };
}

function makeObj(overrides: Partial<IObj> = {}): IObj {
  const now = new Date();
  return {
    id: uuidv7(),
    createdAt: now,
    updatedAt: now,
    createdBy: "tester",
    createdByType: "user",
    updatedBy: "tester",
    updatedByType: "user",
    projectId: TEST_PROJECT_ID,
    groupId: TEST_GROUP_ID,
    tag: TEST_TAG,
    objRecord: makeInputObjRecord(),
    deletedAt: null,
    deletedBy: null,
    deletedByType: null,
    shouldIndex: true,
    fieldsToIndex: null,
    ...overrides,
  };
}

function makeProject(
  overrides: Partial<IProjectObjRecord> = {}
): IProjectObjRecord {
  return {
    name: "Test Project " + uuidv7(),
    description: "Test project for indexObjs",
    orgId: TEST_GROUP_ID,
    objFieldsToIndex: ["name", "value", "nested.deep.field"],
    ...overrides,
  };
}

describe.each(backends)("indexObjs integration (%s)", (backend) => {
  let storage: ReturnType<typeof createStorage>;
  let cleanup: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    storage = createStorage({ type: backend.type });

    // Setup MongoDB connection if needed
    if (backend.type === "mongo") {
      const model = getObjModel();
      if (model && model.db && model.db.asPromise) {
        await model.db.asPromise();
      }
      cleanup = async () => {
        await model.db.close();
      };
    }
  });

  afterAll(async () => {
    if (cleanup) await cleanup();
  });

  beforeEach(async () => {
    // Clean up test data
    if (backend.type === "mongo") {
      const model = getObjModel();
      await model.deleteMany({
        projectId: TEST_PROJECT_ID,
        tag: TEST_TAG,
      });
    } else if (backend.type === "postgres") {
      const { fimidxPostgresDb, objs } = await import(
        "../../../db/fimidx.postgres.js"
      );
      await fimidxPostgresDb
        .delete(objs)
        .where(
          and(eq(objs.projectId, TEST_PROJECT_ID), eq(objs.tag, TEST_TAG))
        );
    }

    // Clean up Postgres objField rows
    await db
      .delete(objFieldsTable)
      .where(
        and(
          eq(objFieldsTable.projectId, TEST_PROJECT_ID),
          eq(objFieldsTable.tag, TEST_TAG)
        )
      )
      .execute();
  });

  describe("indexObjs function", () => {
    it("should index objects that should be indexed", async () => {
      // Create objects that should be indexed
      const objs = [
        makeObj({ shouldIndex: true, objRecord: { name: "obj1", value: 100 } }),
        makeObj({ shouldIndex: true, objRecord: { name: "obj2", value: 200 } }),
        makeObj({
          shouldIndex: false,
          objRecord: { name: "obj3", value: 300 },
        }), // Should not be indexed
      ];

      await storage.create({ objs });

      // Run indexObjs
      await indexObjs({ lastSuccessAt: null, storageType: backend.type });

      // Check that objFields were created for indexed objects
      const fields = await db
        .select()
        .from(objFieldsTable)
        .where(
          and(
            eq(objFieldsTable.projectId, TEST_PROJECT_ID),
            eq(objFieldsTable.tag, TEST_TAG)
          )
        );

      expect(fields.length).toBeGreaterThan(0);

      // Should have fields for "name" and "value" from the indexed objects
      const fieldNames = fields.map((f) => f.path);
      expect(fieldNames).toContain("name");
      expect(fieldNames).toContain("value");
    }, 20_000);

    it("should respect lastSuccessAt parameter", async () => {
      const oldDate = new Date("2023-01-01T00:00:00.000Z");
      const recentDate = new Date();

      // Create objects with different update times
      const oldObj = makeObj({
        shouldIndex: true,
        updatedAt: oldDate,
        objRecord: { name: "old-obj", value: 100 },
      });
      const recentObj = makeObj({
        shouldIndex: true,
        updatedAt: recentDate,
        objRecord: { name: "recent-obj", value: 200 },
      });

      await storage.create({ objs: [oldObj, recentObj] });

      const lastSuccessAt = new Date("2023-06-01T00:00:00.000Z");
      await indexObjs({ lastSuccessAt, storageType: backend.type });

      // Should only index the recent object
      const fields = await db
        .select()
        .from(objFieldsTable)
        .where(
          and(
            eq(objFieldsTable.projectId, TEST_PROJECT_ID),
            eq(objFieldsTable.tag, TEST_TAG)
          )
        );

      // The fields should exist for the recent object's data
      const fieldNames = fields.map((f) => f.path);
      expect(fieldNames).toContain("name");
      expect(fieldNames).toContain("value");
    });

    it("should handle project-specific fieldsToIndex", async () => {
      // Create an project with specific fields to index
      const projectWithFields = makeProject({
        objFieldsToIndex: ["name", "nested.deep.field"],
      });

      const { project } = await addProject({
        args: {
          name: projectWithFields.name + "-specific",
          description: projectWithFields.description || undefined,
          orgId: projectWithFields.orgId,
          objFieldsToIndex: projectWithFields.objFieldsToIndex || undefined,
        },
        by: "tester",
        byType: "user",
      });

      // Create objects with the new project ID
      const objs = [
        makeObj({
          projectId: project.id,
          shouldIndex: true,
          objRecord: {
            name: "test-name",
            value: "should-not-index",
            nested: { deep: { field: "should-index" } },
          },
        }),
      ];

      await storage.create({ objs });

      // Run indexObjs
      await indexObjs({ lastSuccessAt: null, storageType: backend.type });

      // Check that only the specified fields were indexed
      const fields = await db
        .select()
        .from(objFieldsTable)
        .where(
          and(
            eq(objFieldsTable.projectId, project.id),
            eq(objFieldsTable.tag, TEST_TAG)
          )
        );

      const fieldPaths = fields.map((f) => f.path);
      expect(fieldPaths).toContain("name");
      expect(fieldPaths).toContain("nested.deep.field");
      expect(fieldPaths).not.toContain("value");
    });

    it("should handle object-specific fieldsToIndex", async () => {
      // Create objects with their own fieldsToIndex
      const objs = [
        makeObj({
          shouldIndex: true,
          fieldsToIndex: ["name", "value"],
          objRecord: {
            name: "test-name",
            value: "test-value",
            nested: { deep: { field: "should-not-index" } },
          },
        }),
      ];

      await storage.create({ objs });

      // Run indexObjs
      await indexObjs({ lastSuccessAt: null, storageType: backend.type });

      // Check that only the object-specific fields were indexed
      const fields = await db
        .select()
        .from(objFieldsTable)
        .where(
          and(
            eq(objFieldsTable.projectId, TEST_PROJECT_ID),
            eq(objFieldsTable.tag, TEST_TAG)
          )
        );

      const fieldPaths = fields.map((f) => f.path);
      expect(fieldPaths).toContain("name");
      expect(fieldPaths).toContain("value");
      expect(fieldPaths).not.toContain("nested.deep.field");
    });

    it("should handle different data types correctly", async () => {
      const objs = [
        makeObj({
          shouldIndex: true,
          objRecord: {
            stringField: "string-value",
            numberField: 42,
            booleanField: true,
            nullField: null,
            arrayField: ["item1", "item2"],
            nestedField: { key: "value" },
          },
        }),
      ];

      await storage.create({ objs });

      await indexObjs({ lastSuccessAt: null, storageType: backend.type });

      // Check that different types are handled correctly
      const fields = await db
        .select()
        .from(objFieldsTable)
        .where(
          and(
            eq(objFieldsTable.projectId, TEST_PROJECT_ID),
            eq(objFieldsTable.tag, TEST_TAG)
          )
        );

      const stringField = fields.find((f) => f.path === "stringField");
      const numberField = fields.find((f) => f.path === "numberField");
      const booleanField = fields.find((f) => f.path === "booleanField");
      const nullField = fields.find((f) => f.path === "nullField");
      const arrayField = fields.find((f) => f.path === "arrayField.[*]");
      const nestedField = fields.find((f) => f.path === "nestedField.key");

      expect(stringField).toBeDefined();
      expect(stringField?.type).toBe("string");
      expect(stringField?.isArrayCompressed).toBe(false);

      expect(numberField).toBeDefined();
      expect(numberField?.type).toBe("number");
      expect(numberField?.isArrayCompressed).toBe(false);

      expect(booleanField).toBeDefined();
      expect(booleanField?.type).toBe("boolean");
      expect(booleanField?.isArrayCompressed).toBe(false);

      expect(nullField).toBeDefined();
      expect(nullField?.type).toBe("null");
      expect(nullField?.isArrayCompressed).toBe(false);

      expect(arrayField).toBeDefined();
      expect(arrayField?.isArrayCompressed).toBe(true);

      expect(nestedField).toBeDefined();
      expect(nestedField?.type).toBe("string");
      expect(nestedField?.isArrayCompressed).toBe(false);
    });

    it("should handle pagination correctly", async () => {
      // Create more objects than the batch size
      const objs = Array.from({ length: 1500 }, (_, i) =>
        makeObj({
          shouldIndex: true,
          objRecord: { name: `obj-${i}`, value: i },
        })
      );

      await storage.create({ objs });

      await indexObjs({ lastSuccessAt: null, storageType: backend.type });

      // Check that all objects were indexed
      const fields = await db
        .select()
        .from(objFieldsTable)
        .where(
          and(
            eq(objFieldsTable.projectId, TEST_PROJECT_ID),
            eq(objFieldsTable.tag, TEST_TAG)
          )
        );

      // Should have fields for "name" and "value"
      const fieldPaths = fields.map((f) => f.path);
      expect(fieldPaths).toContain("name");
      expect(fieldPaths).toContain("value");
    }, 10000);

    it("should update existing fields", async () => {
      // Create initial object
      const obj = makeObj({
        shouldIndex: true,
        objRecord: { name: "initial-name", value: 100 },
      });

      await storage.create({ objs: [obj] });

      // Run indexObjs first time
      await indexObjs({ lastSuccessAt: null, storageType: backend.type });

      // Update the object
      const updatedObj = {
        ...obj,
        objRecord: { name: "updated-name", value: 200, newField: "new-value" },
        updatedAt: new Date(),
      };

      await storage.update({
        query: {
          metaQuery: {
            projectId: { eq: obj.projectId },
            id: { eq: obj.id },
          },
        },
        update: updatedObj.objRecord,
        by: "tester",
        byType: "user",
      });

      // Run indexObjs again
      await indexObjs({ lastSuccessAt: null, storageType: backend.type });

      // Check that fields were updated
      const fields = await db
        .select()
        .from(objFieldsTable)
        .where(
          and(
            eq(objFieldsTable.projectId, TEST_PROJECT_ID),
            eq(objFieldsTable.tag, TEST_TAG)
          )
        );

      const fieldPaths = fields.map((f) => f.path);
      expect(fieldPaths).toContain("name");
      expect(fieldPaths).toContain("value");
      expect(fieldPaths).toContain("newField");
    }, 10000);
  });

  describe("indexObjsBatch function", () => {
    it("should index a batch of objects", async () => {
      const objs = [
        makeObj({ objRecord: { name: "obj1", value: 100 } }),
        makeObj({ objRecord: { name: "obj2", value: 200 } }),
      ];

      const mockGetProject = () => null;

      await indexObjsBatch({ objs, getProject: mockGetProject });

      const fields = await db
        .select()
        .from(objFieldsTable)
        .where(
          and(
            eq(objFieldsTable.projectId, TEST_PROJECT_ID),
            eq(objFieldsTable.tag, TEST_TAG)
          )
        );

      const fieldPaths = fields.map((f) => f.path);
      expect(fieldPaths).toContain("name");
      expect(fieldPaths).toContain("value");
    });
  });
});

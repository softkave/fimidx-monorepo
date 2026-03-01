import { describe, expect, it } from "vitest";
import type {
  IObjField,
  IObjQuery,
  IObjSortList,
} from "../../definitions/obj.js";
import { MongoQueryTransformer } from "./MongoQueryTransformer.js";

describe("MongoQueryTransformer", () => {
  const transformer = new MongoQueryTransformer();
  const now = new Date("2024-01-01T00:00:00Z");

  describe("transformFilter", () => {
    it("should add projectId to filter", () => {
      const query: IObjQuery = { projectId: "project1" };
      expect(transformer.transformFilter(query, now)).toEqual({
        projectId: "project1",
      });
    });

    it("should add partQuery to filter (eq)", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: { and: [{ op: "eq", field: "foo", value: "bar" }] },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [{ projectId: "project1" }, { "objRecord.foo": { $eq: "bar" } }],
      });
    });

    it("should add metaQuery to filter (string eq)", () => {
      const query: IObjQuery = {
        projectId: "project1",
        metaQuery: { id: { eq: "id1" } },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [{ projectId: "project1" }, { id: "id1" }],
      });
    });

    it("should combine partQuery and metaQuery", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: { and: [{ op: "eq", field: "foo", value: "bar" }] },
        metaQuery: { id: { eq: "id1" } },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { projectId: "project1" },
          { "objRecord.foo": { $eq: "bar" } },
          { id: "id1" },
        ],
      });
    });
  });

  describe("transformSort", () => {
    it("should transform sort list", () => {
      const sort: IObjSortList = [
        { field: "foo", direction: "asc" },
        { field: "bar", direction: "desc" },
      ];
      expect(transformer.transformSort(sort)).toEqual({
        "objRecord.foo": 1,
        "objRecord.bar": -1,
      });
    });

    it("should include all sort fields regardless of fields array", () => {
      const sort: IObjSortList = [
        { field: "objRecord.price", direction: "asc" },
        { field: "objRecord.name", direction: "desc" },
        { field: "objRecord.quantity", direction: "asc" },
      ];
      const fields: IObjField[] = [
        // fields array is now ignored
      ];
      const result = transformer.transformSort(sort, fields);
      expect(result).toEqual({
        "objRecord.price": 1,
        "objRecord.name": -1,
        "objRecord.quantity": 1,
      });
    });

    it("should include all sort fields even if not in fields array", () => {
      const sort: IObjSortList = [
        { field: "objRecord.price", direction: "asc" },
        { field: "objRecord.unknown", direction: "desc" },
      ];
      const fields: IObjField[] = [
        // fields array is now ignored
      ];
      const result = transformer.transformSort(sort, fields);
      expect(result).toEqual({
        "objRecord.price": 1,
        "objRecord.unknown": -1,
      });
    });

    it("should include all sort fields even if fields array is empty", () => {
      const sort: IObjSortList = [
        { field: "objRecord.name", direction: "asc" },
        { field: "objRecord.description", direction: "desc" },
      ];
      const fields: IObjField[] = [
        // fields array is now ignored
      ];
      const result = transformer.transformSort(sort, fields);
      expect(result).toEqual({
        "objRecord.name": 1,
        "objRecord.description": -1,
      });
    });

    it("should handle nested fields correctly", () => {
      const sort: IObjSortList = [
        { field: "objRecord.product.price", direction: "asc" },
      ];
      const fields: IObjField[] = [
        // fields array is now ignored
      ];
      const result = transformer.transformSort(sort, fields);
      expect(result).toEqual({
        "objRecord.product.price": 1,
      });
    });

    it("should include string fields regardless of fields array", () => {
      const sort: IObjSortList = [
        { field: "objRecord.name", direction: "asc" },
        { field: "objRecord.category", direction: "desc" },
      ];
      const fields: IObjField[] = [
        // fields array is now ignored
      ];
      const result = transformer.transformSort(sort, fields);
      expect(result).toEqual({
        "objRecord.name": 1,
        "objRecord.category": -1,
      });
    });
  });

  describe("transformPagination", () => {
    it("should calculate skip and limit", () => {
      expect(transformer.transformPagination(2, 10)).toEqual({
        skip: 20,
        limit: 10,
      });
    });
  });

  describe("partQuery operators", () => {
    it("should handle neq", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: { and: [{ op: "neq", field: "foo", value: "bar" }] },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [{ projectId: "project1" }, { "objRecord.foo": { $ne: "bar" } }],
      });
    });

    it("should handle gt/gte/lt/lte with numbers", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            { op: "gt", field: "num", value: 5 },
            { op: "gte", field: "num", value: 6 },
            { op: "lt", field: "num", value: 10 },
            { op: "lte", field: "num", value: 11 },
          ],
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { projectId: "project1" },
          { "objRecord.num": { $gt: 5, $gte: 6, $lt: 10, $lte: 11 } },
        ],
      });
    });

    it("should handle like (case-insensitive)", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: { and: [{ op: "like", field: "foo", value: "bar" }] },
      };
      const filter = transformer.transformFilter(query, now);
      const fooFilter = Array.isArray(filter.$and)
        ? filter.$and.find((f) => f["objRecord.foo"])
        : filter["objRecord.foo"];
      expect(fooFilter["objRecord.foo"].$regex).toBeInstanceOf(RegExp);
      expect(fooFilter["objRecord.foo"].$regex.source).toBe("bar");
      expect(fooFilter["objRecord.foo"].$regex.flags).toContain("i");
    });

    it("should handle like (case-sensitive)", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            { op: "like", field: "foo", value: "bar", caseSensitive: true },
          ],
        },
      };
      const filter = transformer.transformFilter(query, now);
      const fooFilter = Array.isArray(filter.$and)
        ? filter.$and.find((f) => f["objRecord.foo"])
        : filter["objRecord.foo"];
      expect(fooFilter["objRecord.foo"].$regex).toBeInstanceOf(RegExp);
      expect(fooFilter["objRecord.foo"].$regex.flags).not.toContain("i");
    });

    it("should handle in/not_in", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            { op: "in", field: "foo", value: ["a", "b"] },
            { op: "not_in", field: "bar", value: [1, 2] },
          ],
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { projectId: "project1" },
          {
            "objRecord.foo": { $in: ["a", "b"] },
            "objRecord.bar": { $nin: [1, 2] },
          },
        ],
      });
    });

    it("should handle between", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [{ op: "between", field: "num", value: [1, 10] }],
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { projectId: "project1" },
          { "objRecord.num": { $gte: 1, $lte: 10 } },
        ],
      });
    });

    it("should handle exists", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [{ op: "exists", field: "foo", value: true }],
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { projectId: "project1" },
          { "objRecord.foo": { $exists: true } },
        ],
      });
    });
  });

  describe("metaQuery number ops", () => {
    it("should handle metaQuery number eq/neq/in/not_in", () => {
      const query: IObjQuery = {
        projectId: "project1",
        metaQuery: {
          createdAt: {
            eq: 123,
            neq: 456,
            in: [1, 2],
            not_in: [3, 4],
          },
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { projectId: "project1" },
          {
            createdAt: {
              $in: [1, 2],
              $nin: [3, 4],
            },
          },
        ],
      });
    });
  });

  describe("logicalQuery or", () => {
    it("should handle or queries", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          or: [
            { op: "eq", field: "foo", value: "bar" },
            { op: "eq", field: "baz", value: "qux" },
          ],
        },
      };
      const filter = transformer.transformFilter(query, now);
      if (!filter.$and) throw new Error("Expected $and in filter");
      expect(filter.$and[0].projectId).toBe("project1");
      expect(Array.isArray(filter.$and[1].$or)).toBe(true);
      expect(filter.$and[1].$or?.length).toBe(2);
      expect(filter.$and[1].$or).toEqual([
        { "objRecord.foo": { $eq: "bar" } },
        { "objRecord.baz": { $eq: "qux" } },
      ]);
    });
  });

  describe("topLevelFields", () => {
    it("should handle shouldIndex boolean field", () => {
      const query: IObjQuery = {
        projectId: "project1",
        topLevelFields: {
          shouldIndex: true,
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [{ projectId: "project1" }, { shouldIndex: true }],
      });
    });

    it("should handle fieldsToIndex array field", () => {
      const query: IObjQuery = {
        projectId: "project1",
        topLevelFields: {
          fieldsToIndex: ["field1", "field2"],
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { projectId: "project1" },
          { fieldsToIndex: ["field1", "field2"] },
        ],
      });
    });

    it("should handle tag string meta query", () => {
      const query: IObjQuery = {
        projectId: "project1",
        topLevelFields: {
          tag: { eq: "test-tag" },
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [{ projectId: "project1" }, { tag: "test-tag" }],
      });
    });

    it("should handle groupId string meta query", () => {
      const query: IObjQuery = {
        projectId: "project1",
        topLevelFields: {
          groupId: { in: ["group1", "group2"] },
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { projectId: "project1" },
          { groupId: { $in: ["group1", "group2"] } },
        ],
      });
    });

    it("should handle deletedAt null", () => {
      const query: IObjQuery = {
        projectId: "project1",
        topLevelFields: {
          deletedAt: null,
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        projectId: "project1",
      });
    });

    it("should handle deletedAt number meta query", () => {
      const query: IObjQuery = {
        projectId: "project1",
        topLevelFields: {
          deletedAt: { gte: 123 },
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { projectId: "project1" },
          { deletedAt: { $gte: new Date(123) } },
        ],
      });
    });

    it("should combine multiple top-level fields", () => {
      const query: IObjQuery = {
        projectId: "project1",
        topLevelFields: {
          shouldIndex: true,
          tag: { eq: "test-tag" },
          groupId: { eq: "group1" },
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { projectId: "project1" },
          { shouldIndex: true, tag: "test-tag", groupId: "group1" },
        ],
      });
    });

    it("should combine topLevelFields with other query types", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: { and: [{ op: "eq", field: "foo", value: "bar" }] },
        metaQuery: { id: { eq: "id1" } },
        topLevelFields: {
          shouldIndex: true,
          tag: { eq: "test-tag" },
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { projectId: "project1" },
          { "objRecord.foo": { $eq: "bar" } },
          { id: "id1" },
          { shouldIndex: true, tag: "test-tag" },
        ],
      });
    });

    it("should handle queries without tag in topLevelFields", () => {
      const query: IObjQuery = {
        projectId: "project1",
        topLevelFields: {
          shouldIndex: true,
          groupId: { eq: "group1" },
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { projectId: "project1" },
          { shouldIndex: true, groupId: "group1" },
        ],
      });
    });
  });

  describe("array field queries", () => {
    const arrayFields = new Map([
      [
        "logsQuery.and",
        {
          id: "1",
          path: "logsQuery.and",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          projectId: "project1",
          groupId: "group1",
          tag: "tag1",
        },
      ],
      [
        "comments",
        {
          id: "2",
          path: "comments",
          type: "string" as const,
          arrayTypes: [],
          isArrayCompressed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          projectId: "project1",
          groupId: "group1",
          tag: "tag1",
        },
      ],
    ]);

    it("should handle array field eq operation", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "eq",
              field: "logsQuery.and.message",
              value: "error occurred",
            },
          ],
        },
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { projectId: "project1" },
          { "objRecord.logsQuery.and.message": { $eq: "error occurred" } },
        ],
      });
    });

    it("should handle array field neq operation", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "neq",
              field: "logsQuery.and.level",
              value: "debug",
            },
          ],
        },
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { projectId: "project1" },
          { "objRecord.logsQuery.and.level": { $ne: "debug" } },
        ],
      });
    });

    it("should handle array field in operation", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "in",
              field: "logsQuery.and.level",
              value: ["error", "warn"],
            },
          ],
        },
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { projectId: "project1" },
          { "objRecord.logsQuery.and.level": { $in: ["error", "warn"] } },
        ],
      });
    });

    it("should handle array field not_in operation", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "not_in",
              field: "logsQuery.and.level",
              value: ["debug", "info"],
            },
          ],
        },
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { projectId: "project1" },
          { "objRecord.logsQuery.and.level": { $nin: ["debug", "info"] } },
        ],
      });
    });

    it("should handle array field like operation", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "like",
              field: "logsQuery.and.message",
              value: "error.*",
              caseSensitive: false,
            },
          ],
        },
      };
      const filter = transformer.transformFilter(query, now, arrayFields);
      const messageFilter = Array.isArray(filter.$and)
        ? filter.$and.find((f) => f["objRecord.logsQuery.and.message"])
        : filter["objRecord.logsQuery.and.message"];
      expect(
        messageFilter["objRecord.logsQuery.and.message"].$regex
      ).toBeInstanceOf(RegExp);
      expect(
        messageFilter["objRecord.logsQuery.and.message"].$regex.flags
      ).toContain("i");
    });

    it("should handle array field exists operation", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "exists",
              field: "logsQuery.and.timestamp",
              value: true,
            },
          ],
        },
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { projectId: "project1" },
          { "objRecord.logsQuery.and.timestamp": { $exists: true } },
        ],
      });
    });

    it("should handle array field numeric operations", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "gt",
              field: "logsQuery.and.count",
              value: 5,
            },
            {
              op: "lte",
              field: "logsQuery.and.count",
              value: 100,
            },
          ],
        },
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { projectId: "project1" },
          {
            "objRecord.logsQuery.and.count": { $gt: 5, $lte: 100 },
          },
        ],
      });
    });

    it("should handle nested array field paths", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "eq",
              field: "logsQuery.and.details.user.id",
              value: "user123",
            },
          ],
        },
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { projectId: "project1" },
          {
            "objRecord.logsQuery.and.details.user.id": { $eq: "user123" },
          },
        ],
      });
    });

    it("should fall back to regular query for non-array fields", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "eq",
              field: "regularField",
              value: "value",
            },
          ],
        },
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { projectId: "project1" },
          { "objRecord.regularField": { $eq: "value" } },
        ],
      });
    });

    it("should handle array field between operation", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "between",
              field: "logsQuery.and.count",
              value: [1, 10],
            },
          ],
        },
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { projectId: "project1" },
          { "objRecord.logsQuery.and.count": { $gte: 1, $lte: 10 } },
        ],
      });
    });

    it("should handle complex array field queries with logical operators", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "eq",
              field: "logsQuery.and.level",
              value: "error",
            },
          ],
          or: [
            {
              op: "gt",
              field: "logsQuery.and.count",
              value: 5,
            },
            {
              op: "like",
              field: "logsQuery.and.message",
              value: "critical",
            },
          ],
        },
      };
      const filter = transformer.transformFilter(query, now, arrayFields);
      expect(filter.$and).toBeDefined();
      expect(filter.$and?.length).toBe(2);
      expect(filter.$and?.[0].projectId).toBe("project1");
      expect(filter.$and?.[1].$or).toBeDefined();
      expect(filter.$and?.[1].$or?.length).toBe(3); // AND condition + 2 OR conditions
      // The first element should be the AND condition
      expect(
        filter.$and?.[1].$or?.[0]["objRecord.logsQuery.and.level"]
      ).toEqual({
        $eq: "error",
      });
      // The second and third elements should be the OR conditions
      expect(
        filter.$and?.[1].$or?.[1]["objRecord.logsQuery.and.count"]
      ).toEqual({
        $gt: 5,
      });
      expect(
        filter.$and?.[1].$or?.[2]["objRecord.logsQuery.and.message"]
      ).toBeDefined();
    });

    it("should handle mixed array and regular field queries", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "eq",
              field: "title",
              value: "Test Post",
            },
            {
              op: "gt",
              field: "comments.rating",
              value: 4,
            },
          ],
        },
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { projectId: "project1" },
          {
            "objRecord.title": { $eq: "Test Post" },
            "objRecord.comments.rating": { $gt: 4 },
          },
        ],
      });
    });

    it("should handle array field with duration values", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "gt",
              field: "logsQuery.and.createdAt",
              value: "1h",
            },
          ],
        },
      };
      const filter = transformer.transformFilter(query, now, arrayFields);
      const createdAtFilter = Array.isArray(filter.$and)
        ? filter.$and.find((f) => f["objRecord.logsQuery.and.createdAt"])
        : filter["objRecord.logsQuery.and.createdAt"];
      expect(
        createdAtFilter["objRecord.logsQuery.and.createdAt"].$gt
      ).toBeInstanceOf(Date);
    });
  });

  describe("enhanced sort functionality", () => {
    it("should include all sort fields, even if not in fields array", () => {
      const sort: IObjSortList = [
        { field: "objRecord.validField", direction: "asc" },
        { field: "objRecord.invalidField", direction: "desc" },
        { field: "objRecord.anotherValidField", direction: "asc" },
      ];
      const fields: IObjField[] = [
        // fields array is now ignored
      ];
      const result = transformer.transformSort(sort, fields);
      expect(result).toEqual({
        "objRecord.validField": 1,
        "objRecord.invalidField": -1,
        "objRecord.anotherValidField": 1,
      });
    });

    it("should include all sort fields with mixed types and nested paths", () => {
      const sort: IObjSortList = [
        { field: "objRecord.user.profile.age", direction: "desc" },
        { field: "objRecord.user.profile.name", direction: "asc" },
        { field: "objRecord.createdAt", direction: "desc" },
      ];
      const fields: IObjField[] = [
        // fields array is now ignored
      ];
      const result = transformer.transformSort(sort, fields);
      expect(result).toEqual({
        "objRecord.user.profile.age": -1,
        "objRecord.user.profile.name": 1,
        "objRecord.createdAt": -1,
      });
    });

    it("should handle sort with invalid direction values", () => {
      const sort: IObjSortList = [
        // @ts-expect-error: invalid direction
        { field: "objRecord.field1", direction: "invalid" },
        { field: "objRecord.field2", direction: "asc" },
      ];
      const fields: IObjField[] = [
        // fields array is now ignored
      ];
      const result = transformer.transformSort(sort, fields);
      // Should default to -1 (desc) for invalid direction
      expect(result).toEqual({
        "objRecord.field1": -1,
        "objRecord.field2": 1,
      });
    });

    it("should handle sort with multiple clauses properly", () => {
      const sort: IObjSortList = [
        { field: "objRecord.priority", direction: "desc" },
        { field: "objRecord.createdAt", direction: "asc" },
        { field: "objRecord.status", direction: "desc" },
      ];
      const fields: IObjField[] = [
        // fields array is now ignored
      ];
      const result = transformer.transformSort(sort, fields);
      expect(result).toEqual({
        "objRecord.priority": -1,
        "objRecord.createdAt": 1,
        "objRecord.status": -1,
      });
    });

    it("should return default sort when no sort fields provided", () => {
      const sort: IObjSortList = [];
      const fields: IObjField[] = [
        // fields array is now ignored
      ];
      const result = transformer.transformSort(sort, fields);
      expect(result).toEqual({ createdAt: -1 });
    });
  });

  describe("enhanced query generation", () => {
    it("should handle complex nested field queries", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "eq",
              field: "user.profile.email",
              value: "test@example.com",
            },
            {
              op: "gt",
              field: "user.profile.age",
              value: 18,
            },
            {
              op: "in",
              field: "user.preferences.tags",
              value: ["tech", "programming"],
            },
          ],
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { projectId: "project1" },
          {
            "objRecord.user.profile.email": { $eq: "test@example.com" },
            "objRecord.user.profile.age": { $gt: 18 },
            "objRecord.user.preferences.tags": { $in: ["tech", "programming"] },
          },
        ],
      });
    });

    it("should handle array field detection correctly", () => {
      const arrayFields = new Map([
        [
          "logs",
          {
            id: "1",
            path: "logs",
            type: "string" as const,
            arrayTypes: [],
            isArrayCompressed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            projectId: "project1",
            groupId: "group1",
            tag: "tag1",
          },
        ],
      ]);

      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "eq",
              field: "logs.entry.message",
              value: "test message",
            },
          ],
        },
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { projectId: "project1" },
          { "objRecord.logs.entry.message": { $eq: "test message" } },
        ],
      });
    });

    it("should handle complex logical queries with array fields", () => {
      const arrayFields = new Map([
        [
          "logsQuery.and",
          {
            id: "1",
            path: "logsQuery.and",
            type: "string" as const,
            arrayTypes: [],
            isArrayCompressed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            projectId: "project1",
            groupId: "group1",
            tag: "tag1",
          },
        ],
      ]);

      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "eq",
              field: "status",
              value: "active",
            },
          ],
          or: [
            {
              op: "eq",
              field: "logsQuery.and.level",
              value: "error",
            },
            {
              op: "gt",
              field: "logsQuery.and.count",
              value: 10,
            },
          ],
        },
      };
      const filter = transformer.transformFilter(query, now, arrayFields);
      expect(filter.$and).toBeDefined();
      expect(filter.$and?.length).toBe(2);
      expect(filter.$and?.[0].projectId).toBe("project1");
      expect(filter.$and?.[1].$or).toBeDefined();
      expect(filter.$and?.[1].$or?.length).toBe(3); // AND condition + 2 OR conditions
      // The first element should be the AND condition
      expect(filter.$and?.[1].$or?.[0]["objRecord.status"]).toEqual({
        $eq: "active",
      });
      // The second and third elements should be the OR conditions
      expect(
        filter.$and?.[1].$or?.[1]["objRecord.logsQuery.and.level"]
      ).toEqual({
        $eq: "error",
      });
      expect(
        filter.$and?.[1].$or?.[2]["objRecord.logsQuery.and.count"]
      ).toEqual({
        $gt: 10,
      });
    });

    it("should handle date field conversions in meta queries", () => {
      const query: IObjQuery = {
        projectId: "project1",
        metaQuery: {
          createdAt: {
            gt: "2024-01-01T00:00:00Z",
            lt: "2024-12-31T23:59:59Z",
          },
        },
      };
      const filter = transformer.transformFilter(query, now);
      const createdAtFilter = Array.isArray(filter.$and)
        ? filter.$and.find((f) => f.createdAt)
        : filter.createdAt;
      expect(createdAtFilter.createdAt.$gt).toBeInstanceOf(Date);
      expect(createdAtFilter.createdAt.$lt).toBeInstanceOf(Date);
    });

    it("should handle duration values in queries", () => {
      const query: IObjQuery = {
        projectId: "project1",
        partQuery: {
          and: [
            {
              op: "gt",
              field: "lastActivity",
              value: "1d",
            },
          ],
        },
      };
      const filter = transformer.transformFilter(query, now);
      const lastActivityFilter = Array.isArray(filter.$and)
        ? filter.$and.find((f) => f["objRecord.lastActivity"])
        : filter["objRecord.lastActivity"];
      expect(lastActivityFilter["objRecord.lastActivity"].$gt).toBeInstanceOf(
        Date
      );
    });

    it("should handle complex top-level field combinations", () => {
      const query: IObjQuery = {
        projectId: "project1",
        topLevelFields: {
          shouldIndex: true,
          tag: { eq: "test-tag" },
          groupId: { in: ["group1", "group2"] },
          deletedAt: null,
          deletedBy: { eq: "user123" },
          deletedByType: { eq: "admin" },
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { projectId: "project1" },
          {
            shouldIndex: true,
            tag: "test-tag",
            groupId: { $in: ["group1", "group2"] },
            deletedBy: "user123",
            deletedByType: "admin",
          },
        ],
      });
    });
  });
});

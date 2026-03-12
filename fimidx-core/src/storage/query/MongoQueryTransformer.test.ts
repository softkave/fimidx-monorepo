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
      const query: IObjQuery = { metaQuery: { projectId: { eq: "project1" } } };
      expect(transformer.transformFilter(query, now)).toEqual({
        projectId: "project1",
      });
    });

    it("should add recordQuery to filter (eq)", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [{ op: "eq", field: "foo", value: "bar" }],
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [{ "objRecord.foo": { $eq: "bar" } }, { projectId: "project1" }],
      });
    });

    it("should add metaQuery to filter (string eq)", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" }, id: { eq: "id1" } },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        projectId: "project1",
        id: "id1",
      });
    });

    it("should combine recordQuery and metaQuery", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" }, id: { eq: "id1" } },
        recordQuery: [{ op: "eq", field: "foo", value: "bar" }],
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { "objRecord.foo": { $eq: "bar" } },
          { id: "id1", projectId: "project1" },
        ],
      });
    });

    it("should handle record-only leaf without metaQuery", () => {
      const query: IObjQuery = {
        recordQuery: [{ op: "eq", field: "foo", value: "bar" }],
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        "objRecord.foo": { $eq: "bar" },
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

  describe("recordQuery operators", () => {
    it("should handle neq", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [{ op: "neq", field: "foo", value: "bar" }],
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [{ "objRecord.foo": { $ne: "bar" } }, { projectId: "project1" }],
      });
    });

    it("should handle gt/gte/lt/lte with numbers", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          { op: "gt", field: "num", value: 5 },
          { op: "gte", field: "num", value: 6 },
          { op: "lt", field: "num", value: 10 },
          { op: "lte", field: "num", value: 11 },
        ],
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { "objRecord.num": { $gt: 5, $gte: 6, $lt: 10, $lte: 11 } },
          { projectId: "project1" },
        ],
      });
    });

    it("should handle like (case-insensitive)", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [{ op: "like", field: "foo", value: "bar" }],
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
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          { op: "like", field: "foo", value: "bar", caseSensitive: true },
        ],
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
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          { op: "in", field: "foo", value: ["a", "b"] },
          { op: "not_in", field: "bar", value: [1, 2] },
        ],
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          {
            "objRecord.foo": { $in: ["a", "b"] },
            "objRecord.bar": { $nin: [1, 2] },
          },
          { projectId: "project1" },
        ],
      });
    });

    it("should handle between", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [{ op: "between", field: "num", value: [1, 10] }],
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { "objRecord.num": { $gte: 1, $lte: 10 } },
          { projectId: "project1" },
        ],
      });
    });

    it("should handle exists", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [{ op: "exists", field: "foo", value: true }],
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { "objRecord.foo": { $exists: true } },
          { projectId: "project1" },
        ],
      });
    });
  });

  describe("metaQuery number ops", () => {
    it("should handle metaQuery number eq/neq/in/not_in", () => {
      const query: IObjQuery = {
        metaQuery: {
          projectId: { eq: "project1" },
          createdAt: {
            eq: 123,
            neq: 456,
            in: [1, 2],
            not_in: [3, 4],
          },
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        projectId: "project1",
        createdAt: {
          $in: [1, 2],
          $nin: [3, 4],
        },
      });
    });
  });

  describe("logicalQuery or", () => {
    it("should handle or queries (obj-level)", () => {
      const query: IObjQuery = {
        or: [
          {
            metaQuery: { projectId: { eq: "project1" } },
            recordQuery: [{ op: "eq", field: "foo", value: "bar" }],
          },
          {
            metaQuery: { projectId: { eq: "project1" } },
            recordQuery: [{ op: "eq", field: "baz", value: "qux" }],
          },
        ],
      };
      const filter = transformer.transformFilter(query, now);
      expect(filter).toEqual({
        $or: [
          {
            $and: [
              { "objRecord.foo": { $eq: "bar" } },
              { projectId: "project1" },
            ],
          },
          {
            $and: [
              { "objRecord.baz": { $eq: "qux" } },
              { projectId: "project1" },
            ],
          },
        ],
      });
    });

    it("should handle nested and/or queries at obj-level", () => {
      const query: IObjQuery = {
        or: [
          {
            and: [
              {
                metaQuery: { projectId: { eq: "project1" } },
                recordQuery: [{ op: "eq", field: "status", value: "active" }],
              },
              {
                metaQuery: { projectId: { eq: "project1" } },
                recordQuery: [{ op: "gt", field: "score", value: 100 }],
              },
            ],
          },
          {
            and: [
              {
                metaQuery: { projectId: { eq: "project1" } },
                recordQuery: [{ op: "eq", field: "status", value: "pending" }],
              },
              {
                metaQuery: { projectId: { eq: "project1" } },
                recordQuery: [{ op: "lt", field: "score", value: 50 }],
              },
            ],
          },
        ],
      };

      const filter = transformer.transformFilter(query, now);

      expect(filter.$or).toBeDefined();
      expect(Array.isArray(filter.$or)).toBe(true);
      expect(filter.$or?.length).toBe(2);

      const firstBranch = filter.$or?.[0] as any;
      expect(firstBranch.$and).toBeDefined();
      expect(Array.isArray(firstBranch.$and)).toBe(true);
      expect(firstBranch.$and.length).toBe(2);

      const secondBranch = filter.$or?.[1] as any;
      expect(secondBranch.$and).toBeDefined();
      expect(Array.isArray(secondBranch.$and)).toBe(true);
      expect(secondBranch.$and.length).toBe(2);
    });
  });

  describe("topLevelFields", () => {
    it("should handle shouldIndex boolean field", () => {
      const query: IObjQuery = {
        metaQuery: {
          projectId: { eq: "project1" },
          shouldIndex: true,
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [{ projectId: "project1" }, { shouldIndex: true }],
      });
    });

    it("should handle fieldsToIndex array field", () => {
      const query: IObjQuery = {
        metaQuery: {
          projectId: { eq: "project1" },
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
        metaQuery: {
          projectId: { eq: "project1" },
          tag: { eq: "test-tag" },
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [{ projectId: "project1" }, { tag: "test-tag" }],
      });
    });

    it("should handle groupId string meta query", () => {
      const query: IObjQuery = {
        metaQuery: {
          projectId: { eq: "project1" },
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
        metaQuery: {
          projectId: { eq: "project1" },
          deletedAt: null,
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        projectId: "project1",
      });
    });

    it("should handle deletedAt number meta query", () => {
      const query: IObjQuery = {
        metaQuery: {
          projectId: { eq: "project1" },
          deletedAt: { gte: 123 },
        },
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        projectId: "project1",
        deletedAt: { $gte: new Date(123) },
      });
    });

    it("should combine multiple top-level fields", () => {
      const query: IObjQuery = {
        metaQuery: {
          projectId: { eq: "project1" },
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
        metaQuery: {
          projectId: { eq: "project1" },
          id: { eq: "id1" },
          shouldIndex: true,
          tag: { eq: "test-tag" },
        },
        recordQuery: [{ op: "eq", field: "foo", value: "bar" }],
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          { "objRecord.foo": { $eq: "bar" } },
          { id: "id1", projectId: "project1" },
          { shouldIndex: true, tag: "test-tag" },
        ],
      });
    });

    it("should handle queries without tag in topLevelFields", () => {
      const query: IObjQuery = {
        metaQuery: {
          projectId: { eq: "project1" },
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
        "query.and",
        {
          id: "1",
          path: "query.and",
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
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          {
            op: "eq",
            field: "query.and.message",
            value: "error occurred",
          },
        ],
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { "objRecord.query.and.message": { $eq: "error occurred" } },
          { projectId: "project1" },
        ],
      });
    });

    it("should handle array field neq operation", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          {
            op: "neq",
            field: "query.and.level",
            value: "debug",
          },
        ],
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { "objRecord.query.and.level": { $ne: "debug" } },
          { projectId: "project1" },
        ],
      });
    });

    it("should handle array field in operation", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          {
            op: "in",
            field: "query.and.level",
            value: ["error", "warn"],
          },
        ],
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { "objRecord.query.and.level": { $in: ["error", "warn"] } },
          { projectId: "project1" },
        ],
      });
    });

    it("should handle array field not_in operation", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          {
            op: "not_in",
            field: "query.and.level",
            value: ["debug", "info"],
          },
        ],
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { "objRecord.query.and.level": { $nin: ["debug", "info"] } },
          { projectId: "project1" },
        ],
      });
    });

    it("should handle array field like operation", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          {
            op: "like",
            field: "query.and.message",
            value: "error.*",
            caseSensitive: false,
          },
        ],
      };
      const filter = transformer.transformFilter(query, now, arrayFields);
      const messageFilter = Array.isArray(filter.$and)
        ? filter.$and.find((f) => f["objRecord.query.and.message"])
        : filter["objRecord.query.and.message"];
      expect(
        messageFilter["objRecord.query.and.message"].$regex
      ).toBeInstanceOf(RegExp);
      expect(
        messageFilter["objRecord.query.and.message"].$regex.flags
      ).toContain("i");
    });

    it("should handle array field exists operation", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          {
            op: "exists",
            field: "query.and.timestamp",
            value: true,
          },
        ],
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { "objRecord.query.and.timestamp": { $exists: true } },
          { projectId: "project1" },
        ],
      });
    });

    it("should handle array field numeric operations", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          {
            op: "gt",
            field: "query.and.count",
            value: 5,
          },
          {
            op: "lte",
            field: "query.and.count",
            value: 100,
          },
        ],
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          {
            "objRecord.query.and.count": { $gt: 5, $lte: 100 },
          },
          { projectId: "project1" },
        ],
      });
    });

    it("should handle nested array field paths", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          {
            op: "eq",
            field: "query.and.details.user.id",
            value: "user123",
          },
        ],
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          {
            "objRecord.query.and.details.user.id": { $eq: "user123" },
          },
          { projectId: "project1" },
        ],
      });
    });

    it("should fall back to regular query for non-array fields", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          {
            op: "eq",
            field: "regularField",
            value: "value",
          },
        ],
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { "objRecord.regularField": { $eq: "value" } },
          { projectId: "project1" },
        ],
      });
    });

    it("should handle array field between operation", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          {
            op: "between",
            field: "query.and.count",
            value: [1, 10],
          },
        ],
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { "objRecord.query.and.count": { $gte: 1, $lte: 10 } },
          { projectId: "project1" },
        ],
      });
    });

    it("should handle complex array field queries with logical operators", () => {
      // Obj-level: (level=error) AND (count>5 OR message like "critical")
      const query: IObjQuery = {
        and: [
          {
            metaQuery: { projectId: { eq: "project1" } },
            recordQuery: [
              { op: "eq", field: "query.and.level", value: "error" },
            ],
          },
          {
            or: [
              {
                metaQuery: { projectId: { eq: "project1" } },
                recordQuery: [{ op: "gt", field: "query.and.count", value: 5 }],
              },
              {
                metaQuery: { projectId: { eq: "project1" } },
                recordQuery: [
                  {
                    op: "like",
                    field: "query.and.message",
                    value: "critical",
                  },
                ],
              },
            ],
          },
        ],
      };
      const filter = transformer.transformFilter(query, now, arrayFields);
      expect(filter.$and).toBeDefined();
      expect(filter.$and?.length).toBe(2);
      const andArr = filter.$and as any[];
      const findInBranch = (branch: any, key: string) =>
        branch?.[key] ?? branch?.$and?.find((g: any) => g[key])?.[key];
      const recordLevelBranch = andArr.find(
        (f) => f["objRecord.query.and.level"] || f.$and?.some((g: any) => g["objRecord.query.and.level"])
      );
      const levelValue = findInBranch(recordLevelBranch, "objRecord.query.and.level");
      const orBranch = andArr.find((f) => f.$or);
      expect(levelValue).toEqual({ $eq: "error" });
      expect(orBranch?.$or).toBeDefined();
      expect(orBranch?.$or?.length).toBe(2);
      const orFirst = orBranch?.$or?.[0];
      const orSecond = orBranch?.$or?.[1];
      expect(findInBranch(orFirst, "objRecord.query.and.count")).toEqual({
        $gt: 5,
      });
      expect(findInBranch(orSecond, "objRecord.query.and.message")).toBeDefined();
    });

    it("should handle mixed array and regular field queries", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
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
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          {
            "objRecord.title": { $eq: "Test Post" },
            "objRecord.comments.rating": { $gt: 4 },
          },
          { projectId: "project1" },
        ],
      });
    });

    it("should handle array field with duration values", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          {
            field: "query.and.createdAt",
            value: "1h",
            op: "gt",
          },
        ],
      };
      const filter = transformer.transformFilter(query, now, arrayFields);
      const createdAtFilter = Array.isArray(filter.$and)
        ? filter.$and.find((f) => f["objRecord.query.and.createdAt"])
        : filter["objRecord.query.and.createdAt"];
      expect(
        createdAtFilter["objRecord.query.and.createdAt"].$gt
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
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
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
      };
      expect(transformer.transformFilter(query, now)).toEqual({
        $and: [
          {
            "objRecord.user.profile.email": { $eq: "test@example.com" },
            "objRecord.user.profile.age": { $gt: 18 },
            "objRecord.user.preferences.tags": { $in: ["tech", "programming"] },
          },
          { projectId: "project1" },
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
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          {
            op: "eq",
            field: "logs.entry.message",
            value: "test message",
          },
        ],
      };
      expect(transformer.transformFilter(query, now, arrayFields)).toEqual({
        $and: [
          { "objRecord.logs.entry.message": { $eq: "test message" } },
          { projectId: "project1" },
        ],
      });
    });

    it("should handle complex logical queries with array fields", () => {
      const arrayFields = new Map([
        [
          "query.and",
          {
            id: "1",
            path: "query.and",
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

      // Obj-level: (status=active) AND (level=error OR count>10)
      const query: IObjQuery = {
        and: [
          {
            metaQuery: { projectId: { eq: "project1" } },
            recordQuery: [{ op: "eq", field: "status", value: "active" }],
          },
          {
            or: [
              {
                metaQuery: { projectId: { eq: "project1" } },
                recordQuery: [
                  { op: "eq", field: "query.and.level", value: "error" },
                ],
              },
              {
                metaQuery: { projectId: { eq: "project1" } },
                recordQuery: [
                  { op: "gt", field: "query.and.count", value: 10 },
                ],
              },
            ],
          },
        ],
      };
      const filter = transformer.transformFilter(query, now, arrayFields);
      expect(filter.$and).toBeDefined();
      expect(filter.$and?.length).toBe(2);
      const andArr = filter.$and as any[];
      const statusBranch =
        andArr.find((f) => f["objRecord.status"]) ??
        andArr.find((f) => f.$and?.some((g: any) => g["objRecord.status"]));
      const findInBranch = (branch: any, key: string) =>
        branch?.[key] ?? branch?.$and?.find((g: any) => g[key])?.[key];
      const statusValue = findInBranch(statusBranch, "objRecord.status");
      const orBranch = andArr.find((f) => f.$or);
      expect(statusValue).toEqual({ $eq: "active" });
      expect(orBranch?.$or).toBeDefined();
      expect(orBranch?.$or?.length).toBe(2);
      expect(findInBranch(orBranch?.$or?.[0], "objRecord.query.and.level")).toEqual({
        $eq: "error",
      });
      expect(findInBranch(orBranch?.$or?.[1], "objRecord.query.and.count")).toEqual({
        $gt: 10,
      });
    });

    it("should handle date field conversions in meta queries", () => {
      const query: IObjQuery = {
        metaQuery: {
          projectId: { eq: "project1" },
          createdAt: {
            gt: "2024-01-01T00:00:00Z",
            lt: "2024-12-31T23:59:59Z",
          },
        },
      };
      const filter = transformer.transformFilter(query, now);
      const createdAtFilter = Array.isArray(filter.$and)
        ? filter.$and.find((f: any) => f.createdAt)
        : filter;
      expect(createdAtFilter).toBeDefined();
      expect(createdAtFilter?.createdAt.$gt).toBeInstanceOf(Date);
      expect(createdAtFilter?.createdAt.$lt).toBeInstanceOf(Date);
    });

    it("should handle duration values in queries", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [
          {
            op: "gt",
            field: "lastActivity",
            value: "1d",
          },
        ],
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
        metaQuery: {
          projectId: { eq: "project1" },
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
          {
            projectId: "project1",
            deletedBy: "user123",
            deletedByType: "admin",
          },
          {
            shouldIndex: true,
            tag: "test-tag",
            groupId: { $in: ["group1", "group2"] },
          },
        ],
      });
    });
  });

  describe("array-compressed and dynamic [*] paths", () => {
    it("should use $elemMatch for array-compressed field when isArrayCompressed is true", () => {
      const arrayCompressedFields = new Map([
        [
          "scores[*].value",
          {
            id: "1",
            path: "scores[*].value",
            type: "number" as const,
            arrayTypes: [],
            isArrayCompressed: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            projectId: "p",
            groupId: "g",
            tag: "t",
          },
        ],
      ]);
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [{ op: "gte", field: "scores[*].value", value: 80 }],
      };
      const filter = transformer.transformFilter(
        query,
        now,
        arrayCompressedFields
      );
      expect(filter.$and).toBeDefined();
      expect(Array.isArray(filter.$and)).toBe(true);
      const withProject = (filter.$and as any[]).find(
        (f) => f.projectId === "project1"
      );
      const withScores = (filter.$and as any[]).find(
        (f) =>
          f["objRecord.scores.value"]?.$elemMatch ??
          f["objRecord.scores[*].value"]?.$elemMatch
      );
      expect(withProject).toBeDefined();
      expect(withScores).toBeDefined();
      const elemMatch =
        withScores!["objRecord.scores.value"] ??
        withScores!["objRecord.scores[*].value"];
      expect(elemMatch.$elemMatch).toEqual({ $gte: 80 });
    });

    it("should use $elemMatch for dynamic [*] path when field is not in fields map", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [{ op: "eq", field: "items[*].name", value: "widget" }],
      };
      const filter = transformer.transformFilter(query, now);
      expect(filter.$and).toBeDefined();
      const withElemMatch = (filter.$and as any[]).find(
        (f) =>
          f["objRecord.items.name"]?.$elemMatch ??
          f["objRecord.items[*].name"]?.$elemMatch
      );
      expect(withElemMatch).toBeDefined();
      const elemMatch =
        withElemMatch!["objRecord.items.name"] ??
        withElemMatch!["objRecord.items[*].name"];
      expect(elemMatch.$elemMatch).toEqual({ $eq: "widget" });
    });

    it("should use $elemMatch for dynamic [*] path with in operator", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [{ op: "in", field: "items[*].tag", value: ["a", "b"] }],
      };
      const filter = transformer.transformFilter(query, now);
      expect(filter.$and).toBeDefined();
      const withElemMatch = (filter.$and as any[]).find(
        (f) =>
          f["objRecord.items.tag"]?.$elemMatch ??
          f["objRecord.items[*].tag"]?.$elemMatch
      );
      expect(withElemMatch).toBeDefined();
      const elemMatch =
        withElemMatch!["objRecord.items.tag"] ??
        withElemMatch!["objRecord.items[*].tag"];
      expect(elemMatch.$elemMatch).toEqual({ $in: ["a", "b"] });
    });

    it("should produce array exists with $exists and $ne [] for exists true (dynamic [*] path)", () => {
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [{ op: "exists", field: "reportsTo[*]", value: true }],
      };
      const filter = transformer.transformFilter(query, now);
      const andArr = filter.$and as any[] | undefined;
      const reportsToEntry = andArr?.find(
        (f) =>
          f["objRecord.reportsTo"] !== undefined ||
          f["objRecord.reportsTo[*]"] !== undefined
      );
      expect(reportsToEntry).toBeDefined();
      const reportsToOps =
        reportsToEntry!["objRecord.reportsTo"] ??
        reportsToEntry!["objRecord.reportsTo[*]"];
      expect(reportsToOps.$exists).toBe(true);
      expect(reportsToOps.$ne).toEqual([]);
    });

    it("should use $elemMatch with relative date for array field (e.g. 1h)", () => {
      const arrayFields = new Map([
        [
          "events[*].createdAt",
          {
            id: "1",
            path: "events[*].createdAt",
            type: "string" as const,
            arrayTypes: [],
            isArrayCompressed: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            projectId: "p",
            groupId: "g",
            tag: "t",
          },
        ],
      ]);
      const query: IObjQuery = {
        metaQuery: { projectId: { eq: "project1" } },
        recordQuery: [{ op: "gt", field: "events[*].createdAt", value: "1h" }],
      };
      const filter = transformer.transformFilter(query, now, arrayFields);
      const andArr = filter.$and as any[] | undefined;
      const eventsEntry = andArr?.find(
        (f) =>
          f["objRecord.events.createdAt"]?.$elemMatch ??
          f["objRecord.events[*].createdAt"]?.$elemMatch
      );
      expect(eventsEntry).toBeDefined();
      const elemMatch =
        eventsEntry!["objRecord.events.createdAt"] ??
        eventsEntry!["objRecord.events[*].createdAt"];
      expect(elemMatch.$elemMatch.$gt).toBeInstanceOf(Date);
    });
  });
});

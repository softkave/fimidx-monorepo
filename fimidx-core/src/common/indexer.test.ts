import { describe, expect, it } from "vitest";
import { indexJson } from "./indexer.js";

describe("indexJson", () => {
  it("should extract leaf-granular fields from simple objects", () => {
    const input = {
      a: 1,
      b: "hello",
      c: true,
      d: null,
      e: undefined,
    };

    const result = indexJson(input);

    expect(result).toEqual({
      a: { path: "a", type: "number", isArrayCompressed: false },
      b: { path: "b", type: "string", isArrayCompressed: false },
      c: { path: "c", type: "boolean", isArrayCompressed: false },
      d: { path: "d", type: "null", isArrayCompressed: false },
      e: { path: "e", type: "undefined", isArrayCompressed: false },
    });
  });

  it("should extract leaf-granular fields from nested objects", () => {
    const input = {
      user: {
        profile: {
          name: "John",
          age: 30,
        },
        settings: {
          theme: "dark",
        },
      },
    };

    const result = indexJson(input);

    expect(result).toEqual({
      "user.profile.name": {
        path: "user.profile.name",
        type: "string",
        isArrayCompressed: false,
      },
      "user.profile.age": {
        path: "user.profile.age",
        type: "number",
        isArrayCompressed: false,
      },
      "user.settings.theme": {
        path: "user.settings.theme",
        type: "string",
        isArrayCompressed: false,
      },
    });
  });

  it("should create array-compressed fields for primitive arrays", () => {
    const input = {
      numbers: [1, 2, 3, 4],
      strings: ["a", "b", "c"],
      mixed: [1, "hello", true],
    };

    const result = indexJson(input);

    expect(result).toEqual({
      "numbers.[*]": {
        path: "numbers.[*]",
        type: "number",
        arrayTypes: new Set(["number"]),
        isArrayCompressed: true,
      },
      "strings.[*]": {
        path: "strings.[*]",
        type: "string",
        arrayTypes: new Set(["string"]),
        isArrayCompressed: true,
      },
      "mixed.[*]": {
        path: "mixed.[*]",
        type: "string",
        arrayTypes: new Set(["number", "string", "boolean"]),
        isArrayCompressed: true,
      },
    });
  });

  it("should create array-compressed fields for arrays of objects", () => {
    const input = {
      users: [
        { name: "John", age: 30 },
        { name: "Jane", age: 25 },
        { name: "Bob", age: 35 },
      ],
    };

    const result = indexJson(input);

    expect(result).toEqual({
      "users.[*].name": {
        path: "users.[*].name",
        type: "string",
        arrayTypes: new Set(["string"]),
        isArrayCompressed: true,
      },
      "users.[*].age": {
        path: "users.[*].age",
        type: "number",
        arrayTypes: new Set(["number"]),
        isArrayCompressed: true,
      },
    });
  });

  it("should handle mixed object structures in arrays", () => {
    const input = {
      items: [
        { name: "item1", value: 100 },
        { name: "item2", value: "text" },
        { name: "item3", value: true },
      ],
    };

    const result = indexJson(input);

    expect(result).toEqual({
      "items.[*].name": {
        path: "items.[*].name",
        type: "string",
        arrayTypes: new Set(["string"]),
        isArrayCompressed: true,
      },
      "items.[*].value": {
        path: "items.[*].value",
        type: "string",
        arrayTypes: new Set(["number", "string", "boolean"]),
        isArrayCompressed: true,
      },
    });
  });

  it("should handle nested arrays", () => {
    const input = {
      matrix: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
    };

    const result = indexJson(input);

    expect(result).toEqual({
      "matrix.[*].[*]": {
        path: "matrix.[*].[*]",
        type: "number",
        arrayTypes: new Set(["number"]),
        isArrayCompressed: true,
      },
    });
  });

  it("should handle empty arrays", () => {
    const input = {
      empty: [],
    };

    const result = indexJson(input);

    expect(result).toEqual({});
  });

  it("should handle complex nested structures", () => {
    const input = {
      company: {
        departments: [
          {
            name: "Engineering",
            employees: [
              { name: "Alice", role: "Developer" },
              { name: "Bob", role: "Manager" },
            ],
          },
          {
            name: "Marketing",
            employees: [{ name: "Charlie", role: "Designer" }],
          },
        ],
      },
    };

    const result = indexJson(input);

    expect(result).toEqual({
      "company.departments.[*].name": {
        path: "company.departments.[*].name",
        type: "string",
        arrayTypes: new Set(["string"]),
        isArrayCompressed: true,
      },
      "company.departments.[*].employees.[*].name": {
        path: "company.departments.[*].employees.[*].name",
        type: "string",
        arrayTypes: new Set(["string"]),
        isArrayCompressed: true,
      },
      "company.departments.[*].employees.[*].role": {
        path: "company.departments.[*].employees.[*].role",
        type: "string",
        arrayTypes: new Set(["string"]),
        isArrayCompressed: true,
      },
    });
  });

  it("should handle arrays with mixed types", () => {
    const input = {
      mixed: [
        { type: "user", data: { name: "John" } },
        { type: "product", data: { price: 100 } },
        { type: "order", data: { items: ["item1", "item2"] } },
      ],
    };

    const result = indexJson(input);

    expect(result).toEqual({
      "mixed.[*].type": {
        path: "mixed.[*].type",
        type: "string",
        arrayTypes: new Set(["string"]),
        isArrayCompressed: true,
      },
      "mixed.[*].data.name": {
        path: "mixed.[*].data.name",
        type: "string",
        isArrayCompressed: false,
      },
      "mixed.[*].data.price": {
        path: "mixed.[*].data.price",
        type: "number",
        isArrayCompressed: false,
      },
      "mixed.[*].data.items.[*]": {
        path: "mixed.[*].data.items.[*]",
        type: "string",
        arrayTypes: new Set(["string"]),
        isArrayCompressed: true,
      },
    });
  });

  it("should keep numeric object keys but use [*] for array elements", () => {
    const input = {
      a: {
        0: "primitive_value",
        1: { b: "nested_primitive" },
        arr: [
          "primitive1",
          "primitive2",
          { c: "object_primitive" },
        ],
      },
    };

    const result = indexJson(input);

    expect(result).toEqual({
      "a.0": { path: "a.0", type: "string", isArrayCompressed: false },
      "a.1.b": { path: "a.1.b", type: "string", isArrayCompressed: false },
      "a.arr.[*]": {
        path: "a.arr.[*]",
        type: "string",
        arrayTypes: new Set(["string"]),
        isArrayCompressed: true,
      },
      "a.arr.[*].c": {
        path: "a.arr.[*].c",
        type: "string",
        arrayTypes: new Set(["string"]),
        isArrayCompressed: true,
      },
    });
  });
});

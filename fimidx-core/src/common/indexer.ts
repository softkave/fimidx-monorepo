import type { AnyObject } from "softkave-js-utils";

/**
 * - the indexer loops through every possible field in the input obj, and
 *   extracts leaf-primitive fields (e.g. a.b.c if it is a primitive, not a or
 *   a.b) and leaf-array-compressed primitive fields (e.g. a.arr.[*].b if it is
 *   a primitive, not a.arr or a.arr.[*], although if one of the elements is
 *   primitive then a.arr.[*] should also be extracted).
 * - it returns the data type of the primitive field (string, number, boolean,
 *   null, undefined), and for array-compressed primitives, a set of contained
 *   data types (e.g. from the example above, a separate set for a.arr.[*].b
 *   {string, number, ...} and another set for a.arr.[*] (when at least one
 *   element is primitive) {string, ...}).
 * - it handles nested objects and arrays.
 * - array elements are indexed with [*] wildcards (e.g. a.arr.[*].b), not
 *   numeric indices (e.g. a.arr.0.b), to avoid littering the DB with per-index
 *   field paths.
 * - reiterating the examples above, leaf-array-compressed fields include the
 *   array itself if at least one element is primitive (e.g. a.arr.[*] if
 *   a.arr[1] or a.arr[2] is a primitive), and object content if at least one
 *   element is an object (e.g. a.arr.[*].b if a.arr[0] or a.arr[3] is an object
 *   and a.arr.[*].b is a primitive).
 */

export type FieldType = "string" | "number" | "boolean" | "null" | "undefined";

export interface IndexedField {
  path: string;
  type: FieldType; // Only primitive types
  arrayTypes?: Set<FieldType>; // For array-compressed fields
  isArrayCompressed: boolean;
}

export interface IndexedJson {
  [fieldPath: string]: IndexedField;
}

function getValueType(value: unknown): FieldType {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  throw new Error("getValueType should only be called on primitive values");
}

function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function indexObject(
  obj: AnyObject,
  currentPath: string = "",
  indexed: IndexedJson = {}
): IndexedJson {
  for (const key in obj) {
    const value = obj[key];
    const newPath = currentPath ? `${currentPath}.${key}` : key;

    if (isPrimitive(value)) {
      // Leaf-granular field
      indexed[newPath] = {
        path: newPath,
        type: getValueType(value),
        isArrayCompressed: false,
      };
    } else if (Array.isArray(value)) {
      // Handle arrays
      indexArray(value, newPath, indexed);
    } else if (typeof value === "object" && value !== null) {
      // Recursively index nested objects
      indexObject(value, newPath, indexed);
    }
  }

  return indexed;
}

function setArrayCompressedField(
  indexed: IndexedJson,
  path: string,
  types: Set<FieldType>
): void {
  const existing = indexed[path];
  if (existing?.arrayTypes) {
    types.forEach((type) => existing.arrayTypes!.add(type));
    existing.type =
      existing.arrayTypes.size === 1
        ? Array.from(existing.arrayTypes)[0]
        : "string";
    return;
  }

  indexed[path] = {
    path,
    type: types.size === 1 ? Array.from(types)[0] : "string",
    arrayTypes: types,
    isArrayCompressed: true,
  };
}

function indexArray(
  arr: unknown[],
  currentPath: string,
  indexed: IndexedJson
): void {
  if (arr.length === 0) {
    return;
  }

  const wildcardPath = `${currentPath}.[*]`;

  const primitiveItems = arr.filter(isPrimitive);
  if (primitiveItems.length > 0) {
    const types = new Set<FieldType>();
    primitiveItems.forEach((item) => types.add(getValueType(item)));
    setArrayCompressedField(indexed, wildcardPath, types);
  }

  const objectItems = arr.filter(
    (item) => typeof item === "object" && item !== null && !Array.isArray(item)
  );
  if (objectItems.length > 0) {
    const objectKeys = new Set<string>();
    objectItems.forEach((item) => {
      Object.keys(item as AnyObject).forEach((k) => objectKeys.add(k));
    });

    objectKeys.forEach((key) => {
      const values = objectItems
        .map((item) => (item as AnyObject)[key])
        .filter((v) => v !== undefined);

      const primitiveValues = values.filter(isPrimitive);
      if (primitiveValues.length > 0) {
        const types = new Set<FieldType>();
        primitiveValues.forEach((v) => types.add(getValueType(v)));
        setArrayCompressedField(indexed, `${wildcardPath}.${key}`, types);
      }

      values
        .filter(Array.isArray)
        .forEach((nestedArr) =>
          indexArray(nestedArr, `${wildcardPath}.${key}`, indexed)
        );

      values
        .filter(
          (v) => typeof v === "object" && v !== null && !Array.isArray(v)
        )
        .forEach((nestedObj) =>
          indexObject(nestedObj as AnyObject, `${wildcardPath}.${key}`, indexed)
        );
    });
  }

  arr.filter(Array.isArray).forEach((nestedArr) => {
    indexArray(nestedArr, wildcardPath, indexed);
  });
}

export function indexJson(json: AnyObject): IndexedJson {
  return indexObject(json);
}

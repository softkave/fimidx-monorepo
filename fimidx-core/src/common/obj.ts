import { isString } from "lodash-es";
import type {
  IObjPartLogicalQuery,
  IObjPartQueryItemNumberValue,
} from "../definitions/obj.js";

import assert from "assert";
import type {
  IObjPartQueryItem,
  IObjPartQueryList,
} from "../definitions/obj.js";
import { getMsFromDuration } from "./date.js";

export function isObjPartQueryItem(query: unknown): query is IObjPartQueryItem {
  return (
    typeof query === "object" &&
    query !== null &&
    "field" in query &&
    "value" in query &&
    "op" in query
  );
}

export function isObjPartQueryList(query: unknown): query is IObjPartQueryList {
  return (
    Array.isArray(query) && query.every((item) => isObjPartQueryItem(item))
  );
}

export function isObjPartLogicalQuery(
  query: unknown
): query is IObjPartLogicalQuery {
  return (
    typeof query === "object" &&
    query !== null &&
    ("and" in query || "or" in query || "not" in query)
  );
}

export function getNumberOrDurationMsFromValue(
  value: IObjPartQueryItemNumberValue
) {
  if (typeof value === "number") {
    return {
      valueNumber: value,
      durationMs: undefined,
    };
  }
  if (typeof value === "string") {
    const date = Date.parse(value);
    return {
      valueNumber: isNaN(date) ? undefined : date,
      durationMs: undefined,
    };
  }
  return {
    valueNumber: undefined,
    durationMs: getMsFromDuration(value),
  };
}

export function jsRecordToObjPartQueryList(
  record: Record<string, string>
): IObjPartQueryList {
  return Object.entries(record).map(([key, value]) => {
    assert.ok(isString(value), `Value must be a string: ${value}`);
    return {
      op: "eq",
      field: key,
      value,
    };
  });
}

export function flattenObjToDotNotationPartQuery(
  record: Record<string, any>,
  prefix = ""
): IObjPartQueryList {
  const result: IObjPartQueryList = [];
  for (const [key, value] of Object.entries(record)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      result.push(...flattenObjToDotNotationPartQuery(value, fullKey));
    } else {
      result.push({
        op: "eq",
        field: fullKey,
        value,
      });
    }
  }
  return result;
}

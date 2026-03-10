import { isString } from "lodash-es";
import type { IObjRecordQueryItemNumberValue } from "../definitions/obj.js";

import assert from "assert";
import type {
  IObjRecordQueryItem,
  IObjRecordQueryList,
} from "../definitions/obj.js";
import { getMsFromDuration } from "./date.js";

export function isObjRecordQueryItem(query: unknown): query is IObjRecordQueryItem {
  return (
    typeof query === "object" &&
    query !== null &&
    "field" in query &&
    "value" in query &&
    "op" in query
  );
}

export function isObjRecordQueryList(query: unknown): query is IObjRecordQueryList {
  return (
    Array.isArray(query) && query.every((item) => isObjRecordQueryItem(item))
  );
}

export function getNumberOrDurationMsFromValue(
  value: IObjRecordQueryItemNumberValue
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

export function jsRecordToObjRecordQueryList(
  record: Record<string, string>
): IObjRecordQueryList {
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
): IObjRecordQueryList {
  const result: IObjRecordQueryList = [];
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

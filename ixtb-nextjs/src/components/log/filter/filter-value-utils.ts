import { objRecordQueryItemOpSchema } from "fimidx-core/definitions/obj";

const kOps = objRecordQueryItemOpSchema.Values;

export function getDefaultOpForField(
  field?: { type: string }
): (typeof kOps)[keyof typeof kOps] {
  if (!field || field.type === "string") {
    return kOps.like;
  }
  return kOps.eq;
}

export function getDefaultValueForOp(
  op: (typeof kOps)[keyof typeof kOps]
): unknown {
  switch (op) {
    case kOps.in:
    case kOps.not_in:
      return [];
    case kOps.between:
      return ["", ""];
    default:
      return "";
  }
}

export function normalizeValueForOp(
  op: (typeof kOps)[keyof typeof kOps],
  value: unknown
): unknown {
  switch (op) {
    case kOps.in:
    case kOps.not_in:
      return normalizeStringArrayValue(value);
    case kOps.between:
      if (Array.isArray(value) && value.length === 2) {
        return value.map(String);
      }
      return ["", ""];
    default:
      if (Array.isArray(value)) {
        return value.map(String).join(", ");
      }
      return value ?? "";
  }
}

export function normalizeStringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (value === "" || value == null) {
    return [];
  }
  return [String(value)];
}

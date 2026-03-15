import { get } from "lodash-es";

/**
 * Get the first value present in the record for the given field paths
 * (dot-notation).
 */
export function getFirstValueFromFields(
  record: Record<string, unknown>,
  fieldPaths: string[]
): string | undefined {
  for (const path of fieldPaths) {
    const value = get(record, path);
    if (value != null && typeof value === "string") return value;
  }
  return undefined;
}

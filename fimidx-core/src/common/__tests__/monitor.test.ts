import { describe, expect, it } from "vitest";
import { extractMonitorFilters } from "../monitor.js";

describe("extractMonitorFilters", () => {
  it("returns empty for undefined", () => {
    expect(extractMonitorFilters(undefined)).toEqual([]);
  });

  it("returns leaf recordQuery", () => {
    const filters = [{ op: "eq" as const, field: "level", value: "error" }];
    expect(extractMonitorFilters({ recordQuery: filters })).toEqual(filters);
  });

  it("unwraps single and leaf", () => {
    const filters = [{ op: "eq" as const, field: "level", value: "error" }];
    expect(
      extractMonitorFilters({
        and: [{ recordQuery: filters }],
      })
    ).toEqual(filters);
  });

  it("does not flatten multi-leaf or into AND list", () => {
    const a = [{ op: "eq" as const, field: "level", value: "error" }];
    const b = [{ op: "eq" as const, field: "level", value: "fatal" }];
    // UI helper only unwraps the first branch; multi-or is not flattened.
    expect(
      extractMonitorFilters({
        or: [{ recordQuery: a }, { recordQuery: b }],
      })
    ).toEqual(a);
  });
});

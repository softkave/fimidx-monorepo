import { describe, expect, it } from "vitest";
import { symbolicateStack } from "../symbolicateStack.js";
import type { LookupPositionFn } from "../symbolicateStack.js";

describe("symbolicateStack", () => {
  it("symbolicates parsable stack lines using lookup position", async () => {
    const lookupPosition: LookupPositionFn = async (url, line, column) => {
      expect(url).toBe("https://cdn.example.com/dist/bundle.js");
      expect(line).toBe(1);
      expect(column).toBe(7);
      return {
        source: "src/original.ts",
        line: 42,
        column: 7,
        name: "origFn",
      };
    };

    const input = [
      "Error: boom",
      "    at foo (https://cdn.example.com/dist/bundle.js:1:7)",
    ].join("\n");

    const out = await symbolicateStack(input, lookupPosition);
    expect(out).toContain(
      "at origFn (https://cdn.example.com/src/original.ts:42:7)"
    );
    // Non-parsable error line should remain untouched.
    expect(out).toContain("Error: boom");
  });

  it("keeps the original line when lookup returns null", async () => {
    const lookupPosition: LookupPositionFn = async () => null;

    const input = "    at foo (https://cdn.example.com/dist/bundle.js:1:7)";
    const out = await symbolicateStack(input, lookupPosition);
    expect(out).toBe(input);
  });

  it("keeps the original line when lookup throws", async () => {
    const lookupPosition: LookupPositionFn = async () => {
      throw new Error("boom");
    };

    const input = "    at foo (https://cdn.example.com/dist/bundle.js:1:7)";
    const out = await symbolicateStack(input, lookupPosition);
    expect(out).toBe(input);
  });

  it("handles url-only stack frames (no explicit name)", async () => {
    // URL-only form: "at url:line:col" (no name before parens).
    const lookupPosition: LookupPositionFn = async () => {
      return { source: "src/original.ts", line: 10, column: 3, name: null };
    };

    const input = "    at https://cdn.example.com/dist/bundle.js:1:7";
    const out = await symbolicateStack(input, lookupPosition);
    expect(out).toContain(
      "at ? (https://cdn.example.com/src/original.ts:10:3)"
    );
  });
});


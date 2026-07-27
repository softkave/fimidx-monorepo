import { describe, expect, it } from "vitest";
import {
  parseStackLine,
  symbolicateStack,
  type LookupPositionFn,
} from "../symbolicateStack.js";

describe("parseStackLine", () => {
  it("parses named frames", () => {
    expect(
      parseStackLine("    at foo (https://cdn.example.com/dist/bundle.js:1:7)")
    ).toEqual({
      url: "https://cdn.example.com/dist/bundle.js",
      line: 1,
      column: 7,
      name: "foo",
    });
  });

  it("parses async named frames without treating async as part of the URL", () => {
    expect(
      parseStackLine(
        "    at async P (.next/server/chunks/[root-of-the-server]__e8f81e86._.js:1:1941)"
      )
    ).toEqual({
      url: ".next/server/chunks/[root-of-the-server]__e8f81e86._.js",
      line: 1,
      column: 1941,
      name: "P",
    });
  });

  it("parses anonymous async frames", () => {
    expect(
      parseStackLine(
        "    at async (.next/server/chunks/[root-of-the-server]__34d6e555._.js:1:3560)"
      )
    ).toEqual({
      url: ".next/server/chunks/[root-of-the-server]__34d6e555._.js",
      line: 1,
      column: 3560,
      name: null,
    });
  });

  it("parses absolute deploy paths", () => {
    expect(
      parseStackLine(
        "    at rf.error (/home/abbayomi/softkave-infra-wd/app-runs/ixtb-nextjs/instances/ixtb-nextjs-0/ixtb-nextjs/.next/server/chunks/[root-of-the-server]__058b11d4._.js:8:36674)"
      )
    ).toEqual({
      url: "/home/abbayomi/softkave-infra-wd/app-runs/ixtb-nextjs/instances/ixtb-nextjs-0/ixtb-nextjs/.next/server/chunks/[root-of-the-server]__058b11d4._.js",
      line: 8,
      column: 36674,
      name: "rf.error",
    });
  });

  it("parses url-only frames", () => {
    expect(
      parseStackLine("    at https://cdn.example.com/dist/bundle.js:1:7")
    ).toEqual({
      url: "https://cdn.example.com/dist/bundle.js",
      line: 1,
      column: 7,
      name: null,
    });
  });

  it("returns null for non-frame lines", () => {
    expect(parseStackLine("Error: boom")).toBeNull();
  });
});

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

  it("symbolicates async Next.js frames with absolute deploy paths", async () => {
    const absoluteUrl =
      "/home/abbayomi/softkave-infra-wd/app-runs/ixtb-nextjs/instances/ixtb-nextjs-0/ixtb-nextjs/.next/server/chunks/[root-of-the-server]__058b11d4._.js";

    const lookupPosition: LookupPositionFn = async (url, line, column) => {
      expect(url).toBe(absoluteUrl);
      expect(line).toBe(8);
      expect(column).toBe(36674);
      return {
        source: "src/lib/logger.ts",
        line: 12,
        column: 4,
        name: "error",
      };
    };

    const input = [
      "Error: boom",
      `    at async rf.error (${absoluteUrl}:8:36674)`,
    ].join("\n");

    const out = await symbolicateStack(input, lookupPosition);
    expect(out).toContain("at error (src/lib/logger.ts:12:4)");
  });
});

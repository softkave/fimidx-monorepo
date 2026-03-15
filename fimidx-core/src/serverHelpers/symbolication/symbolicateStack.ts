import { readFile } from "fs/promises";
import path from "path";
import type { RawSourceMap } from "source-map";
import { SourceMapConsumer } from "source-map";

/** Parse a stack line to extract url (or file path), line (1-based), column
 * (0-based). */
function parseStackLine(
  line: string
): { url: string; line: number; column: number } | null {
  // Match "at ... (url:line:col)" or "at url:line:col"
  const withParen = /^\s*at\s+(?:.*?\s+\()?(.+?):(\d+):(\d+)\)?\s*$/.exec(line);
  if (withParen) {
    return {
      url: withParen[1].trim(),
      line: parseInt(withParen[2], 10),
      column: parseInt(withParen[3], 10),
    };
  }
  return null;
}

/**
 * Symbolicate a stack trace string using source maps from a local directory.
 * mapPathByUrl: resolve minified URL/path to the path of the .map file in the
 * local dir.
 */
export async function symbolicateStack(
  stack: string,
  mapPathByUrl: (url: string) => string | null
): Promise<string> {
  const lines = stack.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const parsed = parseStackLine(line);
    if (!parsed) {
      out.push(line);
      continue;
    }

    const mapPath = mapPathByUrl(parsed.url);
    if (!mapPath) {
      out.push(line);
      continue;
    }

    try {
      const mapJson = await readFile(mapPath, "utf-8");
      const rawMap = JSON.parse(mapJson) as RawSourceMap;
      const consumer = await new SourceMapConsumer(rawMap);
      try {
        const pos = consumer.originalPositionFor({
          line: parsed.line,
          column: parsed.column,
        });
        if (pos.source != null && pos.line != null) {
          const column = pos.column ?? 0;
          out.push(
            `    at ${pos.name ?? "?"} (${pos.source}:${pos.line}:${column})`
          );
        } else {
          out.push(line);
        }
      } finally {
        consumer.destroy();
      }
    } catch {
      out.push(line);
    }
  }

  return out.join("\n");
}

/**
 * Resolve a minified URL (e.g. https://cdn.com/main.abc.js or
 * webpack:///./src/index.js) to a .map file path in the local source map
 * directory. Simple strategy: take the basename of the URL path, strip query,
 * append .map.
 */
export function defaultMapPathResolver(
  localDir: string,
  url: string
): string | null {
  try {
    const urlPath = url.split("?")[0];
    const basename = path.basename(urlPath);
    if (!basename) return null;
    const mapPath = path.join(localDir, `${basename}.map`);
    return mapPath;
  } catch {
    return null;
  }
}

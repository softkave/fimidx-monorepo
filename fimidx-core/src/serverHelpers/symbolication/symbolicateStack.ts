import path from "path";

export interface IParsedStackLine {
  url: string;
  line: number;
  column: number;
  name: string | null;
}

function formatSymbolicatedUrl(originalUrl: string, source: string): string {
  // const normalizedSource = normalizeSourcePath(source);
  // Expecting normalized source paths from the database.
  const normalizedSource = source;
  const original = originalUrl.trim();

  if (original.startsWith("webpack:///")) {
    return `webpack:///${normalizedSource}`;
  }

  if (original.startsWith("file://")) {
    // Preserve file:// scheme; keep it as file:/// for consistency.
    return `file:///${normalizedSource}`;
  }

  try {
    const u = new URL(original);
    u.pathname = `/${normalizedSource}`;
    // Keep query/hash if present (rare but possible in stack frames).
    return u.toString();
  } catch {
    // If we can't parse, fall back to the normalized source path.
    return normalizedSource;
  }
}

/** Parse a stack line to extract url (or file path), line (1-based), column
 * (0-based), and optional name (e.g. function name before "(url:line:col)"). */
export function parseStackLine(line: string): IParsedStackLine | null {
  // Match "at name (url:line:col)" or "at url:line:col"
  const withParen = /^\s*at\s+(?:([^\s(]+)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/.exec(
    line
  );
  if (withParen) {
    return {
      url: withParen[2].trim(),
      line: parseInt(withParen[3], 10),
      column: parseInt(withParen[4], 10),
      name: withParen[1]?.trim() ?? null,
    };
  }
  return null;
}

export interface IOriginalPosition {
  source: string | null;
  line: number | null;
  column: number | null;
  name: string | null;
}

export type LookupPositionFn = (
  url: string,
  line: number,
  column: number
) => Promise<IOriginalPosition | null>;

/**
 * Symbolicate a stack trace string using a lookup function (e.g.
 * MongoDB-backed). lookupPosition: given url, line, column from a stack line,
 * returns original position or null.
 */
export async function symbolicateStack(
  stack: string,
  lookupPosition: LookupPositionFn
): Promise<string> {
  const lines = stack.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const parsed = parseStackLine(line);
    if (!parsed) {
      out.push(line);
      continue;
    }

    try {
      const pos = await lookupPosition(parsed.url, parsed.line, parsed.column);
      if (pos != null && pos.source != null && pos.line != null) {
        const column = pos.column ?? 0;
        const name = pos.name ?? parsed.name ?? "?";
        const displayUrl = formatSymbolicatedUrl(parsed.url, pos.source);
        out.push(`    at ${name} (${displayUrl}:${pos.line}:${column})`);
      } else {
        out.push(line);
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

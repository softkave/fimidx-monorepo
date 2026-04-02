export function rewriteNodeStackToWebpackUrls(params: {
  stack: string;
  distDirAbsolute: string;
}): string {
  const { stack, distDirAbsolute } = params;
  const normalizedDist = distDirAbsolute.replace(/\\/g, "/").replace(/\/$/, "");

  const lines = stack.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const m =
      /^\s*at\s+(?:([^\s(]+)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/.exec(line);
    if (!m) {
      out.push(line);
      continue;
    }

    const name = m[1]?.trim();
    const url = m[2]?.trim() ?? "";
    const ln = m[3]!;
    const col = m[4]!;

    const normalizedUrl = url.replace(/\\/g, "/");
    const idx = normalizedUrl.lastIndexOf(`${normalizedDist}/`);
    if (idx === -1) {
      out.push(line);
      continue;
    }

    const rel = normalizedUrl.slice(idx + normalizedDist.length + 1);
    const nextUrl = `webpack:///./${rel}`;
    const prefix = name ? `    at ${name} (${nextUrl}:${ln}:${col})` : `    at ${nextUrl}:${ln}:${col}`;
    out.push(prefix);
  }

  return out.join("\n");
}

export function rewriteNodeStackToHttpUrls(params: {
  stack: string;
  distDirAbsolute: string;
  baseUrl: string;
}): string {
  const { stack, distDirAbsolute, baseUrl } = params;
  const normalizedDist = distDirAbsolute.replace(/\\/g, "/").replace(/\/$/, "");
  const normalizedBase = baseUrl.replace(/\/$/, "");

  const lines = stack.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const m =
      /^\s*at\s+(?:([^\s(]+)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/.exec(line);
    if (!m) {
      out.push(line);
      continue;
    }

    const name = m[1]?.trim();
    const url = m[2]?.trim() ?? "";
    const ln = m[3]!;
    const col = m[4]!;

    const normalizedUrl = url.replace(/\\/g, "/");
    const idx = normalizedUrl.lastIndexOf(`${normalizedDist}/`);
    if (idx === -1) {
      out.push(line);
      continue;
    }

    const rel = normalizedUrl.slice(idx + normalizedDist.length + 1);
    const nextUrl = `${normalizedBase}/${rel}`;
    const prefix = name
      ? `    at ${name} (${nextUrl}:${ln}:${col})`
      : `    at ${nextUrl}:${ln}:${col}`;
    out.push(prefix);
  }

  return out.join("\n");
}

export function rewriteNodeStackToFileUrls(params: {
  stack: string;
  distDirAbsolute: string;
}): string {
  const { stack, distDirAbsolute } = params;
  const normalizedDist = distDirAbsolute.replace(/\\/g, "/").replace(/\/$/, "");

  const lines = stack.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const m =
      /^\s*at\s+(?:([^\s(]+)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/.exec(line);
    if (!m) {
      out.push(line);
      continue;
    }

    const name = m[1]?.trim();
    const url = m[2]?.trim() ?? "";
    const ln = m[3]!;
    const col = m[4]!;

    const normalizedUrl = url.replace(/\\/g, "/");
    const idx = normalizedUrl.lastIndexOf(`${normalizedDist}/`);
    if (idx === -1) {
      out.push(line);
      continue;
    }

    const rel = normalizedUrl.slice(idx + normalizedDist.length + 1);
    const nextUrl = `file:///${rel}`;
    const prefix = name
      ? `    at ${name} (${nextUrl}:${ln}:${col})`
      : `    at ${nextUrl}:${ln}:${col}`;
    out.push(prefix);
  }

  return out.join("\n");
}


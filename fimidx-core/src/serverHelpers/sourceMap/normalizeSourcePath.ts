import path from "path";

export function normalizeSourcePath(source: string): string {
  // Sourcemaps sometimes contain relative paths like "../../../src/x.ts".
  // For symbolicated stacks we want stable, root-anchored paths.
  const withSlashes = source.replace(/\\/g, "/");
  const normalized = path.posix.normalize(withSlashes);
  const withoutLeadingDotSlash = normalized.replace(/^\.\//, "");
  // Strip any remaining leading "../" traversals.
  return withoutLeadingDotSlash.replace(/^(\.\.\/)+/, "");
}

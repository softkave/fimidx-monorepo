export const DEFAULT_REDACT_VALUE = '[redacted]';

export type CompiledRedactFields = {
  /** Bare names (no `.`) match this key at any depth. */
  anyDepthKeys: Set<string>;
  /** Dotted paths from the log root. `*` matches one path segment. */
  paths: string[][];
};

/**
 * Compile redact field specs for reuse across many log entries.
 *
 * - `"password"` — any field named `password`, at any depth
 * - `"user.email"` — that exact nested path from the log root
 * - `"items.*.token"` — `token` on every item in `items`
 */
export function compileRedactFields(fields: string[]): CompiledRedactFields {
  const anyDepthKeys = new Set<string>();
  const paths: string[][] = [];

  for (const field of fields) {
    if (!field) {
      continue;
    }
    if (field.includes('.')) {
      paths.push(field.split('.'));
    } else {
      anyDepthKeys.add(field);
    }
  }

  return {anyDepthKeys, paths};
}

export function hasRedactFields(compiled: CompiledRedactFields): boolean {
  return compiled.anyDepthKeys.size > 0 || compiled.paths.length > 0;
}

function matchesPath(current: string[], pattern: string[]): boolean {
  if (current.length !== pattern.length) {
    return false;
  }
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== '*' && pattern[i] !== current[i]) {
      return false;
    }
  }
  return true;
}

function shouldRedact(
  current: string[],
  key: string,
  compiled: CompiledRedactFields,
): boolean {
  if (compiled.anyDepthKeys.has(key)) {
    return true;
  }
  return compiled.paths.some(pattern => matchesPath(current, pattern));
}

/**
 * Replace configured fields with `replacement`. Works on already-serialized
 * (plain JSON) values. Does not recurse into a redacted value.
 */
export function redactLogFields(
  value: unknown,
  fields: string[] | CompiledRedactFields,
  replacement: string = DEFAULT_REDACT_VALUE,
): unknown {
  const compiled = Array.isArray(fields) ? compileRedactFields(fields) : fields;
  if (!hasRedactFields(compiled)) {
    return value;
  }
  return walk(value, [], compiled, replacement);
}

function walk(
  value: unknown,
  path: string[],
  compiled: CompiledRedactFields,
  replacement: string,
): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => {
      path.push(String(index));
      const next = walk(item, path, compiled, replacement);
      path.pop();
      return next;
    });
  }

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(
    value as Record<string, unknown>,
  )) {
    path.push(key);
    out[key] = shouldRedact(path, key, compiled)
      ? replacement
      : walk(nested, path, compiled, replacement);
    path.pop();
  }
  return out;
}

export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
  [key: string]: unknown;
};

/**
 * Turn an Error into a plain JSON-safe object. Error.name/message/stack are
 * non-enumerable, so JSON.stringify(error) is "{}" without this.
 */
export function serializeError(
  error: Error,
  seen: WeakSet<object> = new WeakSet(),
): SerializedError {
  if (seen.has(error)) {
    return {name: error.name, message: '[Circular]'};
  }
  seen.add(error);

  try {
    const out: SerializedError = {
      name: error.name,
      message: error.message,
    };

    if (error.stack) {
      out.stack = error.stack;
    }

    // Enumerable own props (e.g. `code` on many Node errors)
    for (const key of Object.keys(error)) {
      if (
        key === 'name' ||
        key === 'message' ||
        key === 'stack' ||
        key === 'cause'
      ) {
        continue;
      }
      out[key] = serializeForLog(
        (error as unknown as Record<string, unknown>)[key],
        seen,
      );
    }

    if ('cause' in error && error.cause !== undefined) {
      out.cause = serializeForLog(error.cause, seen);
    }

    return out;
  } finally {
    // Drop after finishing so the same Error can appear in sibling fields
    // (e.g. `{error, args: [error]}`) without becoming `[Circular]`.
    seen.delete(error);
  }
}

/** Deep-walk values and replace Error instances with serializeError output. */
export function serializeForLog(
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Error) {
    return serializeError(value, seen);
  }

  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map(item => serializeForLog(item, seen));
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      out[key] = serializeForLog(nested, seen);
    }
    return out;
  } finally {
    seen.delete(value);
  }
}

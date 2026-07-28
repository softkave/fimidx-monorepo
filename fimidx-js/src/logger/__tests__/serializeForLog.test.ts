import {describe, expect, it} from 'vitest';
import {serializeError, serializeForLog} from '../serializeForLog.js';

describe('serializeError', () => {
  it('extracts name, message, and stack', () => {
    const err = new Error('boom');
    err.name = 'TestError';

    expect(serializeError(err)).toEqual({
      name: 'TestError',
      message: 'boom',
      stack: err.stack,
    });
  });

  it('includes cause when present', () => {
    const cause = new Error('root');
    const err = new Error('wrapper', {cause});

    expect(serializeError(err)).toMatchObject({
      name: 'Error',
      message: 'wrapper',
      cause: {
        name: 'Error',
        message: 'root',
        stack: cause.stack,
      },
    });
  });

  it('includes enumerable own properties', () => {
    const err = new Error('fail') as Error & {code: string};
    err.code = 'ECONNRESET';

    expect(serializeError(err)).toMatchObject({
      message: 'fail',
      code: 'ECONNRESET',
    });
  });
});

describe('serializeForLog', () => {
  it('replaces nested Error values', () => {
    const err = new Error('nested');
    const result = serializeForLog({
      level: 'error',
      error: err,
      args: [err],
    }) as {
      error: {message: string};
      args: Array<{message: string}>;
    };

    expect(result.error.message).toBe('nested');
    expect(result.args[0].message).toBe('nested');
  });

  it('handles circular references', () => {
    const a: Record<string, unknown> = {};
    a.self = a;

    expect(serializeForLog(a)).toEqual({self: '[Circular]'});
  });

  it('serializes the same Error in sibling fields fully', () => {
    const err = new Error('nested');
    const result = serializeForLog({
      error: err,
      args: [err],
    }) as {
      error: {message: string};
      args: Array<{message: string}>;
    };

    expect(result.error.message).toBe('nested');
    expect(result.args[0].message).toBe('nested');
  });
});

import {describe, expect, it} from 'vitest';
import {
  compileRedactFields,
  hasRedactFields,
  redactLogFields,
} from '../redactLogFields.js';

describe('compileRedactFields', () => {
  it('treats bare names as any-depth keys and dotted specs as paths', () => {
    const compiled = compileRedactFields([
      'password',
      'user.email',
      'items.*.token',
      '',
    ]);

    expect(compiled.anyDepthKeys).toEqual(new Set(['password']));
    expect(compiled.paths).toEqual([
      ['user', 'email'],
      ['items', '*', 'token'],
    ]);
  });

  it('reports whether any fields were compiled', () => {
    expect(hasRedactFields(compileRedactFields([]))).toBe(false);
    expect(hasRedactFields(compileRedactFields(['password']))).toBe(true);
  });
});

describe('redactLogFields', () => {
  it('redacts a simple top-level field', () => {
    expect(
      redactLogFields({message: 'ok', password: 'secret'}, ['password']),
    ).toEqual({message: 'ok', password: '[redacted]'});
  });

  it('redacts a simple field name at any depth', () => {
    expect(
      redactLogFields(
        {
          message: 'ok',
          password: 'top',
          user: {password: 'nested', name: 'ada'},
        },
        ['password'],
      ),
    ).toEqual({
      message: 'ok',
      password: '[redacted]',
      user: {password: '[redacted]', name: 'ada'},
    });
  });

  it('redacts an exact nested path without touching the same key elsewhere', () => {
    expect(
      redactLogFields(
        {
          email: 'keep@example.com',
          user: {email: 'hide@example.com', name: 'ada'},
        },
        ['user.email'],
      ),
    ).toEqual({
      email: 'keep@example.com',
      user: {email: '[redacted]', name: 'ada'},
    });
  });

  it('redacts wildcard path segments', () => {
    expect(
      redactLogFields(
        {
          items: [
            {token: 'a', id: 1},
            {token: 'b', id: 2},
          ],
        },
        ['items.*.token'],
      ),
    ).toEqual({
      items: [
        {token: '[redacted]', id: 1},
        {token: '[redacted]', id: 2},
      ],
    });
  });

  it('replaces a whole nested object when the path points at it', () => {
    expect(
      redactLogFields(
        {user: {credentials: {password: 'x', secret: 'y'}, name: 'ada'}},
        ['user.credentials'],
      ),
    ).toEqual({
      user: {credentials: '[redacted]', name: 'ada'},
    });
  });

  it('uses a custom replacement string', () => {
    expect(
      redactLogFields({password: 'secret'}, ['password'], '***'),
    ).toEqual({password: '***'});
  });

  it('leaves values unchanged when no fields are configured', () => {
    const value = {password: 'secret'};
    expect(redactLogFields(value, [])).toBe(value);
  });
});

import {readFileSync} from 'fs';
import {spawnSync} from 'child_process';
import path from 'path';
import {fileURLToPath} from 'url';
import {describe, expect, it} from 'vitest';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as {
  bin: Record<string, string>;
};

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

describe('cli package surface', () => {
  it('declares a bin pointing at the compiled CLI entry', () => {
    expect(pkg.bin['fimidx-log-files-consumer']).toBe('./build/cli.js');
  });

  it('compiled CLI has a node shebang', async () => {
    const cliPath = path.join(packageRoot, 'build/cli.js');
    const content = readFileSync(cliPath, 'utf-8');
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('exits with usage when no config path is provided', () => {
    const cliPath = path.join(packageRoot, 'build/cli.js');
    const result = spawnSync(process.execPath, [cliPath], {
      encoding: 'utf-8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Usage: fimidx-log-files-consumer/);
  });

  it('library entry does not start the consumer as a side effect', async () => {
    // Importing the library module should not throw or exit.
    const mod = await import('../index.js');
    expect(typeof mod.startLogFilesConsumer).toBe('function');
    expect(mod).not.toHaveProperty('main');
  });
});

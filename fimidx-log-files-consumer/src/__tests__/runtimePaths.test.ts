import * as path from 'path';
import {describe, expect, it} from 'vitest';
import {getRuntimePaths} from '../runtimePaths.js';

describe('getRuntimePaths', () => {
  it('defaults workingDir to the current process directory', () => {
    const paths = getRuntimePaths();

    expect(paths.workingDir).toBe(process.cwd());
    expect(paths.runtimeDir).toBe(
      path.join(process.cwd(), '.fimidx-log-files-consumer'),
    );
    expect(paths.pidFilepath).toBe(
      path.join(paths.runtimeDir, 'consumer.pid'),
    );
    expect(paths.consumptionFilepath).toBe(
      path.join(paths.runtimeDir, 'consumption.json'),
    );
  });

  it('resolves a configured working directory', () => {
    const paths = getRuntimePaths('./var');

    expect(paths.workingDir).toBe(path.resolve('./var'));
    expect(paths.runtimeDir).toBe(
      path.resolve('./var/.fimidx-log-files-consumer'),
    );
  });
});

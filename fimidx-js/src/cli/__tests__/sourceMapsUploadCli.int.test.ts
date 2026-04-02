import {execFile} from 'child_process';
import {mkdir, mkdtemp, rm, writeFile} from 'fs/promises';
import {tmpdir} from 'os';
import path from 'path';
import {promisify} from 'util';
import {afterEach, describe, expect, it} from 'vitest';
import {getTestVars} from '../../testUtils/test.js';

const pExecFile = promisify(execFile);

function uniqueSuffix(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

describe('fimidx CLI (integration)', () => {
  let inputDir: string | null = null;

  afterEach(async () => {
    if (inputDir) {
      await rm(inputDir, {recursive: true, force: true});
      inputDir = null;
    }
  });

  it('runs `source-maps upload` against running API', async () => {
    const vars = getTestVars();
    const repo = `cli_int_repo_${uniqueSuffix()}`;
    const version = `cli_int_ver_${uniqueSuffix()}`;

    inputDir = await mkdtemp(path.join(tmpdir(), 'fimidx-cli-maps-'));
    await mkdir(path.join(inputDir, 'dist'), {recursive: true});
    await writeFile(
      path.join(inputDir, 'dist', 'bundle.js.map'),
      '{}',
      'utf-8',
    );

    // The CLI entrypoint is in build after `pretest` compile.
    const cliPath = path.resolve(process.cwd(), 'build', 'cli.js');

    const {stdout} = await pExecFile(process.execPath, [
      cliPath,
      'source-maps',
      'upload',
      '--client-token',
      vars.authToken,
      '--project-id',
      vars.projectId,
      '--repo',
      repo,
      '--version',
      version,
      '--path',
      inputDir,
      '--server-url',
      vars.serverURL,
    ]);

    expect(stdout).toContain('Upload complete.');
  }, 60_000);
});

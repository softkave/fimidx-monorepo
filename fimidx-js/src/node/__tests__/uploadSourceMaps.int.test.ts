import {FimidaraEndpoints} from 'fimidara';
import {mkdir, mkdtemp, rm, writeFile} from 'fs/promises';
import {tmpdir} from 'os';
import path from 'path';
import {afterEach, describe, expect, it} from 'vitest';
import {FimidxEndpoints} from '../../endpoints/fimidxEndpoints.js';
import {getTestVars} from '../../testUtils/test.js';
import {uploadSourceMaps} from '../uploadSourceMaps.js';

function uniqueSuffix(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

describe('uploadSourceMaps (integration, real API + real fimidara)', () => {
  let inputDir: string | null = null;

  afterEach(async () => {
    if (inputDir) {
      await rm(inputDir, {recursive: true, force: true});
      inputDir = null;
    }
  });

  it('uploads a folder by zipping, then file is readable from fimidara at returned filepath', async () => {
    const vars = getTestVars();
    const repo = `sdk_int_repo_${uniqueSuffix()}`;
    const version = `sdk_int_ver_${uniqueSuffix()}`;

    inputDir = await mkdtemp(path.join(tmpdir(), 'fimidx-js-maps-'));
    // Minimal directory; content doesn’t have to be a valid sourcemap for upload,
    // but should be non-empty so zip definitely contains bytes.
    await mkdir(path.join(inputDir, 'dist'), {recursive: true});
    await writeFile(
      path.join(inputDir, 'dist', 'bundle.js.map'),
      '{}',
      'utf-8',
    );

    // Use explicit fimidaraUrl if provided (else SDK falls back to env).
    const fimidaraUrl = process.env.FIMIDARA_SERVER_URL;

    await uploadSourceMaps({
      clientToken: vars.authToken,
      projectId: vars.projectId,
      repo,
      version,
      inputPath: inputDir,
      serverUrl: vars.serverURL,
      fimidaraUrl,
    });

    // Re-call getUploadToken to obtain the same (token,filePath) and verify file exists.
    // (Idempotent endpoint; even if token rotates, filePath is deterministic.)
    const endpoints = new FimidxEndpoints({
      authToken: vars.authToken,
      serverURL: vars.serverURL,
    });
    const {token, filePath} = await endpoints.sourceMaps.getUploadToken({
      projectId: vars.projectId,
      repoIdentifier: repo,
      version,
    });

    const fEndpoints = new FimidaraEndpoints({
      authToken: token,
      serverURL: fimidaraUrl?.replace(/\/$/, ''),
    });

    const stream = await fEndpoints.files.readFile(
      {filepath: filePath},
      {responseType: 'stream'},
    );

    // Consume a small amount to prove the file is there.
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk));
      if (chunks.reduce((n, b) => n + b.length, 0) > 1024) break;
    }
    expect(chunks.length).toBeGreaterThan(0);
  }, 60_000);

  it('throws when input path does not exist', async () => {
    const vars = getTestVars();
    await expect(
      uploadSourceMaps({
        clientToken: vars.authToken,
        projectId: vars.projectId,
        repo: `bad_repo_${uniqueSuffix()}`,
        version: `bad_ver_${uniqueSuffix()}`,
        inputPath: '/this/path/should/not/exist',
        serverUrl: vars.serverURL,
      }),
    ).rejects.toThrow(/Path not found:/);
  });
});

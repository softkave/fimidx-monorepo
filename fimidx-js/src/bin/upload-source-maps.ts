import archiver from 'archiver';
import {
  createWriteStream,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { FimidxEndpoints } from '../endpoints/fimidxEndpoints.js';

export interface IUploadSourceMapsOptions {
  clientToken: string;
  projectId: string;
  repo: string;
  version: string;
  inputPath: string;
  serverUrl: string;
  fimidaraUrl: string;
}

export async function uploadFileToFimidara(
  baseUrl: string,
  authToken: string,
  folderPath: string,
  fileName: string,
  localPath: string,
): Promise<void> {
  const filepath = folderPath + '/' + fileName;
  const url = `${baseUrl.replace(/\/$/, '')}/v1/files/uploadFile/${encodeURIComponent(filepath)}`;
  const buffer = readFileSync(localPath);
  const blob = new Blob([buffer]);
  const form = new FormData();
  form.append('data', blob);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'x-fimidara-file-size': String(buffer.length),
    },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fimidara upload failed: ${res.status} ${text}`);
  }
}

export async function runUploadSourceMaps(
  opts: IUploadSourceMapsOptions,
): Promise<void> {
  const endpoints = new FimidxEndpoints({
    authToken: opts.clientToken,
    serverURL: opts.serverUrl,
  });

  const { token, folderPath } = await endpoints.sourceMaps.getUploadToken({
    projectId: opts.projectId,
    repoIdentifier: opts.repo,
    version: opts.version,
  });

  const inputPath = path.resolve(opts.inputPath);
  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(inputPath);
  } catch {
    throw new Error(`Path not found: ${inputPath}`);
  }

  let fileToUpload: string;
  let isZip: boolean;

  if (stat.isDirectory()) {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'fimidx-source-maps-'));
    const zipPath = path.join(tempDir, 'source-maps.zip');
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(inputPath, false);
    archive.finalize();
    await new Promise<void>((resolve, reject) => {
      output.on('finish', resolve);
      output.on('error', reject);
      archive.on('error', reject);
    });
    fileToUpload = zipPath;
    isZip = true;
    try {
      await uploadFileToFimidara(
        opts.fimidaraUrl,
        token,
        folderPath,
        path.basename(zipPath),
        fileToUpload,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  } else {
    fileToUpload = inputPath;
    isZip = path.basename(inputPath).toLowerCase().endsWith('.zip');
    await uploadFileToFimidara(
      opts.fimidaraUrl,
      token,
      folderPath,
      path.basename(inputPath),
      fileToUpload,
    );
  }

  await endpoints.sourceMaps.notifyUploadComplete({
    projectId: opts.projectId,
    repoIdentifier: opts.repo,
    version: opts.version,
    isZip,
  });
}

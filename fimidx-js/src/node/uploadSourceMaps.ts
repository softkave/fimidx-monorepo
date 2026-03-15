import archiver from 'archiver';
import {FimidaraEndpoints} from 'fimidara';
import {createWriteStream} from 'fs';
import {mkdtemp, readFile, rm, stat} from 'fs/promises';
import {tmpdir} from 'os';
import path from 'path';
import {kDefaultServerURL} from '../constants.js';
import {FimidxEndpoints} from '../endpoints/fimidxEndpoints.js';

export interface IUploadSourceMapsOptions {
  clientToken: string;
  projectId: string;
  repo: string;
  version: string;
  inputPath: string;
  serverUrl?: string;
  fimidaraUrl?: string;
}

export async function uploadFileToFimidara(
  fimidaraUrl: string | undefined,
  authToken: string,
  filePath: string,
  localPath: string,
): Promise<void> {
  const buffer = await readFile(localPath);
  const endpoints = new FimidaraEndpoints({
    authToken,
    serverURL: fimidaraUrl?.replace(/\/$/, ''),
  });
  await endpoints.files.uploadFile({
    filepath: filePath,
    data: buffer,
    size: buffer.length,
  });
}

export async function uploadSourceMaps(
  opts: IUploadSourceMapsOptions,
): Promise<void> {
  const serverUrl = opts.serverUrl ?? kDefaultServerURL;
  const fimidaraUrl = opts.fimidaraUrl ?? process.env.FIMIDARA_SERVER_URL;

  const endpoints = new FimidxEndpoints({
    authToken: opts.clientToken,
    serverURL: serverUrl,
  });

  const {token, filePath} = await endpoints.sourceMaps.getUploadToken({
    projectId: opts.projectId,
    repoIdentifier: opts.repo,
    version: opts.version,
  });

  const inputPath = path.resolve(opts.inputPath);
  let statResult: Awaited<ReturnType<typeof stat>>;
  try {
    statResult = await stat(inputPath);
  } catch {
    throw new Error(`Path not found: ${inputPath}`);
  }

  let fileToUpload: string;
  let isZip: boolean;

  if (statResult.isDirectory()) {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'fimidx-source-maps-'));
    const zipPath = path.join(tempDir, 'source-maps.zip');
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', {zlib: {level: 9}});
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
      await uploadFileToFimidara(fimidaraUrl, token, filePath, fileToUpload);
    } finally {
      await rm(tempDir, {recursive: true, force: true});
    }
  } else {
    fileToUpload = inputPath;
    isZip = path.basename(inputPath).toLowerCase().endsWith('.zip');
    await uploadFileToFimidara(fimidaraUrl, token, filePath, fileToUpload);
  }

  await endpoints.sourceMaps.notifyUploadComplete({
    projectId: opts.projectId,
    repoIdentifier: opts.repo,
    version: opts.version,
    isZip,
  });
}

import AdmZip from "adm-zip";
import { readdir } from "fs/promises";
import path from "path";
import { getCoreConfig } from "../../common/getCoreConfig.js";
import type { ISourceMapUpload } from "../../definitions/sourceMap.js";
import {
  buildSourceMapStashPath,
  downloadFimidaraFile,
  listFimidaraFolder,
  uploadLocalFileToFimidara,
} from "../fimidara/index.js";
import { updateSourceMapUploadUnzipped } from "./updateSourceMapUploadUnzipped.js";

function getSourceMapsLocalDir(): string {
  const dir = getCoreConfig().sourceMaps?.localDir;
  return dir;
}

async function walkDir(
  dir: string,
  baseDir: string
): Promise<{ relativePath: string; localPath: string }[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const result: { relativePath: string; localPath: string }[] = [];
  for (const entry of entries) {
    const localPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, localPath).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      result.push(...(await walkDir(localPath, baseDir)));
    } else {
      result.push({ relativePath, localPath });
    }
  }
  return result;
}

/**
 * Unzip a source map upload: download zip from fimidara, extract, upload to
 * stash, update DB.
 */
export async function unzipSourceMapUpload(
  upload: ISourceMapUpload
): Promise<void> {
  const localDir = getSourceMapsLocalDir();
  const tempDir = path.join(
    localDir,
    "unzip-temp",
    upload.projectId,
    upload.repoIdentifier,
    upload.version,
    Date.now().toString()
  );

  const list = await listFimidaraFolder(upload.fimidaraPath);
  const zipEntry = list.find(
    (e) => e.isFile && e.name?.toLowerCase().endsWith(".zip")
  );
  if (!zipEntry?.filepath) {
    throw new Error(
      `No zip file found in ${upload.fimidaraPath} for upload ${upload.projectId}/${upload.repoIdentifier}/${upload.version}`
    );
  }

  const zipLocalPath = path.join(tempDir, "archive.zip");
  await downloadFimidaraFile(zipEntry.filepath, zipLocalPath);

  const extractDir = path.join(tempDir, "extracted");
  const zip = new AdmZip(zipLocalPath);
  zip.extractAllTo(extractDir, true);

  const stashBasePath = buildSourceMapStashPath(
    upload.projectId,
    upload.repoIdentifier,
    upload.version
  );

  const files = await walkDir(extractDir, extractDir);
  for (const { relativePath, localPath } of files) {
    const fimidaraFilepath = `${stashBasePath}/${relativePath}`;
    await uploadLocalFileToFimidara(localPath, fimidaraFilepath);
  }

  await updateSourceMapUploadUnzipped(
    upload.projectId,
    upload.repoIdentifier,
    upload.version,
    stashBasePath
  );
}

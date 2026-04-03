import { readFile, stat } from "fs/promises";
import { getFimidaraEndpoints } from "./fimidaraClient.js";

/**
 * Upload a local file to fimidara at the given filepath.
 */
export async function uploadLocalFileToFimidara(
  localPath: string,
  fimidaraFilepath: string,
  authToken?: string
): Promise<void> {
  const buffer = await readFile(localPath);
  const size = (await stat(localPath)).size;
  const endpoints = getFimidaraEndpoints(authToken);
  await endpoints.files.uploadFile({
    filepath: fimidaraFilepath,
    data: buffer,
    size,
  });
}

import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";
import { getFimidaraEndpoints } from "./fimidaraClient.js";

/**
 * Download a file from Fimidara to a local path.
 * Creates parent directories if needed.
 */
export async function downloadFimidaraFile(
  filepath: string,
  localPath: string,
  authToken?: string
): Promise<void> {
  await mkdir(path.dirname(localPath), { recursive: true });
  const endpoints = getFimidaraEndpoints(authToken);
  const stream = await endpoints.files.readFile(
    { filepath },
    { responseType: "stream" }
  );
  const wstream = createWriteStream(localPath, { autoClose: true });
  await pipeline(stream, wstream);
}

import { fimidaraAddRootnameToPath, FimidaraEndpoints } from "fimidara";
import { getCoreConfig } from "../../common/getCoreConfig.js";
import { normalizePathSegment } from "../../definitions/sourceMap.js";

const kDefaultRootname = "fimidx";
const kDefaultSourceMapsFolderpath = "source-maps";

/** Fixed zip filename in the version folder so we can download without listing. */
export const kSourceMapZipFileName = "source-maps.zip";

function getFimidaraAuthToken(): string {
  const fimidara = getCoreConfig().fimidara;
  return fimidara.authToken;
}

export function getFimidaraRootname(): string {
  return getCoreConfig().fimidara?.rootname ?? kDefaultRootname;
}

export function getFimidaraSourceMapsFolderpath(): string {
  const sourceMapsFolderpath =
    getCoreConfig().fimidara?.sourceMapsFolderpath ??
    kDefaultSourceMapsFolderpath;

  // Allow nested folder paths like `tests/source-maps`.
  const normalized = sourceMapsFolderpath
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map((seg) => normalizePathSegment(seg));

  return normalized.length > 0
    ? normalized.join("/")
    : kDefaultSourceMapsFolderpath;
}

export function getFimidaraEndpoints(authToken?: string): FimidaraEndpoints {
  return new FimidaraEndpoints({
    authToken: authToken ?? getFimidaraAuthToken(),
  });
}

/** Build folder path:
 * rootname/<sourceMapsFolderpath>/<projectId>/<normalizedRepo>/<normalizedVersion> */
export function buildSourceMapFolderPath(
  projectId: string,
  repoIdentifier: string,
  version: string
): string {
  const rootname = getFimidaraRootname();
  const sourceMapsFolderpath = getFimidaraSourceMapsFolderpath();
  const normalizedRepo = normalizePathSegment(repoIdentifier);
  const normalizedVersion = normalizePathSegment(version);
  const relative = `${sourceMapsFolderpath}/${projectId}/${normalizedRepo}/${normalizedVersion}`;
  return fimidaraAddRootnameToPath(relative, [rootname]);
}

/** Build full Fimidara file path for the source map zip. Returned to the client
 * so they upload to this exact path; we store it and use it for download. */
export function buildSourceMapZipFilePath(
  projectId: string,
  repoIdentifier: string,
  version: string
): string {
  const folder = buildSourceMapFolderPath(projectId, repoIdentifier, version);
  return `${folder}/${kSourceMapZipFileName}`;
}

/** Folder base for a project: rootname/<sourceMapsFolderpath>/<projectId> */
export function buildSourceMapProjectFolderPath(projectId: string): string {
  const rootname = getFimidaraRootname();
  const sourceMapsFolderpath = getFimidaraSourceMapsFolderpath();
  const relative = `${sourceMapsFolderpath}/${projectId}`;
  return fimidaraAddRootnameToPath(relative, [rootname]);
}

export async function ensureSourceMapsFolderExists(
  projectId: string
): Promise<{ folderpath: string }> {
  const endpoints = getFimidaraEndpoints();
  const folderpath = buildSourceMapProjectFolderPath(projectId);
  try {
    await endpoints.folders.getFolder({ folderpath });
    return { folderpath };
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (statusCode === 404) {
      await endpoints.folders.addFolder({
        folderpath,
        description: `Fimidx source maps folder for project ${projectId}`,
      });
      return { folderpath };
    }
    throw error;
  }
}

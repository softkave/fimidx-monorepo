import { fimidaraAddRootnameToPath, FimidaraEndpoints } from "fimidara";
import { getCoreConfig } from "../../common/getCoreConfig.js";
import { normalizePathSegment } from "../../definitions/sourceMap.js";

const kDefaultRootname = "fimidx";
const kSourceMapsFolder = "source-maps";
const kSourceMapsStashFolder = "source-maps-stash";

function getFimidaraAuthToken(): string {
  const fimidara = getCoreConfig().fimidara;
  return fimidara.authToken;
}

function getFimidaraRootname(): string {
  return getCoreConfig().fimidara?.rootname ?? kDefaultRootname;
}

export function getFimidaraEndpoints(authToken?: string): FimidaraEndpoints {
  return new FimidaraEndpoints({
    authToken: authToken ?? getFimidaraAuthToken(),
  });
}

/** Build path:
 * rootname/source-maps/<projectId>/<normalizedRepo>/<normalizedVersion> */
export function buildSourceMapFolderPath(
  projectId: string,
  repoIdentifier: string,
  version: string
): string {
  const rootname = getFimidaraRootname();
  const normalizedRepo = normalizePathSegment(repoIdentifier);
  const normalizedVersion = normalizePathSegment(version);
  const relative = `${kSourceMapsFolder}/${projectId}/${normalizedRepo}/${normalizedVersion}`;
  return fimidaraAddRootnameToPath(relative, [rootname]);
}

/** Folder base for a project: rootname/source-maps/<projectId> */
export function buildSourceMapProjectFolderPath(projectId: string): string {
  const rootname = getFimidaraRootname();
  const relative = `${kSourceMapsFolder}/${projectId}`;
  return fimidaraAddRootnameToPath(relative, [rootname]);
}

/** Stash path for unzipped content:
 * rootname/source-maps-stash/<projectId>/<repo>/<version> */
export function buildSourceMapStashPath(
  projectId: string,
  repoIdentifier: string,
  version: string
): string {
  const rootname = getFimidaraRootname();
  const normalizedRepo = normalizePathSegment(repoIdentifier);
  const normalizedVersion = normalizePathSegment(version);
  const relative = `${kSourceMapsStashFolder}/${projectId}/${normalizedRepo}/${normalizedVersion}`;
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

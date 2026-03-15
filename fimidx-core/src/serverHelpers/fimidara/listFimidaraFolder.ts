import { getFimidaraEndpoints } from "./fimidaraClient.js";

export interface FimidaraFolderEntry {
  name: string;
  filepath?: string;
  folderpath?: string;
  isFile?: boolean;
  isFolder?: boolean;
  resourceId?: string;
}

/**
 * List all content in a Fimidara folder (files and subfolders).
 * Paginates internally to return full list.
 */
export async function listFimidaraFolder(
  folderpath: string,
  authToken?: string
): Promise<FimidaraFolderEntry[]> {
  const endpoints = getFimidaraEndpoints(authToken);
  const all: FimidaraFolderEntry[] = [];
  let page = 0;
  const pageSize = 100;
  let hasMore = true;
  while (hasMore) {
    const result = await endpoints.folders.listFolderContent({
      folderpath,
      page,
      pageSize,
    });
    const files = (result.files ?? []).map((f: { name?: string; filepath?: string; resourceId?: string }) => ({
      name: f.name ?? "",
      filepath: f.filepath,
      isFile: true,
      resourceId: f.resourceId,
    }));
    const folders = (result.folders ?? []).map((f: { name?: string; folderpath?: string; resourceId?: string }) => ({
      name: f.name ?? "",
      folderpath: f.folderpath,
      isFolder: true,
      resourceId: f.resourceId,
    }));
    all.push(...files, ...folders);
    hasMore = (result.files?.length ?? 0) + (result.folders?.length ?? 0) >= pageSize;
    page++;
  }
  return all;
}

import type { AgentToken, Folder, PermissionGroup } from "fimidara";
import * as fimidara from "fimidara";
import { MfdocEndpointError } from "fimidara";
import type { Readable } from "stream";
import { getCoreConfig } from "../../common/getCoreConfig.js";

let fimidaraEndpoints: fimidara.FimidaraEndpoints | null = null;

export function getFimidaraEndpoints(): fimidara.FimidaraEndpoints {
  if (!fimidaraEndpoints) {
    const { fimidara: fimidaraConfig } = getCoreConfig();
    fimidaraEndpoints = new fimidara.FimidaraEndpoints({
      authToken: fimidaraConfig.authToken,
    });
  }
  return fimidaraEndpoints;
}

export async function getOrCreateAgentToken(params: {
  providedResourceId: string;
  name: string;
  description?: string;
}): Promise<AgentToken> {
  const { providedResourceId, name, description } = params;
  const endpoints = getFimidaraEndpoints();

  try {
    const { token } = await endpoints.agentTokens.getToken({
      providedResourceId,
    });
    return token;
  } catch (error) {
    if (error instanceof MfdocEndpointError) {
      const isNotFoundError = error.statusCode === 404;
      if (isNotFoundError) {
        const { token } = await endpoints.agentTokens.addToken({
          providedResourceId,
          description: description || `Fimidx agent token for ${name}`,
          shouldEncode: true,
          name,
        });
        return token;
      }
    }
    throw error;
  }
}

export async function encodeAgentToken(token: AgentToken): Promise<string> {
  const endpoints = getFimidaraEndpoints();
  const { jwtToken } = await endpoints.agentTokens.encodeToken({
    tokenId: token.resourceId,
  });
  return jwtToken;
}

export async function ensureFolder(params: {
  folderpath: string;
  description?: string;
}): Promise<Folder> {
  const { folderpath, description } = params;
  const endpoints = getFimidaraEndpoints();

  try {
    const { folder } = await endpoints.folders.getFolder({
      folderpath,
    });
    return folder;
  } catch (error) {
    if (error instanceof MfdocEndpointError) {
      const isNotFoundError = error.statusCode === 404;
      if (isNotFoundError) {
        const { folder } = await endpoints.folders.addFolder({
          folderpath,
          description: description || `Fimidx folder: ${folderpath}`,
        });
        return folder;
      }
    }
    throw error;
  }
}

export async function getOrCreatePermissionGroup(params: {
  workspaceId: string;
  name: string;
  description?: string;
}): Promise<PermissionGroup> {
  const { workspaceId, name, description } = params;
  const endpoints = getFimidaraEndpoints();

  try {
    // Try to find existing permission group by listing and filtering
    // Note: fimidara SDK may not have a direct get by name, so we'll create if not found
    const { permissionGroups } =
      await endpoints.permissionGroups.getWorkspacePermissionGroups({
        workspaceId,
      });
    const existingGroup = permissionGroups.find((g) => g.name === name);
    if (existingGroup) {
      return existingGroup;
    }
  } catch (error) {
    // If listing fails, we'll try to create
  }

  // Create new permission group
  const { permissionGroup } =
    await endpoints.permissionGroups.addPermissionGroup({
      workspaceId,
      name,
      description: description || `Fimidx permission group: ${name}`,
    });
  return permissionGroup;
}

export async function assignPermissionGroupToToken(params: {
  workspaceId: string;
  permissionGroupId: string;
  agentTokenId: string;
}): Promise<void> {
  const { workspaceId, permissionGroupId, agentTokenId } = params;
  const endpoints = getFimidaraEndpoints();

  await endpoints.permissionGroups.assignPermissionGroups({
    workspaceId,
    entityId: agentTokenId,
    permissionGroupId: permissionGroupId,
  });
}

export async function addPermissionToGroup(params: {
  workspaceId: string;
  permissionGroupId: string;
  action: fimidara.FimidaraPermissionAction[];
  targetId: string;
}): Promise<void> {
  const { workspaceId, permissionGroupId, action, targetId } = params;
  const endpoints = getFimidaraEndpoints();

  await endpoints.permissionItems.addItems({
    workspaceId,
    items: [
      {
        access: true,
        action: action as any,
        entityId: permissionGroupId,
        targetId,
      },
    ],
  });
}

export async function listFolderContent(params: {
  folderpath: string;
  page?: number;
}): Promise<{ files: fimidara.File[]; folders: Folder[] }> {
  const { folderpath, page = 0 } = params;
  const endpoints = getFimidaraEndpoints();

  const { files, folders } = await endpoints.folders.listFolderContent({
    folderpath,
    page,
  });

  return { files, folders };
}

export async function readFileWithRange(params: {
  filepath: string;
  rangeStart?: number;
  rangeEnd?: number;
}): Promise<Readable> {
  const { filepath, rangeStart, rangeEnd } = params;
  const endpoints = getFimidaraEndpoints();

  const response = await endpoints.files.readFile(
    {
      filepath,
      ranges:
        rangeStart && rangeEnd
          ? [
              {
                start: rangeStart,
                end: rangeEnd,
              },
            ]
          : undefined,
    },
    {
      responseType: "stream",
    }
  );

  return response;
}

import type { AgentToken, Folder } from "fimidara";
import { getProjectFimidaraToken } from "../sourceMap/getProjectFimidaraToken.js";
import { upsertProjectFimidaraToken } from "../sourceMap/upsertProjectFimidaraToken.js";
import {
  ensureSourceMapsFolderExists,
  getFimidaraEndpoints,
} from "./fimidaraClient.js";

export interface EnsureProjectFimidaraTokenResult {
  encodedToken: string;
  folderBasePath: string;
}

async function ensureTokenHasAccessToFolder(
  folder: Folder,
  token: AgentToken
): Promise<void> {
  const endpoints = getFimidaraEndpoints();
  await endpoints.permissionItems.addItems({
    items: [
      {
        access: true,
        action: ["readFolder", "uploadFile", "readFile", "deleteFile"],
        entityId: token.resourceId,
        targetId: folder.resourceId,
      },
    ],
  });
}

async function getOrCreateAgentToken(projectId: string): Promise<AgentToken> {
  const endpoints = getFimidaraEndpoints();
  try {
    const { token } = await endpoints.agentTokens.getToken({
      providedResourceId: projectId,
    });
    return token;
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (statusCode === 404) {
      const { token } = await endpoints.agentTokens.addToken({
        providedResourceId: projectId,
        description: `Fimidx source map upload token for project ${projectId}`,
        shouldEncode: true,
        name: `fimidx-source-maps-${projectId}`,
      });
      return token;
    }
    throw error;
  }
}

async function encodeToken(token: AgentToken): Promise<string> {
  let jwtToken = token.jwtToken;
  if (!jwtToken) {
    const endpoints = getFimidaraEndpoints();
    const result = await endpoints.agentTokens.encodeToken({
      tokenId: token.resourceId,
    });
    jwtToken = result.jwtToken;
  }
  if (!jwtToken) throw new Error("Failed to encode Fimidara token");
  return jwtToken;
}

/**
 * Ensure project has a Fimidara token for uploading source maps. Returns
 * existing token from DB or creates one, ensures folder exists, grants
 * permission, encodes, and stores.
 */
export async function ensureProjectFimidaraToken(
  projectId: string
): Promise<EnsureProjectFimidaraTokenResult> {
  const existing = await getProjectFimidaraToken(projectId);
  if (existing?.encodedToken && existing.folderBasePath) {
    return {
      encodedToken: existing.encodedToken,
      folderBasePath: existing.folderBasePath,
    };
  }

  const { folderpath } = await ensureSourceMapsFolderExists(projectId);
  const endpoints = getFimidaraEndpoints();
  const { folder } = await endpoints.folders.getFolder({ folderpath });
  const token = await getOrCreateAgentToken(projectId);
  await ensureTokenHasAccessToFolder(folder, token);
  const encodedToken = await encodeToken(token);

  await upsertProjectFimidaraToken({
    projectId,
    fimidaraTokenId: token.resourceId,
    encodedToken,
    folderBasePath: folderpath,
    updatedAt: new Date(),
  });

  return { encodedToken, folderBasePath: folderpath };
}

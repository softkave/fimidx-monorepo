import { randomUUID } from "crypto";
import { getCoreConfig } from "../../common/getCoreConfig.js";
import type { IClientToken } from "../../definitions/clientToken.js";
import type { InitSdkEndpointResponse } from "../../definitions/log.js";
import {
  addPermissionToGroup,
  assignPermissionGroupToToken,
  encodeAgentToken,
  ensureFolder,
  getOrCreateAgentToken,
  getOrCreatePermissionGroup,
} from "../fimidara/index.js";

export async function initSdk(params: {
  clientToken: IClientToken;
}): Promise<InitSdkEndpointResponse> {
  const { clientToken } = params;
  const { fimidara: fimidaraConfig } = getCoreConfig();

  // Get or create fimidara agent token using client token ID as providedResourceId
  const agentToken = await getOrCreateAgentToken({
    providedResourceId: clientToken.id,
    name: `fimidx-client-token-${clientToken.id}`,
    description: `Fimidx agent token for client token ${clientToken.id}`,
  });

  // Create folder for the app if it doesn't exist
  const folderPath = `${fimidaraConfig.workspaceRootname}/${fimidaraConfig.logsFolderPrefix}/${clientToken.appId}`;
  const folder = await ensureFolder({
    folderpath: folderPath,
    description: `Fimidx logs folder for app ${clientToken.appId}`,
  });

  // Get workspace ID from folder (workspaceId is in folder object)
  const workspaceId = folder.workspaceId;

  // Create "write logs" permission group for the app if it doesn't exist
  const permissionGroupName = `fimidx-write-logs-${clientToken.appId}`;
  const permissionGroup = await getOrCreatePermissionGroup({
    workspaceId,
    name: permissionGroupName,
    description: `Fimidx write logs permission group for app ${clientToken.appId}`,
  });

  // Add permission to upload file in the folder
  await addPermissionToGroup({
    workspaceId,
    permissionGroupId: permissionGroup.resourceId,
    action: ["uploadFile"],
    targetId: folder.resourceId,
  });

  // Assign permission group to agent token
  await assignPermissionGroupToToken({
    workspaceId,
    permissionGroupId: permissionGroup.resourceId,
    agentTokenId: agentToken.resourceId,
  });

  // Encode agent token to JWT string
  const fimidaraToken = await encodeAgentToken(agentToken);

  // Generate unique file prefix (UUID v4)
  const filePrefix = randomUUID();

  return {
    fimidaraToken,
    folderPath,
    filePrefix,
  };
}

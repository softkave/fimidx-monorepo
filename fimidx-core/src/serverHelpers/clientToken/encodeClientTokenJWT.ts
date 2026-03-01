import { createHash } from "crypto";
import jwt from "jsonwebtoken";
import { v7 as uuidv7 } from "uuid";
import { getCoreConfig } from "../../common/getCoreConfig.js";
import type { EncodeClientTokenJWTEndpointArgs } from "../../definitions/clientToken.js";

export const kDefaultExpiresAtDuration = 1000 * 60 * 60 * 24 * 30; // 30 days

export function getJWTSecret() {
  const { jwtSecret } = getCoreConfig();
  return jwtSecret;
}

export interface IEncodeClientTokenJWTContent {
  id: string;
  refreshToken?: string;
  duration?: number;
  groupId: string;
  projectId: string;
}

export async function encodeClientTokenJWT(params: {
  id: string;
  groupId: string;
  projectId: string;
  args: EncodeClientTokenJWTEndpointArgs;
}) {
  const { id, groupId, projectId, args } = params;
  const { refresh, expiresAt: expiresAtDate } = args;

  const refreshToken = refresh
    ? createHash("sha256").update(uuidv7()).digest("hex")
    : undefined;

  const expiresAt = expiresAtDate
    ? new Date(expiresAtDate)
    : refreshToken
    ? new Date(Date.now() + kDefaultExpiresAtDuration)
    : undefined;

  const duration = expiresAt ? expiresAt.getTime() - Date.now() : undefined;
  const content: IEncodeClientTokenJWTContent = {
    id,
    refreshToken,
    duration,
    groupId,
    projectId,
  };

  const token = jwt.sign(
    content,
    getJWTSecret(),
    duration ? { expiresIn: `${duration}ms` } : undefined
  );

  return { token, refreshToken };
}

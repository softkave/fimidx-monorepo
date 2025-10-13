import assert from "assert";
import { createHash } from "crypto";
import jwt from "jsonwebtoken";
import { v7 as uuidv7 } from "uuid";
import { OwnServerError } from "../../common/error.js";
import {
  getJWTSecret,
  type IEncodeClientTokenJWTContent,
} from "./encodeClientTokenJWT.js";

export async function refreshClientTokenJWT(params: {
  id: string;
  refreshToken: string;
  jwtContent: IEncodeClientTokenJWTContent;
}) {
  const { id, refreshToken: oldRefreshToken, jwtContent } = params;

  assert.ok(
    oldRefreshToken === jwtContent.refreshToken,
    new OwnServerError("Invalid refresh token", 401)
  );

  const refreshToken = createHash("sha256").update(uuidv7()).digest("hex");
  const token = jwt.sign(
    { id, duration: jwtContent.duration, refreshToken },
    getJWTSecret(),
    { expiresIn: jwtContent.duration }
  );

  return { token, refreshToken };
}

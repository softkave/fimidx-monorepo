import { authApi } from "@/auth";
import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { IClientToken } from "fimidx-core/definitions/clientToken";
import { kByTypes } from "fimidx-core/definitions/other";
import {
  getJWTSecret,
  IEncodeClientTokenJWTContent,
} from "fimidx-core/serverHelpers/clientToken/encodeClientTokenJWT";
import { getClientTokenById } from "fimidx-core/serverHelpers/index";
import jwt from "jsonwebtoken";
import { isString } from "lodash-es";
import { NextRequest } from "next/server";
import { AnyFn, AnyObject } from "softkave-js-utils";
import { IRouteContext, wrapRoute } from "./wrapRoute";

type BetterAuthSession = NonNullable<
  Awaited<ReturnType<typeof authApi.api.getSession>>
>;

export interface IUserAuthenticatedRequest {
  session: BetterAuthSession;
  userId: string;
  email: string;
  user: BetterAuthSession["user"];
}

export interface IClientTokenAuthenticatedRequest {
  clientToken: IClientToken;
  jwtContent: IEncodeClientTokenJWTContent;
  checkOrgId: (orgId: string) => void;
}

export type IMaybeAuthenticatedRequest = Partial<
  IUserAuthenticatedRequest & IClientTokenAuthenticatedRequest
> & {
  by?: string;
  byType?: string;
  getBy: () => {
    by: string;
    byType: string;
  };
};

async function tryGetUserAuthenticatedRequest(
  req: NextRequest,
): Promise<IUserAuthenticatedRequest | null> {
  const session = await authApi.api.getSession({ headers: req.headers });

  if (!session) {
    return null;
  }

  assert.ok(session, new OwnServerError("Unauthorized", 401));
  assert.ok(session.user, new OwnServerError("Unauthorized", 401));
  assert.ok(session.user.id, new OwnServerError("Unauthorized", 401));
  assert.ok(session.user.email, new OwnServerError("Unauthorized", 401));
  return {
    session,
    // Better Auth maps Mongo `_id` → user.id (ObjectId hex).
    userId: session.user.id,
    email: session.user.email,
    user: session.user,
  };
}

async function tryGetClientTokenAuthenticatedRequest(
  req: NextRequest,
): Promise<IClientTokenAuthenticatedRequest | null> {
  const rawToken = req.headers.get("authorization");
  if (!rawToken) {
    return null;
  }

  const inputToken = rawToken.startsWith("Bearer ")
    ? rawToken.slice(7)
    : rawToken;

  assert.ok(isString(inputToken), new OwnServerError("Unauthorized", 401));

  try {
    const decodedToken = jwt.verify(
      inputToken,
      getJWTSecret(),
    ) as IEncodeClientTokenJWTContent;

    const clientToken = await getClientTokenById({
      id: decodedToken.id,
      projectId: decodedToken.projectId,
      groupId: decodedToken.groupId,
    });

    assert.ok(
      clientToken.projectId === decodedToken.projectId,
      new OwnServerError("Unauthorized", 401),
    );
    assert.ok(
      clientToken.groupId === decodedToken.groupId,
      new OwnServerError("Unauthorized", 401),
    );

    return {
      clientToken,
      jwtContent: decodedToken,
      checkOrgId: (orgId: string) => {
        assert.ok(
          orgId === clientToken.groupId,
          new OwnServerError("Unauthorized", 401),
        );
      },
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new OwnServerError("Unauthorized", 401);
    }

    throw error;
  }
}

async function getUserAuthenticatedRequest(
  req: NextRequest,
): Promise<IUserAuthenticatedRequest> {
  const userAuthenticatedRequest = await tryGetUserAuthenticatedRequest(req);
  assert.ok(userAuthenticatedRequest, new OwnServerError("Unauthorized", 401));
  return userAuthenticatedRequest;
}

async function getClientTokenAuthenticatedRequest(
  req: NextRequest,
): Promise<IClientTokenAuthenticatedRequest> {
  const clientTokenAuthenticatedRequest =
    await tryGetClientTokenAuthenticatedRequest(req);
  assert.ok(
    clientTokenAuthenticatedRequest,
    new OwnServerError("Unauthorized", 401),
  );
  return clientTokenAuthenticatedRequest;
}

export const wrapUserAuthenticated = (
  routeFn: AnyFn<
    [NextRequest, IRouteContext, IUserAuthenticatedRequest],
    Promise<void | AnyObject>
  >,
) =>
  wrapRoute(async (req: NextRequest, ctx: IRouteContext) => {
    const userAuthenticatedRequest = await getUserAuthenticatedRequest(req);
    return routeFn(req, ctx, userAuthenticatedRequest);
  });

export const wrapClientTokenAuthenticated = (
  routeFn: AnyFn<
    [NextRequest, IRouteContext, IClientTokenAuthenticatedRequest],
    Promise<void | AnyObject>
  >,
) => {
  return wrapRoute(async (req: NextRequest, ctx: IRouteContext) => {
    const clientTokenAuthenticatedRequest =
      await getClientTokenAuthenticatedRequest(req);
    return routeFn(req, ctx, clientTokenAuthenticatedRequest);
  });
};

export const wrapUserOrClientTokenAuthenticated = (
  routeFn: AnyFn<
    [NextRequest, IRouteContext, IMaybeAuthenticatedRequest],
    Promise<void | AnyObject>
  >,
) =>
  wrapRoute(async (req: NextRequest, ctx: IRouteContext) => {
    const userAuthenticatedRequest = await tryGetUserAuthenticatedRequest(req);
    const clientTokenAuthenticatedRequest =
      await tryGetClientTokenAuthenticatedRequest(req);

    if (!userAuthenticatedRequest && !clientTokenAuthenticatedRequest) {
      throw new OwnServerError(
        "Unauthorized",
        kOwnServerErrorCodes.Unauthorized,
      );
    }

    return routeFn(req, ctx, {
      ...userAuthenticatedRequest,
      ...clientTokenAuthenticatedRequest,
      getBy: () => {
        if (userAuthenticatedRequest) {
          return {
            by: userAuthenticatedRequest.userId,
            byType: kByTypes.user,
          };
        }
        if (clientTokenAuthenticatedRequest) {
          return {
            by: clientTokenAuthenticatedRequest.clientToken.groupId,
            byType: kByTypes.clientToken,
          };
        }
        throw new OwnServerError("Unauthorized", 401);
      },
    });
  });

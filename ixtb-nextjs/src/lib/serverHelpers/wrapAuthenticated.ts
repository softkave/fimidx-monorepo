import { auth, NextAuthRequest } from "@/auth";
import assert from "assert";
import { OwnServerError } from "fimidx-core/common/error";
import { IClientToken } from "fimidx-core/definitions/clientToken";
import { kByTypes } from "fimidx-core/definitions/other";
import {
  getJWTSecret,
  IEncodeClientTokenJWTContent,
} from "fimidx-core/serverHelpers/clientToken/encodeClientTokenJWT";
import jwt from "jsonwebtoken";
import { isString } from "lodash-es";
import { Session } from "next-auth";
import { NextRequest } from "next/server";
import { AnyFn, AnyObject } from "softkave-js-utils";
import { getClientToken } from "./clientToken/getClientToken";
import { IRouteContext, wrapRoute } from "./wrapRoute";

export interface IUserAuthenticatedRequest {
  session: Session;
  userId: string;
  email: string;
  user: Session["user"];
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

type RouteFn = AnyFn<[NextAuthRequest, IRouteContext], Promise<Response>>;

const authFn = auth as unknown as AnyFn<[RouteFn], RouteFn>;

function tryGetUserAuthenticatedRequest(
  req: NextAuthRequest
): IUserAuthenticatedRequest | null {
  const session = req.auth;
  if (!session) {
    return null;
  }

  assert.ok(session, new OwnServerError("Unauthorized", 401));
  assert.ok(session.user, new OwnServerError("Unauthorized", 401));
  assert.ok(session.user.id, new OwnServerError("Unauthorized", 401));
  assert.ok(session.user.email, new OwnServerError("Unauthorized", 401));
  return {
    session,
    userId: session.user.id,
    email: session.user.email,
    user: session.user,
  };
}

async function tryGetClientTokenAuthenticatedRequest(
  req: NextRequest
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
      getJWTSecret()
    ) as IEncodeClientTokenJWTContent;

    const { clientToken } = await getClientToken({
      input: { clientTokenId: decodedToken.id },
    });

    assert.ok(
      clientToken.appId === decodedToken.appId,
      new OwnServerError("Unauthorized", 401)
    );
    assert.ok(
      clientToken.groupId === decodedToken.groupId,
      new OwnServerError("Unauthorized", 401)
    );

    return {
      clientToken,
      jwtContent: decodedToken,
      checkOrgId: (orgId: string) => {
        assert.ok(
          orgId === clientToken.groupId,
          new OwnServerError("Unauthorized", 401)
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

function getUserAuthenticatedRequest(
  req: NextAuthRequest
): IUserAuthenticatedRequest {
  const userAuthenticatedRequest = tryGetUserAuthenticatedRequest(req);
  assert.ok(userAuthenticatedRequest, new OwnServerError("Unauthorized", 401));
  return userAuthenticatedRequest;
}

async function getClientTokenAuthenticatedRequest(
  req: NextRequest
): Promise<IClientTokenAuthenticatedRequest> {
  const clientTokenAuthenticatedRequest =
    await tryGetClientTokenAuthenticatedRequest(req);
  assert.ok(
    clientTokenAuthenticatedRequest,
    new OwnServerError("Unauthorized", 401)
  );
  return clientTokenAuthenticatedRequest;
}

export const wrapUserAuthenticated = (
  routeFn: AnyFn<
    [NextAuthRequest, IRouteContext, IUserAuthenticatedRequest],
    Promise<void | AnyObject>
  >
) =>
  authFn(
    wrapRoute(async (req: NextAuthRequest, ctx: IRouteContext) => {
      const userAuthenticatedRequest = getUserAuthenticatedRequest(req);
      return routeFn(req, ctx, userAuthenticatedRequest);
    })
  );

export const wrapClientTokenAuthenticated = (
  routeFn: AnyFn<
    [NextRequest, IRouteContext, IClientTokenAuthenticatedRequest],
    Promise<void | AnyObject>
  >
) => {
  return wrapRoute(async (req: NextRequest, ctx: IRouteContext) => {
    const clientTokenAuthenticatedRequest =
      await getClientTokenAuthenticatedRequest(req);
    return routeFn(req, ctx, clientTokenAuthenticatedRequest);
  });
};

export const wrapMaybeAuthenticated = (
  routeFn: AnyFn<
    [NextAuthRequest, IRouteContext, IMaybeAuthenticatedRequest],
    Promise<void | AnyObject>
  >
) =>
  authFn(
    wrapRoute(async (req: NextAuthRequest, ctx: IRouteContext) => {
      const userAuthenticatedRequest = tryGetUserAuthenticatedRequest(req);
      const clientTokenAuthenticatedRequest =
        await tryGetClientTokenAuthenticatedRequest(req);
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
    })
  );

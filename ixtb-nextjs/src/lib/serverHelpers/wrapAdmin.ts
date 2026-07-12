import assert from "assert";
import { OwnServerError } from "fimidx-core/common/error";
import { assertCheckIsAdminEmail } from "fimidx-core/serverHelpers/isAdmin";
import { AnyFn, AnyObject } from "softkave-js-utils";
import { wrapUserAuthenticated } from "./wrapAuthenticated.ts";
import { IRouteContext } from "./wrapRoute.ts";

export const wrapAdmin = (
  routeFn: AnyFn<[Request, IRouteContext], Promise<AnyObject | void>>,
) =>
  wrapUserAuthenticated((req, ctx, session) => {
    assert.ok(session, new OwnServerError("Unauthorized", 401));
    assert.ok(
      session.user?.email,
      new OwnServerError("User email is required", 401),
    );
    assertCheckIsAdminEmail(session.user.email);
    return routeFn(req, ctx);
  });

import {
  getMonitorsSchema,
  IGetMonitorsEndpointResponse,
  kFimidxPermissions,
  kId0,
} from "fimidx-core/definitions/index";
import {
  getCallbacks,
  getMonitorCallbackIdempotencyKey,
  getMonitors,
} from "fimidx-core/serverHelpers/index";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetMonitorsInput } from "../../utils/sanitizeKId0";

export type IMonitorWithCallbackStatus =
  IGetMonitorsEndpointResponse["monitors"][number] & {
    callbackLastErrorAt?: Date | string | number | null;
  };

export const getMonitorsEndpoint: NextMaybeAuthenticatedEndpointFn<
  IGetMonitorsEndpointResponse & { monitors: IMonitorWithCallbackStatus[] }
> = async (params) => {
  const {
    req,
    session: { clientToken, userId },
  } = params;

  const input = getMonitorsSchema.parse(await req.json());
  sanitizeGetMonitorsInput(input);
  const projectId = input.query.projectId;

  await checkPermissionForClientTokenOrUser({
    userId,
    clientToken,
    projectId,
    action: kFimidxPermissions.monitor.read,
  });

  const { monitors, page, limit, hasMore } = await getMonitors({
    args: input,
  });

  const enriched: IMonitorWithCallbackStatus[] = await Promise.all(
    monitors.map(async (monitor) => {
      try {
        const { callbacks } = await getCallbacks({
          args: {
            query: {
              projectId: kId0,
              idempotencyKey: {
                eq: getMonitorCallbackIdempotencyKey(monitor.id),
              },
            },
            limit: 1,
          },
        });
        const cb = callbacks[0];
        return {
          ...monitor,
          callbackLastErrorAt: cb?.lastErrorAt ?? null,
        };
      } catch {
        return { ...monitor, callbackLastErrorAt: null };
      }
    })
  );

  return {
    monitors: enriched,
    page,
    limit,
    hasMore,
  };
};

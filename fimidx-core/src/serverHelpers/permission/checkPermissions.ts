import { first, isString } from "lodash-es";
import { jsRecordToObjRecordQueryList } from "../../common/obj.js";
import type {
  CheckPermissionsEndpointArgs,
  CheckPermissionsEndpointResponse,
} from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { getPermissions } from "./getPermissions.js";

export async function checkPermissions(params: {
  args: CheckPermissionsEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, storage } = params;
  const { projectId, items } = args;

  const permissions = await Promise.all(
    items.map(async (item) => {
      const { permissions } = await getPermissions({
        args: {
          query: {
            projectId,
            entity: isString(item.entity)
              ? { eq: item.entity }
              : jsRecordToObjRecordQueryList(item.entity),
            action: isString(item.action)
              ? { eq: item.action }
              : jsRecordToObjRecordQueryList(item.action),
            target: isString(item.target)
              ? { eq: item.target }
              : jsRecordToObjRecordQueryList(item.target),
          },
          limit: 1,
        },
        storage,
      });

      return first(permissions);
    })
  );

  const response: CheckPermissionsEndpointResponse = {
    results: permissions.map((permission) => ({
      isPermitted: !!permission && permission.granted !== false,
    })),
  };

  return response;
}

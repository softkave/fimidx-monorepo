import { first, isString } from "lodash-es";
import { jsRecordToObjRecordQueryList } from "../../common/obj.js";
import type {
  CheckMemberPermissionsEndpointArgs,
  CheckMemberPermissionsEndpointResponse,
} from "../../definitions/member.js";
import type { IObjStorage } from "../../storage/types.js";
import { getPermissions } from "../permission/getPermissions.js";
import { getFimidxManagedMemberPermission } from "./addMemberPermissions.js";

export async function checkMemberPermissions(params: {
  args: CheckMemberPermissionsEndpointArgs;
  storage?: IObjStorage;
}) {
  const { args, storage } = params;
  const { query, items } = args;
  const { projectId, groupId, id: memberId } = query;

  const permissions = await Promise.all(
    items.map(async (item) => {
      // Entity is memberId; build full atom from item (action + target only)
      const permission = {
        entity: memberId,
        action: item.action,
        target: item.target,
        granted: item.granted,
      };
      const managedPermission = getFimidxManagedMemberPermission({
        permission,
        memberId,
        groupId,
      });

      const { permissions } = await getPermissions({
        args: {
          query: {
            projectId,
            groupId: groupId ? { eq: groupId } : undefined,
            entity: isString(managedPermission.entity)
              ? { eq: managedPermission.entity }
              : jsRecordToObjRecordQueryList(managedPermission.entity),
            action: isString(managedPermission.action)
              ? { eq: managedPermission.action }
              : jsRecordToObjRecordQueryList(managedPermission.action),
            target: isString(managedPermission.target)
              ? { eq: managedPermission.target }
              : jsRecordToObjRecordQueryList(managedPermission.target),
          },
          limit: 1,
        },
        storage,
      });

      return first(permissions);
    })
  );

  const response: CheckMemberPermissionsEndpointResponse = {
    results: permissions.map((permission) => ({
      isPermitted: !!permission && permission.granted !== false,
    })),
  };

  return response;
}

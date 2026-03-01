import { first, isString } from "lodash-es";
import { jsRecordToObjPartQueryList } from "../../common/obj.js";
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
  const { projectId, memberId, groupId, items } = args;

  const permissions = await Promise.all(
    items.map(async (item) => {
      // Transform the permission to the managed format that's stored in the database
      const managedPermission = getFimidxManagedMemberPermission({
        permission: item,
        memberId,
        groupId,
      });

      const { permissions } = await getPermissions({
        args: {
          query: {
            projectId,
            entity: isString(managedPermission.entity)
              ? { eq: managedPermission.entity }
              : jsRecordToObjPartQueryList(managedPermission.entity),
            action: isString(managedPermission.action)
              ? { eq: managedPermission.action }
              : jsRecordToObjPartQueryList(managedPermission.action),
            target: isString(managedPermission.target)
              ? { eq: managedPermission.target }
              : jsRecordToObjPartQueryList(managedPermission.target),
            meta: [
              {
                op: "eq",
                field: "__fimidx_managed_memberId",
                value: memberId,
              },
              {
                op: "eq",
                field: "__fimidx_managed_groupId",
                value: groupId,
              },
            ],
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
      hasPermission: !!permission,
    })),
  };

  return response;
}

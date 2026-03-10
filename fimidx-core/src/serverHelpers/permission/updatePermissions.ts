import { isString } from "lodash-es";
import { jsRecordToObjRecordQueryList } from "../../common/obj.js";
import type {
  GetPermissionsEndpointArgs,
  UpdatePermissionsEndpointArgs,
} from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { addPermissions } from "./addPermissions.js";
import { deletePermissions } from "./deletePermissions.js";

export async function updatePermissions(params: {
  args: UpdatePermissionsEndpointArgs;
  by: string;
  byType: string;
  /** Required when update.addPermissions is provided. */
  groupId?: string;
  storage?: IObjStorage;
}) {
  const { args, by, byType, groupId, storage } = params;
  const { query, update } = args;

  if (update.removeAllPermissions) {
    await deletePermissions({
      query,
      deleteMany: true,
      by,
      byType,
      storage,
    });
  }

  if (update.removePermissions?.length) {
    const queries: GetPermissionsEndpointArgs["query"][] =
      update.removePermissions.map((item) => ({
        ...query,
        entity: isString(item.entity)
          ? { eq: item.entity }
          : jsRecordToObjRecordQueryList(item.entity as Record<string, string>),
        action: isString(item.action)
          ? { eq: item.action }
          : jsRecordToObjRecordQueryList(item.action as Record<string, string>),
        target: isString(item.target)
          ? { eq: item.target }
          : jsRecordToObjRecordQueryList(item.target as Record<string, string>),
      }));
    await deletePermissions({
      queries,
      deleteMany: true,
      by,
      byType,
      storage,
    });
  }

  if (update.addPermissions?.length) {
    if (!groupId) {
      throw new Error("groupId is required when addPermissions is provided");
    }
    await addPermissions({
      args: {
        projectId: query.projectId,
        permissions: update.addPermissions,
      },
      groupId,
      by,
      byType,
      storage,
    });
  }
}

import { kObjTags } from "../../definitions/obj.js";
import type {
  DeletePermissionsEndpointArgs,
  GetPermissionsEndpointArgs,
} from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { deleteManyObjs } from "../obj/deleteObjs.js";
import { getPermissionsObjQuery } from "./getPermissions.js";

export async function deletePermissions(
  params: DeletePermissionsEndpointArgs & {
    by: string;
    byType: string;
    storage?: IObjStorage;
  }
) {
  const { deleteMany, by, byType, storage, query, queries } = params;

  const toRun: GetPermissionsEndpointArgs["query"][] = queries?.length
    ? queries
    : query
      ? [query]
      : [];

  if (toRun.length === 0) return;

  if (toRun.length === 1) {
    const objQuery = getPermissionsObjQuery({ args: { query: toRun[0] } });
    await deleteManyObjs({
      objQuery,
      tag: kObjTags.permission,
      deletedBy: by,
      deletedByType: byType,
      deleteMany,
      storage,
    });
    return;
  }

  const orQueries = toRun.map((q) =>
    getPermissionsObjQuery({ args: { query: q } })
  );
  await deleteManyObjs({
    objQuery: orQueries[0],
    tag: kObjTags.permission,
    deletedBy: by,
    deletedByType: byType,
    deleteMany,
    storage,
    orQueries,
  });
}

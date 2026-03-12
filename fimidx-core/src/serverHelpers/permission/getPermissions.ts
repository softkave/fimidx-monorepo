import { isObjRecordQueryList } from "../../common/obj.js";
import {
  kObjTags,
  type IObjRecordQueryItem,
  type IObjQuery,
} from "../../definitions/obj.js";
import type { GetPermissionsEndpointArgs } from "../../definitions/permission.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import { objToPermission } from "./objToPermission.js";

export function getPermissionsObjQuery(params: {
  args: GetPermissionsEndpointArgs;
}) {
  const { args } = params;
  const {
    query: {
      projectId,
      id,
      entity,
      action,
      target,
      groupId,
      meta,
      createdAt,
      updatedAt,
      createdBy,
      updatedBy,
    },
  } = args;

  const entityRecordQuery = isObjRecordQueryList(entity)
    ? entity?.map(
        (part) =>
          ({
            op: part.op,
            field: `entity.${part.field}`,
            value: part.value,
          } as IObjRecordQueryItem)
      )
    : entity
    ? Object.entries(entity).map(([op, value]) => ({
        op: op as any,
        field: "entity",
        value,
      }))
    : undefined;
  const actionRecordQuery = isObjRecordQueryList(action)
    ? action?.map(
        (part) =>
          ({
            op: part.op,
            field: `action.${part.field}`,
            value: part.value,
          } as IObjRecordQueryItem)
      )
    : action
    ? Object.entries(action).map(([op, value]) => ({
        op: op as any,
        field: "action",
        value,
      }))
    : undefined;
  const targetRecordQuery = isObjRecordQueryList(target)
    ? target?.map(
        (part) =>
          ({
            op: part.op,
            field: `target.${part.field}`,
            value: part.value,
          } as IObjRecordQueryItem)
      )
    : target
    ? Object.entries(target).map(([op, value]) => ({
        op: op as any,
        field: "target",
        value,
      }))
    : undefined;

  const metaPartQuery = meta?.map(
    (part) =>
      ({
        op: part.op,
        field: `meta.${part.field}`,
        value: part.value,
      } as IObjRecordQueryItem)
  );

  const filterArr: Array<IObjRecordQueryItem> = [
    ...(entityRecordQuery ?? []),
    ...(actionRecordQuery ?? []),
    ...(targetRecordQuery ?? []),
    ...(metaPartQuery ?? []),
  ];

  const objQuery: IObjQuery = {
    recordQuery: filterArr.length > 0 ? filterArr : undefined,
    metaQuery: {
      ...(projectId ? { projectId: { eq: projectId } } : {}),
      id,
      createdAt,
      updatedAt,
      createdBy,
      updatedBy,
      ...(groupId ? { groupId: typeof groupId === "object" ? groupId : { eq: groupId } } : {}),
    },
  };

  return objQuery;
}

export async function getPermissions(params: {
  args: GetPermissionsEndpointArgs;
  storage?: IObjStorage;
}) {
  const { args, storage } = params;
  const { page: inputPage, limit: inputLimit, sort } = args;

  // Convert 1-based pagination to 0-based for storage layer
  const pageNumber = inputPage ?? 1;
  const limitNumber = inputLimit ?? 100;
  const storagePage = pageNumber - 1; // Convert to 0-based

  // Transform sort fields to use objRecord prefix for permission fields
  const transformedSort = sort?.map((sortItem: any) => {
    if (
      ["entity", "action", "target", "description", "meta"].includes(
        sortItem.field
      )
    ) {
      return { ...sortItem, field: `objRecord.${sortItem.field}` };
    }
    return sortItem;
  });

  const objQuery = getPermissionsObjQuery({ args });
  const result = await getManyObjs({
    objQuery,
    tag: kObjTags.permission,
    limit: limitNumber,
    page: storagePage,
    sort: transformedSort,
    storage,
  });

  return {
    permissions: result.objs.map(objToPermission),
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
    hasMore: result.hasMore,
  };
}

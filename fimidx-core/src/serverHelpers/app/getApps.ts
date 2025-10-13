import assert from "assert";
import { first } from "lodash-es";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type { GetAppsEndpointArgs } from "../../definitions/app.js";
import {
  kObjTags,
  type IObjPartQueryItem,
  type IObjQuery,
} from "../../definitions/obj.js";
import { kId0 } from "../../definitions/system.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import { objToApp } from "./objToApp.js";

export function getAppsObjQuery(params: { args: GetAppsEndpointArgs }) {
  const { args } = params;
  const { query } = args;
  const {
    orgId: groupId,
    id,
    name,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
  } = query;

  const filterArr: Array<IObjPartQueryItem> = [];

  // Handle name filtering - name is stored in objRecord.name
  if (name) {
    // Convert name query to partQuery for the name field
    Object.entries(name).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "name",
          value,
        });
      }
    });
  }

  // Handle groupId filtering
  if (groupId) {
    filterArr.push({
      op: "eq",
      field: "orgId",
      value: groupId,
    });
  }

  const objQuery: IObjQuery = {
    appId: kId0,
    partQuery: filterArr.length > 0 ? { and: filterArr } : undefined,
    metaQuery: { id, createdAt, updatedAt, createdBy, updatedBy },
  };

  return objQuery;
}

export async function getApps(params: {
  args: GetAppsEndpointArgs;
  storage?: IObjStorage;
}) {
  const { args, storage } = params;
  const { page, limit, sort } = args;

  // Convert 1-based pagination to 0-based for storage layer
  const pageNumber = page ?? 1;
  const limitNumber = limit ?? 100;
  const storagePage = pageNumber - 1; // Convert to 0-based

  // Transform sort fields to use objRecord prefix for name field
  const transformedSort = sort?.map((sortItem: any) => {
    if (sortItem.field === "name") {
      return { ...sortItem, field: "objRecord.name" };
    }
    return sortItem;
  });

  const objQuery = getAppsObjQuery({ args });
  const result = await getManyObjs({
    objQuery,
    page: storagePage,
    limit: limitNumber,
    tag: kObjTags.app,
    sort: transformedSort,
    storage,
  });

  return {
    apps: result.objs.map(objToApp),
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
    hasMore: result.hasMore,
  };
}

export async function getAppById(params: {
  id: string;
  storage?: IObjStorage;
}) {
  const { id, storage } = params;

  if (id === kId0) {
    return null;
  }

  const objQuery: IObjQuery = {
    appId: kId0,
    metaQuery: {
      id: {
        eq: id,
      },
    },
  };

  const { objs } = await getManyObjs({
    objQuery,
    tag: kObjTags.app,
    limit: 1,
    storage,
  });

  const obj = first(objs);
  assert.ok(
    obj,
    new OwnServerError("App not found", kOwnServerErrorCodes.NotFound)
  );

  return objToApp(obj);
}

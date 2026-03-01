import type { GetMonitorsEndpointArgs } from "../../definitions/monitor.js";
import {
  kObjTags,
  type IObjPartQueryItem,
  type IObjQuery,
  type IObjSort,
} from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import { objToMonitor } from "./objToMonitor.js";

export function getMonitorsObjQuery(params: { args: GetMonitorsEndpointArgs }) {
  const { args } = params;
  const { query } = args;
  const {
    name,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    reportsTo,
    status,
    projectId,
    id,
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

  // Handle status filtering - status is stored in objRecord.status
  if (status) {
    Object.entries(status).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "status",
          value,
        });
      }
    });
  }

  // Handle reportsTo filtering - reportsTo is stored in objRecord.reportsTo
  if (reportsTo) {
    Object.entries(reportsTo).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "reportsTo.userId",
          value,
        });
      }
    });
  }

  const objQuery: IObjQuery = {
    projectId,
    partQuery: filterArr.length > 0 ? { and: filterArr } : undefined,
    metaQuery: { id, createdAt, updatedAt, createdBy, updatedBy },
  };

  return objQuery;
}

export async function getMonitors(params: {
  args: GetMonitorsEndpointArgs;
  storage?: IObjStorage;
}) {
  const { args, storage } = params;
  const { page: inputPage, limit: inputLimit, sort } = args;

  // Convert 1-based pagination to 0-based for storage layer
  const pageNumber = inputPage ?? 1;
  const limitNumber = inputLimit ?? 100;
  const storagePage = pageNumber - 1; // Convert to 0-based

  // Transform sort fields to use objRecord prefix for objRecord fields
  const transformedSort = sort?.map((sortItem: IObjSort) => {
    if (sortItem.field === "name" || sortItem.field === "status") {
      return { ...sortItem, field: `objRecord.${sortItem.field}` };
    }
    return sortItem;
  });

  const objQuery = getMonitorsObjQuery({ args });
  const result = await getManyObjs({
    objQuery,
    page: storagePage,
    limit: limitNumber,
    tag: kObjTags.monitor,
    sort: transformedSort,
    storage,
  });

  return {
    monitors: result.objs.map(objToMonitor),
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
    hasMore: result.hasMore,
  };
}

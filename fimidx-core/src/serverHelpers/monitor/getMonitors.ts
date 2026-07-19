import type {
  GetMonitorsEndpointArgs,
  IMonitor,
} from "../../definitions/monitor.js";
import {
  kObjTags,
  type IObjRecordQueryItem,
  type IObjQuery,
  type IObjSort,
} from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import {
  kObjTopLevelFields,
  resourceFieldsToMongoProjection,
  type ProjectedResource,
} from "../obj/projectedResource.js";
import { objToMonitor } from "./objToMonitor.js";

export type ProjectedMonitor<
  P extends readonly (keyof IMonitor)[] | undefined,
> = ProjectedResource<IMonitor, P>;

export type GetMonitorsResult<
  P extends readonly (keyof IMonitor)[] | undefined = undefined,
> = {
  monitors: Array<ProjectedMonitor<P>>;
  page: number;
  limit: number;
  hasMore: boolean;
};

export function monitorFieldsToMongoProjection(
  fields: readonly (keyof IMonitor)[]
): Record<string, 0 | 1> {
  return resourceFieldsToMongoProjection(fields as readonly string[], {
    topLevelFields: kObjTopLevelFields,
  });
}

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

  const filterArr: Array<IObjRecordQueryItem> = [];

  // Handle name filtering - name is stored in objRecord.name
  if (name) {
    // Convert name query to recordQuery for the name field
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
    recordQuery: filterArr.length > 0 ? filterArr : undefined,
    metaQuery: {
      ...(projectId ? { projectId: { eq: projectId } } : {}),
      id,
      createdAt,
      updatedAt,
      createdBy,
      updatedBy,
    },
  };

  return objQuery;
}

export async function getMonitors(params: {
  args: GetMonitorsEndpointArgs;
  storage?: IObjStorage;
}): Promise<GetMonitorsResult<undefined>>;
export async function getMonitors<
  const P extends readonly (keyof IMonitor)[],
>(params: {
  args: GetMonitorsEndpointArgs;
  storage?: IObjStorage;
  projection: P;
}): Promise<GetMonitorsResult<P>>;
export async function getMonitors<
  const P extends readonly (keyof IMonitor)[] | undefined = undefined,
>(params: {
  args: GetMonitorsEndpointArgs;
  storage?: IObjStorage;
  projection?: P;
}): Promise<GetMonitorsResult<P>> {
  const { args, storage, projection } = params;
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
  const mongoProjection = projection
    ? monitorFieldsToMongoProjection(projection)
    : undefined;

  const result = await getManyObjs({
    objQuery,
    page: storagePage,
    limit: limitNumber,
    tag: kObjTags.monitor,
    sort: transformedSort,
    storage,
    projection: mongoProjection,
  });

  return {
    monitors: result.objs.map(objToMonitor) as Array<ProjectedMonitor<P>>,
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
    hasMore: result.hasMore,
  };
}

import type {
  GetLogsEndpointArgs,
  GetLogsEndpointResponse,
} from "../../definitions/log.js";
import { kObjTags, type IObjQuery } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import { objToLog } from "./objToLog.js";

export function getLogsObjQuery(params: { args: GetLogsEndpointArgs }) {
  const { args } = params;
  const { query } = args;
  const { projectId, logsQuery, metaQuery } = query;

  const objQuery: IObjQuery = {
    projectId,
    partQuery: logsQuery,
    metaQuery,
  };

  return objQuery;
}

export async function getLogs(params: {
  args: GetLogsEndpointArgs;
  storage?: IObjStorage;
}): Promise<GetLogsEndpointResponse> {
  const { args, storage } = params;
  const { page, limit, sort } = args;

  // Convert 1-based pagination to 0-based for storage layer
  const pageNumber = page ?? 1;
  const limitNumber = limit ?? 100;
  const storagePage = pageNumber - 1; // Convert to 0-based

  // Transform sort fields to use objRecord prefix for log fields
  const transformedSort = sort?.map((sortItem) => {
    // For log fields that are stored in objRecord, add the prefix
    if (
      sortItem.field === "timestamp" ||
      sortItem.field === "level" ||
      sortItem.field === "message"
    ) {
      return { ...sortItem, field: `objRecord.${sortItem.field}` };
    }
    return sortItem;
  });

  const objQuery = getLogsObjQuery({ args });
  const result = await getManyObjs({
    objQuery,
    page: storagePage,
    limit: limitNumber,
    tag: kObjTags.log,
    sort: transformedSort,
    storage,
  });

  return {
    logs: result.objs.map(objToLog),
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
    hasMore: result.hasMore,
  };
}

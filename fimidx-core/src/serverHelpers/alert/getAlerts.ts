import type { GetAlertsEndpointArgs } from "../../definitions/alert.js";
import {
  kObjTags,
  type IObjQuery,
  type IObjRecordQueryItem,
  type IObjSort,
} from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import { objToAlert } from "./objToAlert.js";

export function getAlertsObjQuery(params: { args: GetAlertsEndpointArgs }) {
  const { args } = params;
  const { query } = args;
  const {
    projectId,
    id,
    monitorId,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
  } = query;

  const filterArr: Array<IObjRecordQueryItem> = [];

  if (monitorId) {
    Object.entries(monitorId).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "monitorId",
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

export async function getAlerts(params: {
  args: GetAlertsEndpointArgs;
  storage?: IObjStorage;
}) {
  const { args, storage } = params;
  const { page: inputPage, limit: inputLimit, sort } = args;

  const pageNumber = inputPage ?? 1;
  const limitNumber = inputLimit ?? 100;
  const storagePage = pageNumber - 1;

  const transformedSort = sort?.map((sortItem: IObjSort) => {
    if (
      sortItem.field === "monitorId" ||
      sortItem.field === "monitorName" ||
      sortItem.field === "matchCount"
    ) {
      return { ...sortItem, field: `objRecord.${sortItem.field}` };
    }
    return sortItem;
  });

  const objQuery = getAlertsObjQuery({ args });
  const result = await getManyObjs({
    objQuery,
    page: storagePage,
    limit: limitNumber,
    tag: kObjTags.alert,
    sort: transformedSort,
    storage,
  });

  return {
    alerts: result.objs.map(objToAlert),
    page: pageNumber,
    limit: limitNumber,
    hasMore: result.hasMore,
  };
}

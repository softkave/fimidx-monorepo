import type { GetAlertsEndpointArgs, IAlert } from "../../definitions/alert.js";
import {
  kObjTags,
  type IObjQuery,
  type IObjRecordQueryItem,
  type IObjSort,
} from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import {
  kObjTopLevelFields,
  resourceFieldsToMongoProjection,
  type ProjectedResource,
} from "../obj/projectedResource.js";
import { objToAlert } from "./objToAlert.js";

export type ProjectedAlert<
  P extends readonly (keyof IAlert)[] | undefined,
> = ProjectedResource<IAlert, P>;

export type GetAlertsResult<
  P extends readonly (keyof IAlert)[] | undefined = undefined,
> = {
  alerts: Array<ProjectedAlert<P>>;
  page: number;
  limit: number;
  hasMore: boolean;
};

export function alertFieldsToMongoProjection(
  fields: readonly (keyof IAlert)[]
): Record<string, 0 | 1> {
  return resourceFieldsToMongoProjection(fields as readonly string[], {
    topLevelFields: kObjTopLevelFields,
  });
}

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
}): Promise<GetAlertsResult<undefined>>;
export async function getAlerts<
  const P extends readonly (keyof IAlert)[],
>(params: {
  args: GetAlertsEndpointArgs;
  storage?: IObjStorage;
  projection: P;
}): Promise<GetAlertsResult<P>>;
export async function getAlerts<
  const P extends readonly (keyof IAlert)[] | undefined = undefined,
>(params: {
  args: GetAlertsEndpointArgs;
  storage?: IObjStorage;
  projection?: P;
}): Promise<GetAlertsResult<P>> {
  const { args, storage, projection } = params;
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
  const mongoProjection = projection
    ? alertFieldsToMongoProjection(projection)
    : undefined;

  const result = await getManyObjs({
    objQuery,
    page: storagePage,
    limit: limitNumber,
    tag: kObjTags.alert,
    sort: transformedSort,
    storage,
    projection: mongoProjection,
  });

  return {
    alerts: result.objs.map(objToAlert) as Array<ProjectedAlert<P>>,
    page: pageNumber,
    limit: limitNumber,
    hasMore: result.hasMore,
  };
}

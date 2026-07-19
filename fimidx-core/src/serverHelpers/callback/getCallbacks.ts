import type {
  GetCallbacksEndpointArgs,
  ICallback,
} from "../../definitions/callback.js";
import {
  kObjTags,
  type IObjRecordQueryItem,
  type IObjQuery,
} from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import {
  kObjTopLevelFields,
  resourceFieldsToMongoProjection,
  type ProjectedResource,
} from "../obj/projectedResource.js";
import { objToCallback } from "./objToCallback.js";

export type ProjectedCallback<
  P extends readonly (keyof ICallback)[] | undefined,
> = ProjectedResource<ICallback, P>;

export type GetCallbacksResult<
  P extends readonly (keyof ICallback)[] | undefined = undefined,
> = {
  callbacks: Array<ProjectedCallback<P>>;
  page: number;
  limit: number;
  hasMore: boolean;
};

/** Map callback field names to a Mongo projection (always includes `id`). */
export function callbackFieldsToMongoProjection(
  fields: readonly (keyof ICallback)[]
): Record<string, 0 | 1> {
  return resourceFieldsToMongoProjection(fields as readonly string[], {
    topLevelFields: kObjTopLevelFields,
  });
}

export function getCallbacksObjQuery(params: {
  args: GetCallbacksEndpointArgs;
}) {
  const { args } = params;
  const { query } = args;
  const {
    projectId,
    createdBy,
    updatedBy,
    idempotencyKey,
    intervalFrom,
    intervalMs,
    lastErrorAt,
    lastExecutedAt,
    lastSuccessAt,
    method,
    requestBody,
    requestHeaders,
    timeout,
    url,
    createdAt,
    id,
    updatedAt,
    name,
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

  // Handle idempotencyKey filtering
  if (idempotencyKey) {
    Object.entries(idempotencyKey).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "idempotencyKey",
          value,
        });
      }
    });
  }

  // Handle url filtering
  if (url) {
    Object.entries(url).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "url",
          value,
        });
      }
    });
  }

  // Handle method filtering
  if (method) {
    Object.entries(method).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "method",
          value,
        });
      }
    });
  }

  // Handle timeout filtering
  if (timeout) {
    Object.entries(timeout).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "timeout",
          value,
        });
      }
    });
  }

  // Handle intervalFrom filtering
  if (intervalFrom) {
    Object.entries(intervalFrom).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "intervalFrom",
          value,
        });
      }
    });
  }

  // Handle intervalMs filtering
  if (intervalMs) {
    Object.entries(intervalMs).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "intervalMs",
          value,
        });
      }
    });
  }

  // Handle lastExecutedAt filtering
  if (lastExecutedAt) {
    Object.entries(lastExecutedAt).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "lastExecutedAt",
          value,
        });
      }
    });
  }

  // Handle lastSuccessAt filtering
  if (lastSuccessAt) {
    Object.entries(lastSuccessAt).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "lastSuccessAt",
          value,
        });
      }
    });
  }

  // Handle lastErrorAt filtering
  if (lastErrorAt) {
    Object.entries(lastErrorAt).forEach(([op, value]) => {
      if (value !== undefined) {
        filterArr.push({
          op: op as any,
          field: "lastErrorAt",
          value,
        });
      }
    });
  }

  // Handle requestBody field filtering
  const requestBodyPartQuery = requestBody?.map(
    (part) =>
      ({
        op: part.op,
        field: `requestBody.${part.field}`,
        value: part.value,
      }) as IObjRecordQueryItem
  );
  if (requestBodyPartQuery) {
    filterArr.push(...requestBodyPartQuery);
  }

  // Handle requestHeaders field filtering
  const requestHeadersPartQuery = requestHeaders?.map(
    (part) =>
      ({
        op: part.op,
        field: `requestHeaders.${part.field}`,
        value: part.value,
      }) as IObjRecordQueryItem
  );
  if (requestHeadersPartQuery) {
    filterArr.push(...requestHeadersPartQuery);
  }

  const objQuery: IObjQuery = {
    and: [
      {
        recordQuery: filterArr.length > 0 ? filterArr : undefined,
        metaQuery: {
          ...(projectId ? { projectId: { eq: projectId } } : {}),
          id,
          createdAt,
          updatedAt,
          createdBy,
          updatedBy,
        },
      },
    ],
  };

  return objQuery;
}

export async function getCallbacks(params: {
  args: GetCallbacksEndpointArgs;
  storage?: IObjStorage;
}): Promise<GetCallbacksResult<undefined>>;
export async function getCallbacks<
  const P extends readonly (keyof ICallback)[],
>(params: {
  args: GetCallbacksEndpointArgs;
  storage?: IObjStorage;
  projection: P;
}): Promise<GetCallbacksResult<P>>;
export async function getCallbacks<
  const P extends readonly (keyof ICallback)[] | undefined = undefined,
>(params: {
  args: GetCallbacksEndpointArgs;
  storage?: IObjStorage;
  projection?: P;
}): Promise<GetCallbacksResult<P>> {
  const { args, storage, projection } = params;
  const { page: inputPage, limit: inputLimit, sort } = args;

  // Convert 1-based pagination to 0-based for storage layer
  const pageNumber = inputPage ?? 1;
  const limitNumber = inputLimit ?? 100;
  const storagePage = pageNumber - 1; // Convert to 0-based

  // Transform sort fields to use objRecord prefix for name field
  const transformedSort = sort?.map((sortItem) => {
    if (sortItem.field === "name") {
      return { ...sortItem, field: "objRecord.name" };
    }
    return sortItem;
  });

  const objQuery = getCallbacksObjQuery({ args });
  const mongoProjection = projection
    ? callbackFieldsToMongoProjection(projection)
    : undefined;

  const result = await getManyObjs({
    objQuery,
    page: storagePage,
    limit: limitNumber,
    tag: kObjTags.callback,
    sort: transformedSort,
    storage,
    projection: mongoProjection,
  });

  const callbacks = result.objs.map(objToCallback) as Array<
    ProjectedCallback<P>
  >;

  return {
    callbacks,
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
    hasMore: result.hasMore,
  };
}

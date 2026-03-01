import type { GetGroupsEndpointArgs } from "../../definitions/group.js";
import {
  kObjTags,
  type IObjPartQueryItem,
  type IObjQuery,
} from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import { objToGroup } from "./objToGroup.js";

export function getGroupsObjQuery(params: { args: GetGroupsEndpointArgs }) {
  const { args } = params;
  const { query } = args;
  const {
    name,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    meta,
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

  // Handle meta field filtering
  const metaPartQuery = meta?.map((part) => {
    let value = part.value;
    // Only convert to number if value is a string and not a duration object
    const isConvertibleString =
      typeof value === "string" && !isNaN(Number(value)) && value.trim() !== "";
    if (
      ["gt", "lt", "gte", "lte", "between"].includes(part.op) &&
      isConvertibleString
    ) {
      value = Number(value);
    }
    if ((part.op === "in" || part.op === "not_in") && Array.isArray(value)) {
      value = value
        .map((v) =>
          typeof v === "string" && !isNaN(Number(v)) && v.trim() !== ""
            ? Number(v)
            : v
        )
        .filter((v) => typeof v === "string" || typeof v === "number");
    }
    if (part.op === "between" && Array.isArray(value)) {
      value = value
        .map((v) =>
          typeof v === "string" && !isNaN(Number(v)) && v.trim() !== ""
            ? Number(v)
            : v
        )
        .filter((v) => typeof v === "string" || typeof v === "number");
    }
    return {
      op: part.op,
      field: `meta.${part.field}`,
      value,
    } as IObjPartQueryItem;
  });

  if (metaPartQuery) {
    filterArr.push(...metaPartQuery);
  }

  const objQuery: IObjQuery = {
    projectId,
    partQuery: filterArr.length > 0 ? { and: filterArr } : undefined,
    metaQuery: { id, createdAt, updatedAt, createdBy, updatedBy },
  };

  return objQuery;
}

export async function getGroups(params: {
  args: GetGroupsEndpointArgs;
  storage?: IObjStorage;
}) {
  const { args, storage } = params;
  const { page, limit, sort } = args;

  // Convert 1-based pagination to 0-based for storage layer
  const pageNumber = page ?? 1;
  const limitNumber = limit ?? 100;
  const storagePage = pageNumber - 1; // Convert to 0-based

  // Transform sort fields to use objRecord prefix for name field
  const transformedSort = sort?.map((sortItem) => {
    if (sortItem.field === "name") {
      return { ...sortItem, field: "objRecord.name" };
    }
    return sortItem;
  });

  const objQuery = getGroupsObjQuery({ args });
  console.log("objQuery groups");
  console.dir(objQuery, { depth: null });
  const result = await getManyObjs({
    objQuery,
    page: storagePage,
    limit: limitNumber,
    tag: kObjTags.group,
    sort: transformedSort,
    storage,
  });

  console.log("result groups", result);

  return {
    groups: result.objs.map(objToGroup),
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
    hasMore: result.hasMore,
  };
}

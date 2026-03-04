import assert from "assert";
import { first } from "lodash-es";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import {
  kObjTags,
  type IObjPartQueryItem,
  type IObjQuery,
} from "../../definitions/obj.js";
import type {
  GetProjectsEndpointArgs,
  IProject,
} from "../../definitions/project.js";
import { kId0 } from "../../definitions/system.js";
import type { IObjStorage } from "../../storage/types.js";
import { getManyObjs } from "../obj/getObjs.js";
import { objToProject } from "./objToProject.js";

export function getProjectsObjQuery(params: { args: GetProjectsEndpointArgs }) {
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

  // Handle orgId filtering (required)
  filterArr.push({
    op: "eq",
    field: "orgId",
    value: groupId,
  });

  const objQuery: IObjQuery = {
    projectId: kId0,
    partQuery: filterArr.length > 0 ? { and: filterArr } : undefined,
    metaQuery: { id, createdAt, updatedAt, createdBy, updatedBy },
  };

  return objQuery;
}

export async function getProjects(params: {
  args: GetProjectsEndpointArgs;
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

  const objQuery = getProjectsObjQuery({ args });
  const result = await getManyObjs({
    objQuery,
    page: storagePage,
    limit: limitNumber,
    tag: kObjTags.project,
    sort: transformedSort,
    storage,
  });

  return {
    projects: result.objs.map(objToProject),
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
    hasMore: result.hasMore,
  };
}

export async function getProjectById(params: {
  id: string;
  storage?: IObjStorage;
}) {
  const { id, storage } = params;

  if (id === kId0) {
    return null;
  }

  const objQuery: IObjQuery = {
    projectId: kId0,
    metaQuery: {
      id: {
        eq: id,
      },
    },
  };

  const { objs } = await getManyObjs({
    objQuery,
    tag: kObjTags.project,
    limit: 1,
    storage,
  });

  const obj = first(objs);
  assert.ok(
    obj,
    new OwnServerError("Project not found", kOwnServerErrorCodes.NotFound)
  );

  return objToProject(obj);
}

/** Internal: fetch projects by id list (no orgId required). Used when project
 * IDs are already known. */
export async function getProjectsByIds(params: {
  ids: string[];
  storage?: IObjStorage;
}): Promise<IProject[]> {
  const { ids, storage } = params;
  const validIds = ids.filter((id) => id !== kId0);
  if (validIds.length === 0) {
    return [];
  }
  const objQuery: IObjQuery = {
    projectId: kId0,
    metaQuery: {
      id: { in: validIds },
    },
  };
  const { objs } = await getManyObjs({
    objQuery,
    tag: kObjTags.project,
    limit: validIds.length,
    storage,
  });
  return objs.map(objToProject);
}

import type { IObjField, IObjQuery } from "../../definitions/obj.js";
import { getProjectIdFromObjQuery, isObjQueryLeaf } from "../../definitions/obj.js";
import { createStorage, getDefaultStorageType } from "../../storage/config.js";
import type { IObjStorage } from "../../storage/types.js";
import { getObjFields } from "./getObjFields.js";

export async function countObjs(params: {
  objQuery: IObjQuery;
  tag: string;
  date?: Date;
  storage?: IObjStorage;
  storageType?: "mongo" | "postgres";
}): Promise<{ count: number }> {
  const {
    objQuery,
    tag,
    date,
    storageType = getDefaultStorageType(),
    storage = createStorage({ type: storageType }),
  } = params;

  let fields: IObjField[] = [];
  const projectId = getProjectIdFromObjQuery(objQuery);
  if (projectId) {
    const fieldsResult = await getObjFields({
      projectId,
      tag,
      limit: 1000,
    });
    fields = fieldsResult.fields.map((field) => ({
      ...field,
      type: field.type as any,
    }));
  }

  const fieldsMap = new Map(fields.map((f) => [f.path, f]));

  const getIncludeDeletedFromObjQuery = (query: IObjQuery): boolean => {
    if (isObjQueryLeaf(query)) {
      return query.metaQuery?.deletedAt === null;
    }
    const logical = query as { and?: IObjQuery[]; or?: IObjQuery[] };
    return (
      (logical.and?.some(getIncludeDeletedFromObjQuery) ?? false) ||
      (logical.or?.some(getIncludeDeletedFromObjQuery) ?? false)
    );
  };

  const includeDeleted = getIncludeDeletedFromObjQuery(objQuery);

  return storage.count({
    query: objQuery,
    tag,
    date,
    fields: fieldsMap,
    includeDeleted,
  });
}

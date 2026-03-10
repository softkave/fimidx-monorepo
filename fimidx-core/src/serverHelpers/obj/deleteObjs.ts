import { fimidxLogger } from "../../common/logger/fimidx-logger.js";
import type { IObjField, IObjQuery } from "../../definitions/obj.js";
import { getProjectIdFromMetaQuery } from "../../definitions/obj.js";
import { createStorage, getDefaultStorageType } from "../../storage/config.js";
import type { IObjStorage } from "../../storage/types.js";
import { getObjFields } from "./getObjFields.js";

export async function deleteManyObjs(params: {
  objQuery: IObjQuery;
  tag: string;
  date?: Date;
  deletedBy: string;
  deletedByType: string;
  deleteMany?: boolean;
  storageType?: "mongo" | "postgres";
  storage?: IObjStorage;
  /** When set, delete objs matching any of these queries (OR). objQuery is
   * ignored for the filter. */
  orQueries?: IObjQuery[];
}) {
  const {
    objQuery,
    tag,
    date = new Date(),
    deletedBy,
    deletedByType,
    deleteMany = false,
    storageType = getDefaultStorageType(),
    storage = createStorage({ type: storageType }),
    orQueries,
  } = params;

  // Fetch fields for query generation (use first query's projectId when using orQueries)
  let fields: IObjField[] = [];
  const queryForFields = orQueries?.length ? orQueries[0] : objQuery;
  const projectId = getProjectIdFromMetaQuery(queryForFields.metaQuery);
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

  const result = await storage.bulkDelete({
    query: objQuery,
    tag,
    date,
    deletedBy,
    deletedByType,
    deleteMany,
    batchSize: 1000,
    hardDelete: false,
    fields: fieldsMap,
    ...(orQueries?.length ? { orQueries } : {}),
  });

  return result;
}

export async function cleanupDeletedObjs(params?: {
  storageType?: "mongo" | "postgres";
  storage?: IObjStorage;
}) {
  const {
    storageType = getDefaultStorageType(),
    storage = createStorage({ type: storageType }),
  } = params ?? {};

  // Use the new cleanupDeletedObjs method from the storage abstraction
  const result = await storage.cleanupDeletedObjs({
    batchSize: 1000,
    onProgress: (processed) => {
      fimidxLogger.log(`Cleaned up ${processed} deleted objects`);
    },
  });

  return result;
}

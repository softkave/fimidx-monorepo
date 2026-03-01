import { fimidxLogger } from "../../common/logger/fimidx-logger.js";
import type { IObjField, IObjQuery } from "../../definitions/obj.js";
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
  } = params;

  // Fetch fields for query generation
  let fields: IObjField[] = [];

  if (objQuery.projectId) {
    // Fetch fields
    const fieldsResult = await getObjFields({
      projectId: objQuery.projectId,
      tag,
      limit: 1000, // Fetch all fields for this project/tag combination
    });
    fields = fieldsResult.fields.map((field) => ({
      ...field,
      type: field.type as any, // Cast to fix type issue
    }));
  }

  // Convert to Maps for O(1) lookup
  const fieldsMap = new Map(fields.map((f) => [f.path, f]));

  // Use the new bulkDelete method from the storage abstraction
  const result = await storage.bulkDelete({
    query: objQuery,
    tag,
    date,
    deletedBy,
    deletedByType,
    deleteMany,
    batchSize: 1000,
    hardDelete: false, // Always soft delete for this function
    fields: fieldsMap,
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

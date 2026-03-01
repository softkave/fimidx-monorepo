import type {
  ISetManyObjsEndpointArgs,
  ISetManyObjsEndpointResponse,
} from "../../definitions/obj.js";
import { createStorage, getDefaultStorageType } from "../../storage/config.js";
import type { IObjStorage } from "../../storage/types.js";

export async function setManyObjs(params: {
  tag: string;
  input: ISetManyObjsEndpointArgs;
  by: string;
  byType: string;
  groupId: string;
  storageType?: "mongo" | "postgres";
  storage?: IObjStorage;
}): Promise<ISetManyObjsEndpointResponse> {
  const {
    tag,
    input,
    by,
    byType,
    groupId,
    storageType = getDefaultStorageType(),
    storage = createStorage({ type: storageType }),
  } = params;

  // Use the new bulkUpsert method from the storage abstraction
  const result = await storage.bulkUpsert({
    items: input.items,
    conflictOnKeys: input.conflictOnKeys || [],
    onConflict: input.onConflict || "replace",
    tag,
    projectId: input.projectId,
    groupId,
    createdBy: by,
    createdByType: byType,
    shouldIndex: input.shouldIndex ?? true,
    fieldsToIndex: input.fieldsToIndex
      ? Array.from(new Set(input.fieldsToIndex))
      : undefined,
    batchSize: 20, // Conflict detection batch size
  });

  return {
    newObjs: result.newObjs,
    updatedObjs: result.updatedObjs,
    ignoredItems: result.ignoredItems,
    failedItems: result.failedItems,
  };
}

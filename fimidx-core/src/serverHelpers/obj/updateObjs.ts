import { type AnyObject } from "softkave-js-utils";
import type {
  IGranularUpdate,
  IObjField,
  IObjQuery,
  OnConflict,
} from "../../definitions/obj.js";
import { getProjectIdFromObjQuery } from "../../definitions/obj.js";
import { createStorage, getDefaultStorageType } from "../../storage/config.js";
import type { IObjStorage } from "../../storage/types.js";
import { getObjFields } from "./getObjFields.js";

export function splitMetaUpdate(
  update: Record<string, any>,
  metaUpdateWay: OnConflict = "shallowMerge"
): IGranularUpdate[] {
  const { meta, ...rest } = update;
  const updates: IGranularUpdate[] = [];

  if (Object.keys(rest).length > 0) {
    updates.push({ value: rest });
  }

  if (meta !== undefined) {
    updates.push({ key: "meta", value: meta, updateWay: metaUpdateWay });
  }

  return updates.length > 0 ? updates : [{ value: update }];
}

export async function updateManyObjs(params: {
  objQuery: IObjQuery;
  tag: string;
  update?: AnyObject;
  updates?: IGranularUpdate[];
  by: string;
  byType: string;
  updateWay?: OnConflict;
  count?: number;
  shouldIndex?: boolean;
  fieldsToIndex?: string[];
  storageType?: "mongo" | "postgres";
  storage?: IObjStorage;
}) {
  const {
    objQuery,
    tag,
    update,
    updates,
    count,
    by,
    byType,
    updateWay = "shallowMerge",
    shouldIndex = true,
    fieldsToIndex,
    storageType = getDefaultStorageType(),
    storage = createStorage({ type: storageType }),
  } = params;

  // Fetch fields for query generation
  let fields: IObjField[] = [];

  const projectId = getProjectIdFromObjQuery(objQuery);
  if (projectId) {
    // Fetch fields
    const fieldsResult = await getObjFields({
      projectId,
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

  const result = await storage.bulkUpdate({
    query: objQuery,
    tag,
    update,
    updates,
    by,
    byType,
    updateWay,
    count,
    shouldIndex,
    fieldsToIndex,
    batchSize: 1000,
    fields: fieldsMap,
  });

  return result;
}

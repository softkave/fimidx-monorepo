import { mergeObjects, type AnyObject } from "softkave-js-utils";
import type {
  IInputObjRecord,
  IObj,
  IObjField,
  IObjQuery,
  OnConflict,
} from "../../definitions/obj.js";
import { getProjectIdFromObjQuery } from "../../definitions/obj.js";
import { createStorage, getDefaultStorageType } from "../../storage/config.js";
import type { IObjStorage } from "../../storage/types.js";
import { getObjFields } from "./getObjFields.js";

export function getUpdateObj(params: {
  obj: IObj;
  item: IInputObjRecord;
  date: Date;
  by: string;
  byType: string;
  updateWay: OnConflict;
}) {
  const { obj, date, by, byType, updateWay, item } = params;
  return {
    id: obj.id,
    obj: {
      ...obj,
      updatedAt: date,
      updatedBy: by,
      updatedByType: byType,
      objRecord:
        updateWay === "replace"
          ? item
          : updateWay === "merge"
          ? { ...obj.objRecord, ...item }
          : updateWay === "mergeButReplaceArrays"
          ? mergeObjects(obj.objRecord, item, {
              arrayUpdateStrategy: "replace",
            })
          : updateWay === "mergeButConcatArrays"
          ? mergeObjects(obj.objRecord, item, {
              arrayUpdateStrategy: "concat",
            })
          : updateWay === "mergeButKeepArrays"
          ? mergeObjects(obj.objRecord, item, {
              arrayUpdateStrategy: "retain",
            })
          : obj.objRecord,
    },
  };
}

export async function updateManyObjs(params: {
  objQuery: IObjQuery;
  tag: string;
  update: AnyObject;
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
    count,
    by,
    byType,
    updateWay = "mergeButReplaceArrays",
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

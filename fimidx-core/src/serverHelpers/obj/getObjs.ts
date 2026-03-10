import type {
  INumberMetaQuery,
  IObjField,
  IObjRecordQueryList,
  IObjQuery,
  IObjSortList,
  IStringMetaQuery,
} from "../../definitions/obj.js";
import { getProjectIdFromMetaQuery } from "../../definitions/obj.js";
import { createStorage, getDefaultStorageType } from "../../storage/config.js";
import type { IObjStorage } from "../../storage/types.js";
import { getObjFields } from "./getObjFields.js";

export function metaQueryToRecordQueryList(params: {
  metaQuery: Record<string, IStringMetaQuery | INumberMetaQuery>;
  prefix?: string;
}): IObjRecordQueryList | undefined {
  const { metaQuery, prefix } = params;
  const recordQuery: IObjRecordQueryList = [];
  Object.entries(metaQuery).forEach(([key, value]) => {
    Object.keys(value).forEach((op) => {
      const opValue = value[op as keyof typeof value];
      if (opValue === undefined || opValue === null) {
        return;
      }

      const field = prefix ? `${prefix}.${key}` : key;

      switch (op) {
        case "eq":
          recordQuery.push({
            op: "eq",
            field,
            value: opValue as string | number,
          });
          break;
        case "neq":
          recordQuery.push({
            op: "neq",
            field,
            value: opValue as string | number,
          });
          break;
        case "in":
          recordQuery.push({
            op: "in",
            field,
            value: opValue as string[] | number[],
          });
          break;
        case "not_in":
          recordQuery.push({
            op: "not_in",
            field,
            value: opValue as string[] | number[],
          });
          break;
        case "gt":
          recordQuery.push({
            op: "gt",
            field,
            value: opValue as string | number,
          });
          break;
        case "gte":
          recordQuery.push({
            op: "gte",
            field,
            value: opValue as string | number,
          });
          break;
        case "lt":
          recordQuery.push({
            op: "lt",
            field,
            value: opValue as string | number,
          });
          break;
        case "lte":
          recordQuery.push({
            op: "lte",
            field,
            value: opValue as string | number,
          });
          break;
        case "between":
          recordQuery.push({
            op: "between",
            field,
            value: opValue as [string | number, string | number],
          });
          break;
        default:
          throw new Error(`Invalid op: ${op}`);
      }
    });
  });

  return recordQuery.length ? recordQuery : undefined;
}

export async function getManyObjs(params: {
  objQuery: IObjQuery;
  page?: number;
  limit?: number;
  tag: string;
  sort?: IObjSortList;
  date?: Date;
  storage?: IObjStorage;
  storageType?: "mongo" | "postgres";
}) {
  const {
    objQuery,
    page,
    limit,
    tag,
    sort,
    date,
    storageType = getDefaultStorageType(),
    storage = createStorage({ type: storageType }),
  } = params;

  // Fetch fields for query generation
  let fields: IObjField[] = [];

  const projectId = getProjectIdFromMetaQuery(objQuery.metaQuery);
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

  // Determine if we should include deleted objects
  // If metaQuery.deletedAt is explicitly set to null, include deleted objects
  const includeDeleted = objQuery.metaQuery?.deletedAt === null;

  // Use the new read method from the storage abstraction
  const result = await storage.read({
    query: objQuery,
    tag,
    page,
    limit,
    sort,
    date,
    fields: fieldsMap,
    includeDeleted,
  });

  return result;
}

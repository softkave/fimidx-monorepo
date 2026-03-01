import type {
  INumberMetaQuery,
  IObjField,
  IObjPartQueryList,
  IObjQuery,
  IObjSortList,
  IStringMetaQuery,
} from "../../definitions/obj.js";
import { createStorage, getDefaultStorageType } from "../../storage/config.js";
import type { IObjStorage } from "../../storage/types.js";
import { getObjFields } from "./getObjFields.js";

export function metaQueryToPartQueryList(params: {
  metaQuery: Record<string, IStringMetaQuery | INumberMetaQuery>;
  prefix?: string;
}): IObjPartQueryList | undefined {
  const { metaQuery, prefix } = params;
  const partQuery: IObjPartQueryList = [];
  Object.entries(metaQuery).forEach(([key, value]) => {
    Object.keys(value).forEach((op) => {
      const opValue = value[op as keyof typeof value];
      if (opValue === undefined || opValue === null) {
        return;
      }

      const field = prefix ? `${prefix}.${key}` : key;

      switch (op) {
        case "eq":
          partQuery.push({
            op: "eq",
            field,
            value: opValue as string | number,
          });
          break;
        case "neq":
          partQuery.push({
            op: "neq",
            field,
            value: opValue as string | number,
          });
          break;
        case "in":
          partQuery.push({
            op: "in",
            field,
            value: opValue as string[] | number[],
          });
          break;
        case "not_in":
          partQuery.push({
            op: "not_in",
            field,
            value: opValue as string[] | number[],
          });
          break;
        case "gt":
          partQuery.push({
            op: "gt",
            field,
            value: opValue as string | number,
          });
          break;
        case "gte":
          partQuery.push({
            op: "gte",
            field,
            value: opValue as string | number,
          });
          break;
        case "lt":
          partQuery.push({
            op: "lt",
            field,
            value: opValue as string | number,
          });
          break;
        case "lte":
          partQuery.push({
            op: "lte",
            field,
            value: opValue as string | number,
          });
          break;
        case "between":
          partQuery.push({
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

  return partQuery.length ? partQuery : undefined;
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

  // Determine if we should include deleted objects
  // If topLevelFields.deletedAt is explicitly set to null, include deleted objects
  const includeDeleted = objQuery.topLevelFields?.deletedAt === null;

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

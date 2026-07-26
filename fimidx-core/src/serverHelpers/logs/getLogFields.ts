import type { FieldType } from "../../common/indexer.js";
import type {
  GetLogFieldsEndpointArgs,
  GetLogFieldsEndpointResponse,
  ILogField,
} from "../../definitions/log.js";
import { kObjTags } from "../../definitions/obj.js";
import { getObjFields } from "../obj/getObjFields.js";

export async function getLogFields(params: {
  args: GetLogFieldsEndpointArgs;
}): Promise<GetLogFieldsEndpointResponse> {
  const { args } = params;
  const { query, page, limit } = args;
  const { projectId, path } = query;

  // Convert 1-based pagination to 0-based for storage layer
  const pageNumber = page ?? 1;
  const limitNumber = limit ?? 100;
  const storagePage = pageNumber - 1; // Convert to 0-based

  const {
    fields,
    hasMore,
  } = await getObjFields({
    projectId,
    page: storagePage,
    limit: limitNumber,
    tag: kObjTags.log,
    path,
  });

  return {
    fields: fields.map(
      (field): ILogField => ({
        projectId,
        groupId: field.groupId,
        id: field.id,
        path: field.path,
        type: field.type as FieldType,
        arrayTypes: field.arrayTypes,
        isArrayCompressed: field.isArrayCompressed,
        createdAt: field.createdAt,
        updatedAt: field.updatedAt,
      })
    ),
    page: pageNumber, // Return 1-based page number
    limit: limitNumber,
    hasMore,
  };
}

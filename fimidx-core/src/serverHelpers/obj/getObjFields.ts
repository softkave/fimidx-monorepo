import { getMongoConnection } from "../../db/fimidx.mongo.js";
import type {
  IGetObjFieldsEndpointResponse,
  IObjField,
  IStringMetaQuery,
} from "../../definitions/obj.js";

type ObjFieldDocument = IObjField & {
  _id?: unknown;
};

function applyStringMetaQueryToFilter(
  filter: Record<string, unknown>,
  key: string,
  query: IStringMetaQuery,
): void {
  const hasNeq = query.neq !== undefined;
  const hasIn = query.in !== undefined && query.in.length > 0;
  const hasNotIn = query.not_in !== undefined && query.not_in.length > 0;
  const hasLike = query.like !== undefined;
  const hasOnlyEq =
    query.eq !== undefined && !hasNeq && !hasIn && !hasNotIn && !hasLike;

  if (hasOnlyEq) {
    filter[key] = query.eq;
    return;
  }

  const fieldFilter: Record<string, unknown> = {};
  if (query.eq !== undefined) {
    fieldFilter.$eq = query.eq;
  }
  if (hasNeq) {
    fieldFilter.$ne = query.neq;
  }
  if (hasIn) {
    fieldFilter.$in = Array.from(new Set(query.in));
  }
  if (hasNotIn) {
    fieldFilter.$nin = Array.from(new Set(query.not_in));
  }
  if (hasLike) {
    // Match MongoQueryTransformer / record `like`: case-insensitive regex.
    fieldFilter.$regex = new RegExp(query.like!, "i");
  }

  if (Object.keys(fieldFilter).length > 0) {
    filter[key] = fieldFilter;
  }
}

async function getFromDb(params: {
  projectId: string;
  page: number;
  limit: number;
  tag: string;
  path?: IStringMetaQuery;
}) {
  const { projectId, page, limit, tag, path } = params;
  const { connection, promise } = getMongoConnection();
  await promise;
  const db = connection?.db;
  if (!db) {
    throw new Error("Mongo connection is not available");
  }

  const collection = db.collection<ObjFieldDocument>("objField");
  const filter: Record<string, unknown> = { projectId, tag };
  if (path) {
    applyStringMetaQueryToFilter(filter, "path", path);
  }

  return await collection
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(page * limit)
    .limit(limit)
    .toArray()
    .then((fields) =>
      fields.map(({ _id, ...field }) => ({
        ...field,
        id: field.id ?? String(_id),
      })),
    );
}

export async function getObjFields(params: {
  projectId: string;
  page?: number;
  limit?: number;
  tag: string;
  path?: IStringMetaQuery;
}): Promise<IGetObjFieldsEndpointResponse> {
  const { projectId, page = 0, limit = 100, tag, path } = params;
  const fields = await getFromDb({ projectId, page, limit, tag, path });
  let hasMore = false;
  if (fields.length === limit) {
    const nextPage = await getFromDb({
      projectId,
      page: page + 1,
      limit: 1,
      tag,
      path,
    });
    hasMore = nextPage.length > 0;
  }
  return {
    fields,
    page,
    limit,
    hasMore,
  };
}

import { getMongoConnection } from "../../db/fimidx.mongo.js";
import type {
  IGetObjFieldsEndpointResponse,
  IObjField,
} from "../../definitions/obj.js";

type ObjFieldDocument = IObjField & {
  _id?: unknown;
};

async function getFromDb(params: {
  projectId: string;
  page: number;
  limit: number;
  tag: string;
}) {
  const { projectId, page, limit, tag } = params;
  const { connection, promise } = getMongoConnection();
  await promise;
  const db = connection?.db;
  if (!db) {
    throw new Error("Mongo connection is not available");
  }

  const collection = db.collection<ObjFieldDocument>("objField");
  return await collection
    .find({ projectId, tag })
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
}): Promise<IGetObjFieldsEndpointResponse> {
  const { projectId, page = 0, limit = 100, tag } = params;
  const fields = await getFromDb({ projectId, page, limit, tag });
  let hasMore = false;
  if (fields.length === limit) {
    const nextPage = await getFromDb({
      projectId,
      page: page + 1,
      limit: 1,
      tag,
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

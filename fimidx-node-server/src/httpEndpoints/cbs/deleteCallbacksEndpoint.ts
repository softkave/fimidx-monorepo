import {Request, Response} from 'express';
import {
  deleteCallbacksSchema,
  ICallback,
} from 'fimidx-core/definitions/callback';
import {deleteCallbacks, getCallbacks} from 'fimidx-core/serverHelpers/index';
import {z} from 'zod';
import {removeCallbackFromStore} from '../../helpers/cb/removeCallbackFromStore.js';
import {IHttpOutgoingSuccessResponse} from '../../types/http.js';

const removeCallbackHttpEndpointSchema = deleteCallbacksSchema.extend({
  clientTokenId: z.string(),
});

/**
 * Soft-delete matching callbacks in Mongo and clear them from the in-memory
 * timer store. IDs are collected before delete so we do not rely on createdAt
 * windows (soft-deleted docs keep their original createdAt).
 */
async function deleteCallbacksEndpointImpl(params: {
  query: z.infer<typeof deleteCallbacksSchema>['query'];
  deleteMany?: boolean;
  clientTokenId: string;
}) {
  const idsToRemove: string[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await getCallbacks({
      args: {
        query: params.query,
        page,
        limit: 100,
      },
    });
    idsToRemove.push(...result.callbacks.map((c: ICallback) => c.id));
    hasMore = result.hasMore;
    page++;
  }

  if (idsToRemove.length > 0) {
    await deleteCallbacks({
      query: params.query,
      deleteMany: params.deleteMany,
      clientTokenId: params.clientTokenId,
    });
  }

  for (const id of idsToRemove) {
    removeCallbackFromStore(id);
  }

  return {deletedCount: idsToRemove.length};
}

export async function deleteCallbacksEndpoint(req: Request, res: Response) {
  const input = removeCallbackHttpEndpointSchema.parse(req.body);

  await deleteCallbacksEndpointImpl({
    query: input.query,
    deleteMany: input.deleteMany,
    clientTokenId: input.clientTokenId,
  });

  const response: IHttpOutgoingSuccessResponse = {
    type: 'success',
  };

  res.status(200).send(response);
}

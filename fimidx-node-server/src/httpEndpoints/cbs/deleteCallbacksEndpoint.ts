import {Request, Response} from 'express';
import {deleteCallbacksSchema} from 'fimidx-core/definitions/callback';
import {deleteCallbacks, getCallbacks} from 'fimidx-core/serverHelpers/index';
import {z} from 'zod';
import {removeCallbackFromStore} from '../../helpers/cb/removeCallbackFromStore.js';
import {IHttpOutgoingSuccessResponse} from '../../types/http.js';

const removeCallbackHttpEndpointSchema = deleteCallbacksSchema.extend({
  clientTokenId: z.string(),
});

const kDeleteBatchSize = 100;

/**
 * Soft-delete matching callbacks in Mongo and clear them from the in-memory
 * timer store. Processes in batches of {@link kDeleteBatchSize} so we never
 * hold the full match set in memory. When deleteMany is false, only the first
 * match is deleted and cleared from the store.
 */
async function deleteCallbacksEndpointImpl(params: {
  query: z.infer<typeof deleteCallbacksSchema>['query'];
  deleteMany?: boolean;
  clientTokenId: string;
}) {
  const deleteMany = params.deleteMany ?? false;
  let deletedCount = 0;

  // Always fetch page 1: soft-deletes fall out of the default query, so the
  // next batch surfaces as the new page 1.
  for (;;) {
    const result = await getCallbacks({
      args: {
        query: params.query,
        page: deleteMany ? 1 : undefined,
        limit: deleteMany ? kDeleteBatchSize : 1,
      },
      projection: ['id'],
    });

    if (result.callbacks.length === 0) {
      break;
    }

    const ids = result.callbacks.map(c => c.id);
    await deleteCallbacks({
      deleteMany: true,
      query: {
        id: {in: ids},
        projectId: params.query.projectId,
      },
      clientTokenId: params.clientTokenId,
    });

    for (const id of ids) {
      removeCallbackFromStore(id);
    }

    deletedCount += ids.length;
    if (!deleteMany) {
      break;
    }
  }

  return {deletedCount};
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

export {deleteCallbacksEndpointImpl};

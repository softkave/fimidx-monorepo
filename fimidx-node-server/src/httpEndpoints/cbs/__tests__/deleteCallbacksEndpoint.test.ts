import {getObjModel} from 'fimidx-core/db/fimidx.mongo';
import {kObjTags} from 'fimidx-core/definitions/obj';
import {addCallback, getCallbacks} from 'fimidx-core/serverHelpers/index';
import {afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {kCallbackStore} from '../../../ctx/callback.js';
import {addCallbackToStore} from '../../../helpers/cb/addCallbackToStore.js';
import {removeCallbackFromStore} from '../../../helpers/cb/removeCallbackFromStore.js';
import {deleteCallbacksEndpointImpl} from '../deleteCallbacksEndpoint.js';

const defaultProjectId = 'test-project-deleteCallbacksEndpoint';
const defaultGroupId = 'test-group-deleteCallbacksEndpoint';
const defaultBy = 'tester';
const defaultByType = 'user';
const defaultClientTokenId = 'test-client-token-deleteCallbacksEndpoint';

async function hardDeleteProjectCallbacks() {
  await getObjModel().deleteMany({
    tag: kObjTags.callback,
    projectId: defaultProjectId,
  });
}

describe('deleteCallbacksEndpointImpl store cleanup (real DB)', () => {
  beforeAll(async () => {
    // Ensure mongo model is ready via a no-op query
    await getObjModel().findOne({tag: kObjTags.callback}).lean();
  });

  beforeEach(async () => {
    for (const id of Object.keys(kCallbackStore)) {
      removeCallbackFromStore(id);
    }
    await hardDeleteProjectCallbacks();
  });

  afterEach(async () => {
    for (const id of Object.keys(kCallbackStore)) {
      removeCallbackFromStore(id);
    }
    await hardDeleteProjectCallbacks();
  });

  it('deleteMany false removes only the single deleted id from the store', async () => {
    const a = await addCallback({
      args: {
        projectId: defaultProjectId,
        url: 'https://example.com/a',
        method: 'POST',
        name: `cb-a-${Date.now()}`,
      },
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
    });
    const b = await addCallback({
      args: {
        projectId: defaultProjectId,
        url: 'https://example.com/b',
        method: 'POST',
        name: `cb-b-${Date.now()}`,
      },
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
    });

    addCallbackToStore({
      id: a.id,
      intervalFrom: new Date(Date.now() - 1000),
      intervalMs: 60_000,
    });
    addCallbackToStore({
      id: b.id,
      intervalFrom: new Date(Date.now() - 1000),
      intervalMs: 60_000,
    });

    const result = await deleteCallbacksEndpointImpl({
      query: {projectId: defaultProjectId},
      deleteMany: false,
      clientTokenId: defaultClientTokenId,
    });

    expect(result.deletedCount).toBe(1);

    const remaining = await getCallbacks({
      args: {query: {projectId: defaultProjectId}},
    });
    expect(remaining.callbacks).toHaveLength(1);

    const remainingId = remaining.callbacks[0].id;
    const deletedId = remainingId === a.id ? b.id : a.id;

    expect(kCallbackStore[deletedId]).toBeUndefined();
    expect(kCallbackStore[remainingId]).toBeDefined();
  });

  it('deleteMany true removes all listed ids from the store', async () => {
    const a = await addCallback({
      args: {
        projectId: defaultProjectId,
        url: 'https://example.com/a',
        method: 'POST',
        name: `cb-a-${Date.now()}`,
      },
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
    });
    const b = await addCallback({
      args: {
        projectId: defaultProjectId,
        url: 'https://example.com/b',
        method: 'POST',
        name: `cb-b-${Date.now()}`,
      },
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
    });

    addCallbackToStore({
      id: a.id,
      intervalFrom: new Date(Date.now() - 1000),
      intervalMs: 60_000,
    });
    addCallbackToStore({
      id: b.id,
      intervalFrom: new Date(Date.now() - 1000),
      intervalMs: 60_000,
    });

    const result = await deleteCallbacksEndpointImpl({
      query: {projectId: defaultProjectId},
      deleteMany: true,
      clientTokenId: defaultClientTokenId,
    });

    expect(result.deletedCount).toBe(2);
    expect(kCallbackStore[a.id]).toBeUndefined();
    expect(kCallbackStore[b.id]).toBeUndefined();

    const remaining = await getCallbacks({
      args: {query: {projectId: defaultProjectId}},
    });
    expect(remaining.callbacks).toHaveLength(0);
  });
});

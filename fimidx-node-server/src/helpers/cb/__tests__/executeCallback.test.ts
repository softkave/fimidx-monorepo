import {getObjModel} from 'fimidx-core/db/fimidx.mongo';
import {kObjTags} from 'fimidx-core/definitions/obj';
import {addCallback, deleteCallbacks} from 'fimidx-core/serverHelpers/index';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {kCallbackStore} from '../../../ctx/callback.js';
import {addCallbackToStore} from '../addCallbackToStore.js';
import {executeCallback} from '../executeCallback.js';
import {removeCallbackFromStore} from '../removeCallbackFromStore.js';

vi.mock('axios', () => ({
  default: vi.fn(async () => {
    throw new Error('axios should not be called for deleted callbacks');
  }),
}));

const defaultProjectId = 'test-project-executeCallback';
const defaultGroupId = 'test-group-executeCallback';
const defaultBy = 'tester';
const defaultByType = 'user';
const defaultClientTokenId = 'test-client-token-executeCallback';

async function hardDeleteProjectCallbacks() {
  await getObjModel().deleteMany({
    tag: kObjTags.callback,
    projectId: defaultProjectId,
  });
}

describe('executeCallback (real DB)', () => {
  beforeAll(async () => {
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

  it('no-ops and removes from store when callback is missing', async () => {
    const missingId = `missing-cb-${Date.now()}`;
    addCallbackToStore({
      id: missingId,
      intervalFrom: new Date(Date.now() - 1000),
      intervalMs: 60_000,
    });
    expect(kCallbackStore[missingId]).toBeDefined();

    await executeCallback({callbackId: missingId});

    expect(kCallbackStore[missingId]).toBeUndefined();
  });

  it('no-ops and removes from store when callback is soft-deleted', async () => {
    const {id} = await addCallback({
      args: {
        projectId: defaultProjectId,
        url: 'https://example.com/hook',
        method: 'POST',
        name: `cb-${Date.now()}`,
      },
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
    });

    addCallbackToStore({
      id,
      intervalFrom: new Date(Date.now() - 1000),
      intervalMs: 60_000,
    });

    await deleteCallbacks({
      query: {projectId: defaultProjectId, id: {eq: id}},
      deleteMany: false,
      clientTokenId: defaultClientTokenId,
    });

    await executeCallback({callbackId: id});

    expect(kCallbackStore[id]).toBeUndefined();
  });
});

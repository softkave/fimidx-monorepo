import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {kCallbackStore} from '../../../ctx/callback.js';
import {addCallbackToStore} from '../addCallbackToStore.js';
import {removeCallbackFromStore} from '../removeCallbackFromStore.js';

vi.mock('../executeCallback.js', () => ({
  executeCallback: vi.fn(async () => undefined),
}));

describe('addCallbackToStore deferred start', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    for (const id of Object.keys(kCallbackStore)) {
      removeCallbackFromStore(id);
    }
  });

  afterEach(() => {
    for (const id of Object.keys(kCallbackStore)) {
      removeCallbackFromStore(id);
    }
    vi.useRealTimers();
  });

  it('tracks deferredStartHandle and cancels it on remove before adder fires', () => {
    const id = 'cb-deferred-1';
    const intervalFrom = new Date(Date.now() + 60_000);

    addCallbackToStore({
      id,
      intervalFrom,
      intervalMs: 10_000,
    });

    expect(kCallbackStore[id]?.deferredStartHandle).toBeDefined();
    expect(kCallbackStore[id]?.intervalHandle).toBeUndefined();

    removeCallbackFromStore(id);
    expect(kCallbackStore[id]).toBeUndefined();

    vi.advanceTimersByTime(120_000);
    expect(kCallbackStore[id]).toBeUndefined();
  });

  it('starts interval immediately when intervalFrom is in the past', () => {
    const id = 'cb-immediate-1';
    addCallbackToStore({
      id,
      intervalFrom: new Date(Date.now() - 1000),
      intervalMs: 10_000,
    });

    expect(kCallbackStore[id]?.intervalHandle).toBeDefined();
    expect(kCallbackStore[id]?.deferredStartHandle).toBeUndefined();
  });
});

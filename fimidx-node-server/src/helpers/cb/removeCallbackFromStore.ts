import {kCallbackStore} from '../../ctx/callback.js';

export function removeCallbackFromStore(id: string) {
  const item = kCallbackStore[id];
  delete kCallbackStore[id];
  if (item) {
    if (item.timeoutHandle) {
      clearTimeout(item.timeoutHandle);
    }
    if (item.intervalHandle) {
      clearInterval(item.intervalHandle);
    }
    if (item.deferredStartHandle) {
      clearTimeout(item.deferredStartHandle);
    }
  }
}

import {Request, Response} from 'express';
import {cleanupDeletedObjs} from 'fimidx-core/serverHelpers/index';
import {AnyFn} from 'softkave-js-utils';
import {internalCallbackGuard} from '../../helpers/cb/internalCallbackGuard.js';
import {kInternalCallbackNames} from '../../helpers/setupCbs/constants.js';

export const cleanupDeletedObjsEndpoint: AnyFn<
  [req: Request, res: Response],
  Promise<void>
> = internalCallbackGuard(kInternalCallbackNames.cleanupObjs, async () => {
  await cleanupDeletedObjs();
});

import {Request, Response} from 'express';
import {kCallbackFimidxHeaders} from 'fimidx-core/definitions/callback';
import {indexObjs} from 'fimidx-core/serverHelpers/index';
import {isString} from 'lodash-es';
import {AnyFn} from 'softkave-js-utils';
import {internalCallbackGuard} from '../../helpers/cb/internalCallbackGuard.js';
import {kInternalCallbackNames} from '../../helpers/setupCbs/constants.js';

export const indexObjsEndpoint: AnyFn<
  [req: Request, res: Response],
  Promise<void>
> = internalCallbackGuard(
  kInternalCallbackNames.indexObjs,
  async (req: Request, res: Response) => {
    const lastSuccessAt = req.headers[kCallbackFimidxHeaders.lastSuccessAt];
    await indexObjs({
      lastSuccessAt: isString(lastSuccessAt) ? new Date(lastSuccessAt) : null,
    });
  },
);

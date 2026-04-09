import {Request, Response} from 'express';
import {runSymbolication} from 'fimidx-core/serverHelpers/index';
import {AnyFn} from 'softkave-js-utils';
import {internalCallbackGuard} from '../../helpers/cb/internalCallbackGuard.js';
import {kInternalCallbackNames} from '../../helpers/setupCbs/constants.js';

export const symbolicateLogsEndpoint: AnyFn<
  [req: Request, res: Response],
  Promise<void>
> = internalCallbackGuard(kInternalCallbackNames.symbolication, async () => {
  await runSymbolication();
});

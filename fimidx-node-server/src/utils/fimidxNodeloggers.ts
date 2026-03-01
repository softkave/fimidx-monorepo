import {
  fimidxConsoleLogger,
  fimidxLogger,
  fimidxNextAuthLogger,
} from 'fimidx-core/common/logger/index';
import {fimidxWinstonLogger} from 'fimidx-core/common/logger/winston-logger';

fimidxLogger.mergeMetadata({
  project: 'fimidx-node-server',
});

export const fimidxNodeConsoleLogger: typeof fimidxConsoleLogger =
  fimidxConsoleLogger;
export const fimidxNodeNextAuthLogger: typeof fimidxNextAuthLogger =
  fimidxNextAuthLogger;
export const fimidxNodeWinstonLogger: typeof fimidxWinstonLogger =
  fimidxWinstonLogger;

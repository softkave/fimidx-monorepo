import {
  fimidxConsoleLogger,
  fimidxLogger,
  fimidxNextAuthLogger,
} from "fimidx-core/common/logger/index";

fimidxLogger.mergeMetadata({
  project: "ixtb-nextjs",
});

export const ixtbConsoleLogger = fimidxConsoleLogger;
export const ixtbNextAuthLogger = fimidxNextAuthLogger;

import { FimidxWinstonTransport } from "fimidx-winston-transport";
import { compact } from "lodash-es";
import winston from "winston";
import { getClientConfig } from "../getClientConfig.js";
import { fimidxLogger } from "./fimidx-logger.js";

const { fimidxLoggerEnabled } = getClientConfig();

export const fimidxWinstonLogger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: compact([
    fimidxLoggerEnabled
      ? new FimidxWinstonTransport({
          fimidxLogger: fimidxLogger,
        })
      : null,
    new winston.transports.Console({
      format: winston.format.json(),
    }),
  ]),
});

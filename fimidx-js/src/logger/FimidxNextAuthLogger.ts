import type {FimidxConsoleLikeLogger} from './FimidxConsoleLikeLogger.js';

export type NextAuthWarningCode =
  | 'debug-enabled'
  | 'csrf-disabled'
  | 'experimental-webauthn'
  | 'env-url-basepath-redundant'
  | 'env-url-basepath-mismatch';

export interface IFimidxNextAuthLogger extends Record<string, Function> {
  warn: (code: NextAuthWarningCode) => void;
  error: (error: Error) => void;
  debug: (message: string, metadata?: unknown) => void;
}

export interface IFimidxNextAuthLoggerOptions {
  fimidxConsoleLogger: FimidxConsoleLikeLogger;
  debug?: boolean;
}

export class FimidxNextAuthLogger implements IFimidxNextAuthLogger {
  private fimidxLogger: FimidxConsoleLikeLogger;
  private logDebugMessages: boolean;

  constructor(params: IFimidxNextAuthLoggerOptions) {
    this.fimidxLogger = params.fimidxConsoleLogger;
    this.logDebugMessages = params.debug ?? false;
  }

  [key: string]: any;

  warn = (code: NextAuthWarningCode): void => {
    const url = `https://warnings.authjs.dev#${code}`;
    const message = `[auth][warn][${code}] Read more: ${url}`;

    this.fimidxLogger.log({
      level: 'warn',
      message,
      code,
      url,
      timestamp: new Date().toISOString(),
      source: 'next-auth',
    });
  };

  error = (error: Error): void => {
    const name = error.name;
    const message = `[auth][error] ${name}: ${error.message}`;

    const logEntry: any = {
      level: 'error',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      timestamp: new Date().toISOString(),
      source: 'next-auth',
    };

    // Handle error cause if present
    if (
      error.cause &&
      typeof error.cause === 'object' &&
      'err' in error.cause
    ) {
      const cause = error.cause as any;
      if (cause.err instanceof Error) {
        logEntry.cause = {
          name: cause.err.name,
          message: cause.err.message,
          stack: cause.err.stack,
        };

        // Include additional cause data
        const {err, ...data} = cause;
        if (Object.keys(data).length > 0) {
          logEntry.causeData = data;
        }
      }
    }

    this.fimidxLogger.log(logEntry);
  };

  debug = (message: string, metadata?: unknown): void => {
    if (!this.logDebugMessages) return;

    const logEntry: any = {
      level: 'debug',
      message: `[auth][debug]: ${message}`,
      timestamp: new Date().toISOString(),
      source: 'next-auth',
    };

    if (metadata !== undefined) {
      logEntry.metadata = metadata;
    }

    this.fimidxLogger.log(logEntry);
  };
}

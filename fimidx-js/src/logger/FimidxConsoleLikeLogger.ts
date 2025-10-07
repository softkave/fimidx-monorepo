import {isPlainObject, isString} from 'lodash-es';
import type {AnyObject} from 'softkave-js-utils';
import {FimidxLogger} from './FimidxLogger.js';

export interface IFimidxConsoleLikeLoggerOptions {
  fimidxLogger: FimidxLogger;
  // Additional options specific to console-like behavior
  /**
   * Whether to log each log entry to console, besides logging to fimidx. It
   * does not affect the logging to fimidx.
   */
  enableConsoleFallback?: boolean; // default: true
  /**
   * Whether to log to fimidx. It does not affect console fallback.
   */
  enabled?: boolean; // default: true
}

function isPrimitiveLike(value: unknown): boolean {
  return value === null || typeof value !== 'object';
}

export class FimidxConsoleLikeLogger {
  private readonly fimidxLogger: FimidxLogger;
  private readonly enableConsoleFallback: boolean;
  private enabled: boolean;

  // Console state tracking
  private counters: Map<string, number> = new Map();
  private timers: Map<string, number> = new Map();
  private groupIndentation: number = 0;
  private groupIndentationSize: number = 2;

  constructor(opts: IFimidxConsoleLikeLoggerOptions) {
    this.fimidxLogger = opts.fimidxLogger;
    this.enableConsoleFallback = opts.enableConsoleFallback ?? true;
    this.enabled = opts.enabled ?? true;
  }

  // Enable/disable functionality
  setEnabled = (enabled: boolean): void => {
    this.enabled = enabled;
  };

  isEnabled = (): boolean => {
    return this.enabled;
  };

  // Core logging methods
  log = (...params: any[]): void => {
    if (!this.enabled) {
      this.consoleFallback('log', ...params);
      return;
    }

    const logEntry = this.createLogEntry('log', [...params]);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('log', ...params);
  };

  debug = (...params: any[]): void => {
    if (!this.enabled) {
      this.consoleFallback('debug', ...params);
      return;
    }

    const logEntry = this.createLogEntry('debug', [...params]);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('debug', ...params);
  };

  info = (...params: any[]): void => {
    if (!this.enabled) {
      this.consoleFallback('info', ...params);
      return;
    }

    const logEntry = this.createLogEntry('info', [...params]);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('info', ...params);
  };

  warn = (...params: any[]): void => {
    if (!this.enabled) {
      this.consoleFallback('warn', ...params);
      return;
    }

    const logEntry = this.createLogEntry('warn', [...params]);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('warn', ...params);
  };

  error = (...params: any[]): void => {
    if (!this.enabled) {
      this.consoleFallback('error', ...params);
      return;
    }

    const logEntry = this.createLogEntry('error', [...params], {
      stackTrace: new Error().stack,
    });
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('error', ...params);
  };

  // Assertion
  assert = (value: any, message?: string, ...optionalParams: any[]): void => {
    if (!value) {
      const assertMessage = message || 'Assertion failed';

      if (!this.enabled) {
        this.consoleFallback('assert', value, assertMessage, ...optionalParams);
        return;
      }

      const logEntry = this.createLogEntry(
        'assert',
        [assertMessage, ...optionalParams],
        {stackTrace: new Error().stack},
      );
      this.fimidxLogger.log(logEntry);

      // console.assert throws an error if the condition is false, but if
      // console fallback is disabled, we want to throw an error instead
      if (this.enableConsoleFallback) {
        this.consoleFallback('assert', value, assertMessage, ...optionalParams);
      } else {
        throw new Error(assertMessage);
      }
    }
  };

  // Counting
  count = (label: string = 'default'): void => {
    const currentCount = this.counters.get(label) || 0;
    const newCount = currentCount + 1;
    this.counters.set(label, newCount);

    const message = `${label}: ${newCount}`;

    if (!this.enabled) {
      this.consoleFallback('count', label);
      return;
    }

    const logEntry = this.createLogEntry('count', [message]);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('count', label);
  };

  countReset = (label: string = 'default'): void => {
    this.counters.delete(label);
    const message = `${label}: 0`;

    if (!this.enabled) {
      this.consoleFallback('countReset', label);
      return;
    }

    const logEntry = this.createLogEntry('countReset', [message]);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('countReset', label);
  };

  // Timing
  time = (label: string = 'default'): void => {
    this.timers.set(label, Date.now());
    const message = `Timer '${label}' started`;

    if (!this.enabled) {
      this.consoleFallback('time', label);
      return;
    }

    const logEntry = this.createLogEntry('time', [message]);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('time', label);
  };

  timeEnd = (label: string = 'default'): void => {
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      const message = `${label}: ${duration}ms`;

      if (!this.enabled) {
        this.consoleFallback('timeEnd', label);
        this.timers.delete(label);
        return;
      }

      const logEntry = this.createLogEntry('timeEnd', [message]);
      this.fimidxLogger.log(logEntry);
      this.consoleFallback('timeEnd', label);
      this.timers.delete(label);
    } else {
      const message = `Timer '${label}' does not exist`;

      if (!this.enabled) {
        this.consoleFallback('timeEnd', label);
        return;
      }

      const logEntry = this.createLogEntry('timeEnd', [message]);
      this.fimidxLogger.log(logEntry);
      this.consoleFallback('timeEnd', label);
    }
  };

  timeLog = (label: string = 'default', ...data: any[]): void => {
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      const message = `${label}: ${duration}ms`;

      if (!this.enabled) {
        this.consoleFallback('timeLog', label, ...data);
        return;
      }

      const logEntry = this.createLogEntry('timeLog', [message, ...data]);
      this.fimidxLogger.log(logEntry);
      this.consoleFallback('timeLog', label, ...data);
    } else {
      const message = `Timer '${label}' does not exist`;

      if (!this.enabled) {
        this.consoleFallback('timeLog', label, ...data);
        return;
      }

      const logEntry = this.createLogEntry('timeLog', [message, ...data]);
      this.fimidxLogger.log(logEntry);
      this.consoleFallback('timeLog', label, ...data);
    }
  };

  // Grouping
  group = (...label: any[]): void => {
    this.groupIndentation += this.groupIndentationSize;
    const message = label.length > 0 ? label.join(' ') : 'Group';

    if (!this.enabled) {
      this.consoleFallback('group', ...label);
      return;
    }

    const logEntry = this.createLogEntry('group', [message]);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('group', ...label);
  };

  groupCollapsed = (...label: any[]): void => {
    if (!this.enabled) {
      this.consoleFallback('groupCollapsed', ...label);
      return;
    }

    // Same as group for our implementation
    this.group(...label);
  };

  groupEnd = (): void => {
    this.groupIndentation = Math.max(
      0,
      this.groupIndentation - this.groupIndentationSize,
    );

    if (!this.enabled) {
      this.consoleFallback('groupEnd');
      return;
    }

    const logEntry = this.createLogEntry('groupEnd', ['Group ended']);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('groupEnd');
  };

  // Inspection
  dir = (obj: any, options?: any): void => {
    if (!this.enabled) {
      this.consoleFallback('dir', obj, options);
      return;
    }

    const inspected = this.inspectObject(obj);
    const logEntry = this.createLogEntry('dir', [inspected]);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('dir', obj, options);
  };

  dirxml = (...data: any[]): void => {
    if (!this.enabled) {
      this.consoleFallback('dirxml', ...data);
      return;
    }

    const logEntry = this.createLogEntry('dirxml', ['dirxml called', ...data]);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('dirxml', ...data);
  };

  table = (tabularData: any, properties?: readonly string[]): void => {
    if (!this.enabled) {
      this.consoleFallback('table', tabularData, properties);
      return;
    }

    const tableData = this.formatTable(tabularData, properties);
    const logEntry = this.createLogEntry('table', [tableData]);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('table', tabularData, properties);
  };

  // Tracing
  trace = (...params: any[]): void => {
    if (!this.enabled) {
      this.consoleFallback('trace', ...params);
      return;
    }

    const stackTrace = new Error().stack;
    const logEntry = this.createLogEntry('trace', [...params], {
      stackTrace,
    });
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('trace', ...params);
  };

  // Utility methods
  clear = (): void => {
    if (!this.enabled) {
      this.consoleFallback('clear');
      return;
    }

    const logEntry = this.createLogEntry('clear', ['Console cleared']);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('clear');
  };

  // Inspector-only methods (no-op in our implementation)
  profile = (label?: string): void => {
    if (!this.enabled) {
      this.consoleFallback('profile', label);
      return;
    }

    const logEntry = this.createLogEntry('profile', [
      `Profile '${label || 'default'}' started`,
    ]);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('profile', label);
  };

  profileEnd = (label?: string): void => {
    if (!this.enabled) {
      this.consoleFallback('profileEnd', label);
      return;
    }

    const logEntry = this.createLogEntry('profileEnd', [
      `Profile '${label || 'default'}' ended`,
    ]);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('profileEnd', label);
  };

  timeStamp = (label?: string): void => {
    if (!this.enabled) {
      this.consoleFallback('timeStamp', label);
      return;
    }

    const logEntry = this.createLogEntry('timeStamp', [
      `Timestamp '${label || 'default'}'`,
    ]);
    this.fimidxLogger.log(logEntry);
    this.consoleFallback('timeStamp', label);
  };

  // Utility methods for FimidxLogger
  flush = async (): Promise<void> => {
    if (!this.enabled) return;

    return this.fimidxLogger.flush();
  };

  close = async (): Promise<void> => {
    if (!this.enabled) return;

    return this.fimidxLogger.close();
  };

  // Private helper methods
  private createLogEntry = (
    level: string,
    args: unknown[],
    additionalData?: any,
  ) => {
    const timestamp = new Date().toISOString();

    let message: string | undefined;
    if (args.length === 0) {
      message = 'Empty message';
    } else if (args.length && isPrimitiveLike(args[0])) {
      message = isString(args[0]) ? args[0] : JSON.stringify(args[0]);
      args.shift();
    }

    let mergedArgs: AnyObject = {};
    if (args.length === 1 && isPlainObject(args[0])) {
      mergedArgs = args[0] as AnyObject;
    } else if (args.length > 0) {
      mergedArgs = {args: args};
    }

    const entry: any = {
      level,
      timestamp,
      ...(message ? {message} : {}),
      ...mergedArgs,
    };

    if (additionalData) {
      Object.assign(entry, additionalData);
    }

    return entry;
  };

  private inspectObject = (obj: any): string => {
    try {
      if (obj === null) return 'null';
      if (obj === undefined) return 'undefined';
      if (typeof obj === 'string') return obj;
      if (typeof obj === 'number') return String(obj);
      if (typeof obj === 'boolean') return String(obj);
      if (obj instanceof Error) return obj.stack || obj.message || String(obj);

      return JSON.stringify(obj, null, 2);
    } catch (error) {
      return '[Object]';
    }
  };

  private formatTable = (
    tabularData: any,
    properties?: readonly string[],
  ): any => {
    if (!tabularData || typeof tabularData !== 'object') {
      return tabularData;
    }

    if (Array.isArray(tabularData)) {
      return {
        type: 'table',
        data: tabularData,
        properties: properties || [],
        rowCount: tabularData.length,
      };
    }

    return {
      type: 'table',
      data: tabularData,
      properties: properties || Object.keys(tabularData),
      rowCount: 1,
    };
  };

  private consoleFallback = (method: string, ...args: any[]): void => {
    if (!this.enableConsoleFallback) return;

    const consoleMethod = console[method as keyof Console] as Function;
    if (typeof consoleMethod === 'function') {
      consoleMethod(...args);
    } else {
      // Fallback to console.log if method doesn't exist
      console.log(...args);
    }
  };
}

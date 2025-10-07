import {FimidxEndpoints} from '../endpoints/fimidxEndpoints.js';
import type {IngestLogsArgs} from '../endpoints/fimidxTypes.js';
import {MfdocEndpointError} from '../endpoints/index.js';

export interface IFimidxLoggerOptions {
  appId: string;
  clientToken: string;
  serverURL?: string;

  // Buffering options
  bufferTimeout?: number; // ms, default: 1000
  maxBufferSize?: number; // default: 100

  // Retry options
  maxRetries?: number; // default: 3
  retryDelay?: number; // ms, default: 1000

  // Fallback options
  /**
   * Whether to log to console if an error occurs and logs are not sent to the
   * server. This is to avoid losing logs.
   */
  consoleLogOnError?: boolean; // default: true
  /**
   * Whether to log errors when sending logs to the server fails. This is to
   * help diagnose issues with the server.
   */
  logRemoteErrors?: boolean; // default: false

  // Metadata to include in every log entry
  metadata?: Record<string, any>;
}

export class FimidxLogger {
  private readonly appId: string;
  private readonly clientToken: string;
  private readonly serverURL?: string;
  private readonly fimidx: FimidxEndpoints;

  // Buffering
  private buffer: any[] = [];
  private bufferTimeout: number;
  private maxBufferSize: number;
  private flushTimer?: NodeJS.Timeout;

  // Retry configuration
  private maxRetries: number;
  private retryDelay: number;

  // Fallback configuration
  private consoleLogOnError: boolean;
  private logRemoteErrors: boolean;

  // Metadata
  private metadata?: Record<string, any>;

  constructor(opts: IFimidxLoggerOptions) {
    // Validate required parameters
    if (!opts.appId) throw new Error('FimidxLogger: appId is required');
    if (!opts.clientToken)
      throw new Error('FimidxLogger: clientToken is required');

    // Initialize properties
    this.appId = opts.appId;
    this.clientToken = opts.clientToken;
    this.serverURL = opts.serverURL;

    // Buffering defaults
    this.bufferTimeout = opts.bufferTimeout ?? 1000;
    this.maxBufferSize = opts.maxBufferSize ?? 100;

    // Retry defaults
    this.maxRetries = opts.maxRetries ?? 3;
    this.retryDelay = opts.retryDelay ?? 1000;

    // Fallback defaults
    this.consoleLogOnError = opts.consoleLogOnError ?? true;
    this.logRemoteErrors = opts.logRemoteErrors ?? false;

    // Metadata
    this.metadata = opts.metadata;

    // Initialize FimidxEndpoints
    this.fimidx = new FimidxEndpoints({
      authToken: this.clientToken,
      ...(this.serverURL ? {serverURL: this.serverURL} : {}),
    });
  }

  // Public API
  log = (entry: any): void => {
    this.addToBuffer(entry);
  };

  logList = (entries: any[]): void => {
    for (const entry of entries) {
      this.addToBuffer(entry);
    }
  };

  flush = async (): Promise<void> => {
    return this.flushBuffer();
  };

  setMetadata = (metadata: Record<string, any>): void => {
    this.metadata = metadata;
  };

  getMetadata = (): Record<string, any> | undefined => {
    return this.metadata;
  };

  mergeMetadata = (metadata: Record<string, any>): void => {
    this.metadata = {...this.metadata, ...metadata};
  };

  close = async (): Promise<void> => {
    // Clear any pending timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Flush any remaining entries
    await this.flushBuffer();
  };

  // Private methods
  private addToBuffer = (entry: any): void => {
    // Merge entry with metadata
    const logEntry = this.metadata ? {...this.metadata, ...entry} : entry;

    this.buffer.push(logEntry);

    // Check if buffer is full and trigger immediate flush
    if (this.buffer.length >= this.maxBufferSize) {
      this.flushBuffer();
    } else {
      // Schedule flush if not already scheduled
      this.scheduleFlush();
    }
  };

  private scheduleFlush = (): void => {
    // Clear existing timer if present
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // Set new timer to flush buffer after timeout
    this.flushTimer = setTimeout(() => {
      this.flushBuffer();
    }, this.bufferTimeout);
  };

  private flushBuffer = async (): Promise<void> => {
    // Clear flush timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    // If buffer is empty, return immediately
    if (this.buffer.length === 0) {
      return;
    }

    // Take current buffer contents and clear buffer
    const logsToSend = [...this.buffer];
    this.buffer = [];

    // Send logs
    await this.sendLogs(logsToSend);
  };

  private sendLogs = async (logs: any[]): Promise<void> => {
    try {
      await this.retrySend(logs, 0);
    } catch (error) {
      // Log to console if configured
      if (this.consoleLogOnError) {
        console.error(
          'FimidxLogger: Failed to send logs after max retries:',
          error,
        );
        console.log('FimidxLogger: Logs that failed to send:', logs);
      }
    }
  };

  private retrySend = async (logs: any[], attempt: number): Promise<void> => {
    try {
      const args: IngestLogsArgs = {
        appId: this.appId,
        logs: logs,
      };

      await this.fimidx.logs.ingestLogs(args);
    } catch (error) {
      // Don't retry on authentication or client errors
      if (this.isNonRetryableError(error)) {
        throw error;
      }

      // If max retries exceeded, throw error
      if (attempt >= this.maxRetries) {
        throw error;
      }

      // Log remote error if configured
      if (this.logRemoteErrors) {
        console.error(
          `FimidxLogger: Remote error (attempt ${attempt + 1}/${this.maxRetries + 1}):`,
          error,
        );
      }

      // Calculate delay with exponential backoff
      const delay = this.retryDelay * Math.pow(2, attempt);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry
      return this.retrySend(logs, attempt + 1);
    }
  };

  private isNonRetryableError = (error: any): boolean => {
    if (error instanceof MfdocEndpointError) {
      // Check for authentication errors (401)
      if (error.statusCode === 401) {
        return true;
      }

      // Check for client errors (4xx, except 429 which is retryable)
      if (
        error.statusCode &&
        error.statusCode >= 400 &&
        error.statusCode < 500 &&
        error.statusCode !== 429
      ) {
        return true;
      }
    }

    return false;
  };
}

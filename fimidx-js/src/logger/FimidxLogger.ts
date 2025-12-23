import * as fimidara from 'fimidara';
import {MfdocEndpointError as FimidaraEndpointError} from 'fimidara';
import {FimidxEndpoints} from '../endpoints/fimidxEndpoints.js';
import type {InitSdkArgs} from '../endpoints/fimidxTypes.js';
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

  // Fimidara file-based logging
  private fimidaraToken?: string;
  private folderPath?: string;
  private filePrefix?: string;
  private fimidaraEndpoints?: fimidara.FimidaraEndpoints;
  private initialized: boolean = false;
  private initPromise?: Promise<void>;

  // Flush lock to prevent concurrent writes
  private isFlushing: boolean = false;
  private flushPromise?: Promise<void>;

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
  init = async (): Promise<void> => {
    // If already initialized, return
    if (this.initialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this.doInit();
    await this.initPromise;
  };

  private doInit = async (): Promise<void> => {
    try {
      // Call init SDK endpoint
      const args: InitSdkArgs = {};
      const response = await this.fimidx.logs.initSdk(args);

      this.fimidaraToken = response.fimidaraToken;
      this.folderPath = response.folderPath;
      this.filePrefix = response.filePrefix;

      // Initialize fimidara endpoints
      this.fimidaraEndpoints = new fimidara.FimidaraEndpoints({
        authToken: this.fimidaraToken,
      });

      this.initialized = true;
    } catch (error) {
      if (this.consoleLogOnError) {
        console.error('FimidxLogger: Failed to initialize:', error);
      }
      throw error;
    }
  };

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

    // Wait for any in-progress flush to complete
    if (this.flushPromise) {
      await this.flushPromise;
    }

    // Flush any remaining entries
    await this.flushBuffer();
  };

  // Private methods
  private addToBuffer = (entry: any): void => {
    // Merge entry with metadata
    const logEntry = this.metadata ? {...this.metadata, ...entry} : entry;

    // Ensure timestamp is in UTC if not provided
    if (!logEntry.timestamp) {
      logEntry.timestamp = Date.now();
    }

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

    // If a flush is already in progress, wait for it to complete
    if (this.isFlushing && this.flushPromise) {
      return this.flushPromise;
    }

    // Start new flush operation - create promise first for atomicity
    const flushPromise = this.doFlushBuffer().finally(() => {
      this.isFlushing = false;
      this.flushPromise = undefined;
    });

    this.isFlushing = true;
    this.flushPromise = flushPromise;

    return flushPromise;
  };

  private doFlushBuffer = async (): Promise<void> => {
    // Ensure initialized
    if (!this.initialized) {
      try {
        await this.init();
      } catch (error) {
        if (this.consoleLogOnError) {
          console.error(
            'FimidxLogger: Failed to initialize during flush:',
            error,
          );
        }
        return;
      }
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
      if (!this.fimidaraEndpoints || !this.folderPath || !this.filePrefix) {
        throw new Error('FimidxLogger: Not initialized');
      }

      // Get current date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      const filename = `${this.filePrefix}-${today}.ndjson`;
      const filepath = `${this.folderPath}/${filename}`;

      // Convert logs to newline-delimited JSON
      const ndjsonContent =
        logs.map(log => JSON.stringify(log)).join('\n') + '\n';

      // Upload with append mode - this will create the file if it doesn't exist
      const blob = new Blob([ndjsonContent], {type: 'application/x-ndjson'});
      await this.fimidaraEndpoints.files.uploadFile({
        filepath,
        data: blob,
        size: blob.size,
        mimetype: 'application/x-ndjson',
        append: true,
        onAppendCreateIfNotExists: true,
      });
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

    if (error instanceof FimidaraEndpointError) {
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

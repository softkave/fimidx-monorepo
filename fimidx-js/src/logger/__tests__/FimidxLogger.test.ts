import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {FimidxEndpoints} from '../../endpoints/fimidxEndpoints.js';
import {MfdocEndpointError} from '../../endpoints/index.js';
import {FimidxLogger} from '../FimidxLogger.js';

// Mock the FimidxEndpoints
vi.mock('../../endpoints/fimidxEndpoints.js', () => ({
  FimidxEndpoints: vi.fn(),
}));

describe('FimidxLogger', () => {
  let mockFimidxEndpoints: any;
  let mockLogsEndpoints: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create mock logs endpoints
    mockLogsEndpoints = {
      ingestLogs: vi.fn().mockResolvedValue(undefined),
    };

    // Create mock FimidxEndpoints
    mockFimidxEndpoints = {
      logs: mockLogsEndpoints,
    };

    // Mock the FimidxEndpoints constructor
    (FimidxEndpoints as any).mockImplementation(() => mockFimidxEndpoints);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create logger with required parameters', () => {
      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
      });

      expect(logger).toBeInstanceOf(FimidxLogger);
      expect(FimidxEndpoints).toHaveBeenCalledWith({
        authToken: 'test-token',
        serverURL: undefined,
      });
    });

    it('should throw error when projectId is missing', () => {
      expect(() => {
        new FimidxLogger({
          clientToken: 'test-token',
        } as any);
      }).toThrow('projectId is required');
    });

    it('should throw error when clientToken is missing', () => {
      expect(() => {
        new FimidxLogger({
          projectId: 'test-project',
        } as any);
      }).toThrow('clientToken is required');
    });

    it('should use default values for optional parameters', () => {
      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
      });

      // Access private properties for testing
      const privateProps = logger as any;
      expect(privateProps.bufferTimeout).toBe(1000);
      expect(privateProps.maxBufferSize).toBe(100);
      expect(privateProps.maxRetries).toBe(3);
      expect(privateProps.retryDelay).toBe(1000);
      expect(privateProps.consoleLogOnError).toBe(true);
      expect(privateProps.logRemoteErrors).toBe(false);
    });

    it('should use custom values for optional parameters', () => {
      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
        bufferTimeout: 2000,
        maxBufferSize: 50,
        maxRetries: 5,
        retryDelay: 500,
        consoleLogOnError: false,
        logRemoteErrors: true,
        metadata: {env: 'test'},
      });

      const privateProps = logger as any;
      expect(privateProps.bufferTimeout).toBe(2000);
      expect(privateProps.maxBufferSize).toBe(50);
      expect(privateProps.maxRetries).toBe(5);
      expect(privateProps.retryDelay).toBe(500);
      expect(privateProps.consoleLogOnError).toBe(false);
      expect(privateProps.logRemoteErrors).toBe(true);
      expect(privateProps.metadata).toEqual({env: 'test'});
    });
  });

  describe('log', () => {
    it('should add entry to buffer and schedule flush', async () => {
      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
        bufferTimeout: 1000,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      logger.log({level: 'info', message: 'test message'});

      // Check that entry was added to buffer
      const privateProps = logger as any;
      expect(privateProps.buffer).toHaveLength(1);
      expect(privateProps.buffer[0]).toEqual({
        level: 'info',
        message: 'test message',
      });

      // Check that flush was scheduled
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

      // Fast-forward time to trigger flush
      vi.advanceTimersByTime(1000);

      // Wait for async operations
      await vi.runAllTimersAsync();

      // Check that logs were sent
      expect(mockLogsEndpoints.ingestLogs).toHaveBeenCalledWith({
        projectId: 'test-project',
        logs: [{level: 'info', message: 'test message'}],
      });

      consoleSpy.mockRestore();
    });

    it('should merge metadata with log entries', async () => {
      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
        metadata: {environment: 'test', version: '1.0.0'},
      });

      logger.log({level: 'info', message: 'test message'});

      // Fast-forward time to trigger flush
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      // Check that metadata was merged
      expect(mockLogsEndpoints.ingestLogs).toHaveBeenCalledWith({
        projectId: 'test-project',
        logs: [
          {
            environment: 'test',
            version: '1.0.0',
            level: 'info',
            message: 'test message',
          },
        ],
      });
    });

    it('should trigger immediate flush when buffer is full', async () => {
      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
        maxBufferSize: 2,
      });

      // Add two entries to fill buffer
      logger.log({level: 'info', message: 'first'});
      logger.log({level: 'info', message: 'second'});

      // Should trigger immediate flush without waiting for timer
      expect(mockLogsEndpoints.ingestLogs).toHaveBeenCalledWith({
        projectId: 'test-project',
        logs: [
          {level: 'info', message: 'first'},
          {level: 'info', message: 'second'},
        ],
      });
    });
  });

  describe('logList', () => {
    it('should add multiple entries to buffer', async () => {
      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
      });

      logger.logList([
        {level: 'info', message: 'first'},
        {level: 'error', message: 'second'},
        {level: 'warn', message: 'third'},
      ]);

      // Fast-forward time to trigger flush
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      expect(mockLogsEndpoints.ingestLogs).toHaveBeenCalledWith({
        projectId: 'test-project',
        logs: [
          {level: 'info', message: 'first'},
          {level: 'error', message: 'second'},
          {level: 'warn', message: 'third'},
        ],
      });
    });
  });

  describe('flush', () => {
    it('should immediately flush buffer', async () => {
      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
      });

      logger.log({level: 'info', message: 'test'});

      // Flush immediately
      await logger.flush();

      expect(mockLogsEndpoints.ingestLogs).toHaveBeenCalledWith({
        projectId: 'test-project',
        logs: [{level: 'info', message: 'test'}],
      });
    });

    it('should do nothing when buffer is empty', async () => {
      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
      });

      await logger.flush();

      expect(mockLogsEndpoints.ingestLogs).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should flush remaining entries and clear timers', async () => {
      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
      });

      logger.log({level: 'info', message: 'test'});

      await logger.close();

      expect(mockLogsEndpoints.ingestLogs).toHaveBeenCalledWith({
        projectId: 'test-project',
        logs: [{level: 'info', message: 'test'}],
      });
    });
  });

  describe('error handling and retries', () => {
    it('should retry on network errors', async () => {
      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
        maxRetries: 2,
        retryDelay: 100,
      });

      // Mock network error first, then success
      mockLogsEndpoints.ingestLogs
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      logger.log({level: 'info', message: 'test'});

      // Fast-forward time to trigger flush
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      // Should have been called 3 times (initial + 2 retries)
      expect(mockLogsEndpoints.ingestLogs).toHaveBeenCalledTimes(3);
    });

    it('should not retry on authentication errors', async () => {
      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
      });

      // Create a proper MfdocEndpointError with statusCode 401
      const authError = new MfdocEndpointError(
        [{name: 'auth', message: 'Unauthorized'}],
        401,
        'Unauthorized',
      );
      mockLogsEndpoints.ingestLogs.mockRejectedValue(authError);

      logger.log({level: 'info', message: 'test'});

      // Fast-forward time to trigger flush
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      // Should only be called once (no retries for auth errors)
      expect(mockLogsEndpoints.ingestLogs).toHaveBeenCalledTimes(1);
    });

    it('should log to console when max retries exceeded', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
        maxRetries: 1,
        consoleLogOnError: true,
      });

      mockLogsEndpoints.ingestLogs.mockRejectedValue(
        new Error('Network error'),
      );

      logger.log({level: 'info', message: 'test'});

      // Fast-forward time to trigger flush
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'FimidxLogger: Failed to send logs after max retries:',
        expect.any(Error),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'FimidxLogger: Logs that failed to send:',
        [{level: 'info', message: 'test'}],
      );

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should not log to console when consoleLogOnError is false', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
        maxRetries: 1,
        consoleLogOnError: false,
      });

      mockLogsEndpoints.ingestLogs.mockRejectedValue(
        new Error('Network error'),
      );

      logger.log({level: 'info', message: 'test'});

      // Fast-forward time to trigger flush
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should log remote errors when logRemoteErrors is true', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const logger = new FimidxLogger({
        projectId: 'test-project',
        clientToken: 'test-token',
        maxRetries: 2,
        logRemoteErrors: true,
      });

      mockLogsEndpoints.ingestLogs.mockRejectedValue(
        new Error('Network error'),
      );

      logger.log({level: 'info', message: 'test'});

      // Fast-forward time to trigger flush
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      // Should log each retry attempt
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'FimidxLogger: Remote error (attempt 1/3):',
        expect.any(Error),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'FimidxLogger: Remote error (attempt 2/3):',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

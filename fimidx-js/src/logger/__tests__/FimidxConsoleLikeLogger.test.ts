import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {FimidxConsoleLikeLogger} from '../FimidxConsoleLikeLogger.js';
import {FimidxLogger} from '../FimidxLogger.js';

// Mock the FimidxLogger
vi.mock('../FimidxLogger.js', () => ({
  FimidxLogger: vi.fn(),
}));

describe('FimidxConsoleLikeLogger', () => {
  let mockFimidxLogger: any;
  let consoleLikeLogger: FimidxConsoleLikeLogger;
  let consoleSpy: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create mock FimidxLogger
    mockFimidxLogger = {
      log: vi.fn(),
      flush: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Mock the FimidxLogger constructor
    (FimidxLogger as any).mockImplementation(() => mockFimidxLogger);

    // Mock console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      group: vi.spyOn(console, 'group').mockImplementation(() => {}),
      groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
      dir: vi.spyOn(console, 'dir').mockImplementation(() => {}),
      table: vi.spyOn(console, 'table').mockImplementation(() => {}),
      trace: vi.spyOn(console, 'trace').mockImplementation(() => {}),
      clear: vi.spyOn(console, 'clear').mockImplementation(() => {}),
      time: vi.spyOn(console, 'time').mockImplementation(() => {}),
      timeEnd: vi.spyOn(console, 'timeEnd').mockImplementation(() => {}),
      timeLog: vi.spyOn(console, 'timeLog').mockImplementation(() => {}),
      count: vi.spyOn(console, 'count').mockImplementation(() => {}),
      countReset: vi.spyOn(console, 'countReset').mockImplementation(() => {}),
      assert: vi.spyOn(console, 'assert').mockImplementation(() => {}),
    };

    consoleLikeLogger = new FimidxConsoleLikeLogger({
      fimidxLogger: new FimidxLogger({
        appId: 'test-app',
        clientToken: 'test-token',
      }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    if (consoleSpy) {
      Object.values(consoleSpy).forEach((spy: any) => {
        if (spy && typeof spy.mockRestore === 'function') {
          spy.mockRestore();
        }
      });
    }
  });

  describe('constructor', () => {
    it('should create logger with default options', () => {
      expect(consoleLikeLogger).toBeInstanceOf(FimidxConsoleLikeLogger);
      expect(FimidxLogger).toHaveBeenCalledWith({
        appId: 'test-app',
        clientToken: 'test-token',
      });
    });

    it('should create logger with custom options', () => {
      const customLogger = new FimidxConsoleLikeLogger({
        fimidxLogger: new FimidxLogger({
          appId: 'test-app',
          clientToken: 'test-token',
        }),
        enableConsoleFallback: false,
      });

      expect(customLogger).toBeInstanceOf(FimidxConsoleLikeLogger);
    });
  });

  describe('core logging methods', () => {
    it('should log with correct level and message', () => {
      consoleLikeLogger.log('test message', 'param1', 'param2');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'log',
        message: 'test message',
        args: ['param1', 'param2'],
        timestamp: expect.any(String),
      });
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'test message',
        'param1',
        'param2',
      );
    });

    it('should debug with correct level and message', () => {
      consoleLikeLogger.debug('debug message');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'debug',
        message: 'debug message',
        timestamp: expect.any(String),
      });
      expect(consoleSpy.debug).toHaveBeenCalledWith('debug message');
    });

    it('should info with correct level and message', () => {
      consoleLikeLogger.info('info message');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'info',
        message: 'info message',
        timestamp: expect.any(String),
      });
      expect(consoleSpy.info).toHaveBeenCalledWith('info message');
    });

    it('should warn with correct level and message', () => {
      consoleLikeLogger.warn('warning message');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'warn',
        message: 'warning message',
        timestamp: expect.any(String),
      });
      expect(consoleSpy.warn).toHaveBeenCalledWith('warning message');
    });

    it('should error with correct level and message', () => {
      consoleLikeLogger.error('error message');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'error',
        message: 'error message',
        timestamp: expect.any(String),
        stackTrace: expect.any(String),
      });
      expect(consoleSpy.error).toHaveBeenCalledWith('error message');
    });
  });

  describe('assert', () => {
    it('should not log when assertion passes', () => {
      consoleLikeLogger.assert(true, 'should not log');

      expect(mockFimidxLogger.log).not.toHaveBeenCalled();
      expect(consoleSpy.assert).not.toHaveBeenCalled();
    });

    it('should log when assertion fails', () => {
      consoleLikeLogger.assert(false, 'assertion failed');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'assert',
        message: 'assertion failed',
        timestamp: expect.any(String),
        stackTrace: expect.any(String),
      });
      expect(consoleSpy.assert).toHaveBeenCalledWith(false, 'assertion failed');
    });

    it('should use default message when no message provided', () => {
      consoleLikeLogger.assert(false);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'assert',
        message: 'Assertion failed',
        timestamp: expect.any(String),
        stackTrace: expect.any(String),
      });
    });
  });

  describe('counting methods', () => {
    it('should count correctly', () => {
      consoleLikeLogger.count('test');
      consoleLikeLogger.count('test');
      consoleLikeLogger.count('test');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'count',
        message: 'test: 1',
        timestamp: expect.any(String),
      });
      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'count',
        message: 'test: 2',
        timestamp: expect.any(String),
      });
      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'count',
        message: 'test: 3',
        timestamp: expect.any(String),
      });
    });

    it('should countReset correctly', () => {
      consoleLikeLogger.count('test');
      consoleLikeLogger.countReset('test');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'count',
        message: 'test: 1',
        timestamp: expect.any(String),
      });
      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'countReset',
        message: 'test: 0',
        timestamp: expect.any(String),
      });
    });

    it('should use default label', () => {
      consoleLikeLogger.count();
      consoleLikeLogger.countReset();

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'count',
        message: 'default: 1',
        timestamp: expect.any(String),
      });
      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'countReset',
        message: 'default: 0',
        timestamp: expect.any(String),
      });
    });
  });

  describe('timing methods', () => {
    it('should time and timeEnd correctly', () => {
      consoleLikeLogger.time('test-timer');

      // Advance time
      vi.advanceTimersByTime(100);

      consoleLikeLogger.timeEnd('test-timer');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'time',
        message: "Timer 'test-timer' started",
        timestamp: expect.any(String),
      });
      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'timeEnd',
        message: 'test-timer: 100ms',
        timestamp: expect.any(String),
      });
    });

    it('should warn when timeEnd called for non-existent timer', () => {
      consoleLikeLogger.timeEnd('non-existent');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'timeEnd',
        message: "Timer 'non-existent' does not exist",
        timestamp: expect.any(String),
      });
      expect(consoleSpy.timeEnd).toHaveBeenCalledWith('non-existent');
    });

    it('should timeLog correctly', () => {
      consoleLikeLogger.time('test-timer');
      vi.advanceTimersByTime(150);
      consoleLikeLogger.timeLog('test-timer', 'additional data');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'time',
        message: "Timer 'test-timer' started",
        timestamp: expect.any(String),
      });
      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'timeLog',
        message: 'test-timer: 150ms',
        args: ['additional data'],
        timestamp: expect.any(String),
      });
    });

    it('should warn when timeLog called for non-existent timer', () => {
      consoleLikeLogger.timeLog('non-existent');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'timeLog',
        message: "Timer 'non-existent' does not exist",
        timestamp: expect.any(String),
      });
    });
  });

  describe('grouping methods', () => {
    it('should group and groupEnd correctly', () => {
      consoleLikeLogger.group('test group');
      consoleLikeLogger.log('inside group');
      consoleLikeLogger.groupEnd();

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'group',
        message: 'test group',
        timestamp: expect.any(String),
      });
      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'log',
        message: 'inside group',
        timestamp: expect.any(String),
      });
      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'groupEnd',
        message: 'Group ended',
        timestamp: expect.any(String),
      });
    });

    it('should handle nested groups', () => {
      consoleLikeLogger.group('outer');
      consoleLikeLogger.group('inner');
      consoleLikeLogger.log('nested');
      consoleLikeLogger.groupEnd();
      consoleLikeLogger.groupEnd();

      // Verify that all the expected log calls were made
      expect(mockFimidxLogger.log).toHaveBeenCalledTimes(5);

      const logCalls = mockFimidxLogger.log.mock.calls;
      expect(logCalls[0][0].level).toBe('group'); // outer group
      expect(logCalls[1][0].level).toBe('group'); // inner group
      expect(logCalls[2][0].level).toBe('log'); // nested log
      expect(logCalls[3][0].level).toBe('groupEnd'); // inner group end
      expect(logCalls[4][0].level).toBe('groupEnd'); // outer group end
    });

    it('should handle groupCollapsed same as group', () => {
      consoleLikeLogger.groupCollapsed('collapsed group');
      consoleLikeLogger.log('inside collapsed');
      consoleLikeLogger.groupEnd();

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'group',
        message: 'collapsed group',
        timestamp: expect.any(String),
      });
    });
  });

  describe('inspection methods', () => {
    it('should dir correctly', () => {
      const obj = {test: 'value'};
      consoleLikeLogger.dir(obj);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'dir',
        message: '{\n  "test": "value"\n}',
        timestamp: expect.any(String),
      });
      expect(consoleSpy.dir).toHaveBeenCalledWith(obj, undefined);
    });

    it('should dirxml correctly', () => {
      consoleLikeLogger.dirxml('xml data');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'dirxml',
        message: 'dirxml called',
        args: ['xml data'],
        timestamp: expect.any(String),
      });
      // Note: console.dirxml doesn't exist in Node.js, so it should fallback to console.log
      // but the fallback behavior is tested separately
    });

    it('should table correctly', () => {
      const data = [{name: 'John', age: 30}];
      consoleLikeLogger.table(data);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'table',
        data: [{name: 'John', age: 30}],
        properties: [],
        rowCount: 1,
        timestamp: expect.any(String),
        type: 'table',
      });
      expect(consoleSpy.table).toHaveBeenCalledWith(data, undefined);
    });
  });

  describe('trace', () => {
    it('should trace with stack trace', () => {
      consoleLikeLogger.trace('trace message');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'trace',
        message: 'trace message',
        timestamp: expect.any(String),
        stackTrace: expect.any(String),
      });
      expect(consoleSpy.trace).toHaveBeenCalledWith('trace message');
    });
  });

  describe('utility methods', () => {
    it('should clear correctly', () => {
      consoleLikeLogger.clear();

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'clear',
        message: 'Console cleared',
        timestamp: expect.any(String),
      });
      expect(consoleSpy.clear).toHaveBeenCalled();
    });

    it('should profile correctly', () => {
      consoleLikeLogger.profile('test-profile');
      consoleLikeLogger.profileEnd('test-profile');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'profile',
        message: "Profile 'test-profile' started",
        timestamp: expect.any(String),
      });
      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'profileEnd',
        message: "Profile 'test-profile' ended",
        timestamp: expect.any(String),
      });
    });

    it('should timeStamp correctly', () => {
      consoleLikeLogger.timeStamp('test-stamp');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'timeStamp',
        message: "Timestamp 'test-stamp'",
        timestamp: expect.any(String),
      });
    });
  });

  describe('message formatting', () => {
    it('should format string with printf-style placeholders', () => {
      consoleLikeLogger.log('Hello %s, you are %d years old', 'John', 30);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'log',
        message: 'Hello %s, you are %d years old',
        args: ['John', 30],
        timestamp: expect.any(String),
      });
    });

    it('should handle objects and arrays', () => {
      const obj = {name: 'John'};
      const arr = [1, 2, 3];
      consoleLikeLogger.log('Object:', obj, 'Array:', arr);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'log',
        message: 'Object:',
        args: [{name: 'John'}, 'Array:', [1, 2, 3]],
        timestamp: expect.any(String),
      });
    });

    it('should handle null and undefined', () => {
      consoleLikeLogger.log(null, undefined);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'log',
        message: 'null',
        args: [undefined],
        timestamp: expect.any(String),
      });
    });

    it('should handle errors', () => {
      const error = new Error('test error');
      consoleLikeLogger.log(error);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'log',
        args: [error],
        timestamp: expect.any(String),
      });
    });
  });

  describe('console fallback', () => {
    it('should disable console fallback when configured', () => {
      const noFallbackLogger = new FimidxConsoleLikeLogger({
        fimidxLogger: new FimidxLogger({
          appId: 'test-app',
          clientToken: 'test-token',
        }),
        enableConsoleFallback: false,
      });

      noFallbackLogger.log('test message');

      expect(mockFimidxLogger.log).toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should fallback to console.log when method does not exist', () => {
      // Test the consoleFallback method directly since we can't call non-existent methods
      const noFallbackLogger = new FimidxConsoleLikeLogger({
        fimidxLogger: new FimidxLogger({
          appId: 'test-app',
          clientToken: 'test-token',
        }),
        enableConsoleFallback: true,
      });

      // Mock console.log to test fallback
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Call a method that doesn't exist on console
      (noFallbackLogger as any).consoleFallback('nonExistentMethod', 'test');

      expect(logSpy).toHaveBeenCalledWith('test');
      logSpy.mockRestore();
    });
  });

  describe('utility methods for FimidxLogger', () => {
    it('should flush correctly', async () => {
      await consoleLikeLogger.flush();

      expect(mockFimidxLogger.flush).toHaveBeenCalled();
    });

    it('should close correctly', async () => {
      await consoleLikeLogger.close();

      expect(mockFimidxLogger.close).toHaveBeenCalled();
    });
  });
});

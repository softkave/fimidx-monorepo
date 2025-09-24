import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  FimidxNextAuthLogger,
  type NextAuthWarningCode,
} from '../FimidxNextAuthLogger.js';

describe('FimidxNextAuthLogger', () => {
  let mockFimidxLogger: any;
  let nextAuthLogger: FimidxNextAuthLogger;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create mock FimidxConsoleLikeLogger
    mockFimidxLogger = {
      log: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };

    nextAuthLogger = new FimidxNextAuthLogger({
      fimidxConsoleLogger: mockFimidxLogger,
      debug: true, // Enable debug for tests
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create logger with FimidxLogger instance', () => {
      expect(nextAuthLogger).toBeInstanceOf(FimidxNextAuthLogger);
      expect(nextAuthLogger).toHaveProperty('warn');
      expect(nextAuthLogger).toHaveProperty('error');
      expect(nextAuthLogger).toHaveProperty('debug');
    });
  });

  describe('warn', () => {
    it('should log warning with correct format and URL', () => {
      const warningCode: NextAuthWarningCode = 'debug-enabled';
      nextAuthLogger.warn(warningCode);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'warn',
        message:
          '[auth][warn][debug-enabled] Read more: https://warnings.authjs.dev#debug-enabled',
        code: 'debug-enabled',
        url: 'https://warnings.authjs.dev#debug-enabled',
        timestamp: expect.any(String),
        source: 'next-auth',
      });
    });

    it('should handle all warning codes', () => {
      const warningCodes: NextAuthWarningCode[] = [
        'debug-enabled',
        'csrf-disabled',
        'experimental-webauthn',
        'env-url-basepath-redundant',
        'env-url-basepath-mismatch',
      ];

      warningCodes.forEach(code => {
        vi.clearAllMocks();
        nextAuthLogger.warn(code);

        expect(mockFimidxLogger.log).toHaveBeenCalledWith({
          level: 'warn',
          message: `[auth][warn][${code}] Read more: https://warnings.authjs.dev#${code}`,
          code,
          url: `https://warnings.authjs.dev#${code}`,
          timestamp: expect.any(String),
          source: 'next-auth',
        });
      });
    });
  });

  describe('error', () => {
    it('should log error with basic error information', () => {
      const error = new Error('Test error message');
      nextAuthLogger.error(error);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'error',
        message: '[auth][error] Error: Test error message',
        error: {
          name: 'Error',
          message: 'Test error message',
          stack: expect.any(String),
        },
        timestamp: expect.any(String),
        source: 'next-auth',
      });
    });

    it('should handle custom error types', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const customError = new CustomError('Custom error message');
      nextAuthLogger.error(customError);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'error',
        message: '[auth][error] CustomError: Custom error message',
        error: {
          name: 'CustomError',
          message: 'Custom error message',
          stack: expect.any(String),
        },
        timestamp: expect.any(String),
        source: 'next-auth',
      });
    });

    it('should handle errors without stack trace', () => {
      const error = new Error('Test error');
      delete (error as any).stack;
      nextAuthLogger.error(error);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'error',
        message: '[auth][error] Error: Test error',
        error: {
          name: 'Error',
          message: 'Test error',
          stack: undefined,
        },
        timestamp: expect.any(String),
        source: 'next-auth',
      });
    });

    it('should handle error with cause property', () => {
      const causeError = new Error('Cause error');
      const mainError = new Error('Main error');
      (mainError as any).cause = {
        err: causeError,
        additionalData: 'some data',
        code: 500,
      };

      nextAuthLogger.error(mainError);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'error',
        message: '[auth][error] Error: Main error',
        error: {
          name: 'Error',
          message: 'Main error',
          stack: expect.any(String),
        },
        cause: {
          name: 'Error',
          message: 'Cause error',
          stack: expect.any(String),
        },
        causeData: {
          additionalData: 'some data',
          code: 500,
        },
        timestamp: expect.any(String),
        source: 'next-auth',
      });
    });

    it('should handle error with cause but no err property', () => {
      const mainError = new Error('Main error');
      (mainError as any).cause = {
        message: 'Cause message',
        code: 500,
      };

      nextAuthLogger.error(mainError);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'error',
        message: '[auth][error] Error: Main error',
        error: {
          name: 'Error',
          message: 'Main error',
          stack: expect.any(String),
        },
        timestamp: expect.any(String),
        source: 'next-auth',
      });
    });

    it('should handle error with cause but err is not an Error', () => {
      const mainError = new Error('Main error');
      (mainError as any).cause = {
        err: 'not an error object',
        code: 500,
      };

      nextAuthLogger.error(mainError);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'error',
        message: '[auth][error] Error: Main error',
        error: {
          name: 'Error',
          message: 'Main error',
          stack: expect.any(String),
        },
        timestamp: expect.any(String),
        source: 'next-auth',
      });
    });

    it('should handle error with empty cause data', () => {
      const causeError = new Error('Cause error');
      const mainError = new Error('Main error');
      (mainError as any).cause = {
        err: causeError,
      };

      nextAuthLogger.error(mainError);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'error',
        message: '[auth][error] Error: Main error',
        error: {
          name: 'Error',
          message: 'Main error',
          stack: expect.any(String),
        },
        cause: {
          name: 'Error',
          message: 'Cause error',
          stack: expect.any(String),
        },
        timestamp: expect.any(String),
        source: 'next-auth',
      });
    });
  });

  describe('debug', () => {
    it('should log debug message without metadata', () => {
      nextAuthLogger.debug('Debug message');

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'debug',
        message: '[auth][debug]: Debug message',
        timestamp: expect.any(String),
        source: 'next-auth',
      });
    });

    it('should log debug message with metadata', () => {
      const metadata = {
        userId: '123',
        sessionId: 'abc',
        provider: 'google',
      };

      nextAuthLogger.debug('Debug message with metadata', metadata);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'debug',
        message: '[auth][debug]: Debug message with metadata',
        metadata,
        timestamp: expect.any(String),
        source: 'next-auth',
      });
    });

    it('should handle undefined metadata', () => {
      nextAuthLogger.debug('Debug message', undefined);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'debug',
        message: '[auth][debug]: Debug message',
        timestamp: expect.any(String),
        source: 'next-auth',
      });
    });

    it('should handle null metadata', () => {
      nextAuthLogger.debug('Debug message', null);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'debug',
        message: '[auth][debug]: Debug message',
        metadata: null,
        timestamp: expect.any(String),
        source: 'next-auth',
      });
    });

    it('should handle complex metadata objects', () => {
      const metadata = {
        user: {
          id: '123',
          email: 'test@example.com',
        },
        session: {
          id: 'session-123',
          expires: new Date('2023-12-31'),
        },
        request: {
          method: 'POST',
          url: '/api/auth/signin',
          headers: {
            'user-agent': 'test-agent',
          },
        },
      };

      nextAuthLogger.debug('Complex debug message', metadata);

      expect(mockFimidxLogger.log).toHaveBeenCalledWith({
        level: 'debug',
        message: '[auth][debug]: Complex debug message',
        metadata,
        timestamp: expect.any(String),
        source: 'next-auth',
      });
    });
  });

  describe('interface compliance', () => {
    it('should implement IFimidxNextAuthLogger interface', () => {
      // This test ensures the class implements all required methods
      expect(typeof nextAuthLogger.warn).toBe('function');
      expect(typeof nextAuthLogger.error).toBe('function');
      expect(typeof nextAuthLogger.debug).toBe('function');
    });

    it('should accept correct parameter types', () => {
      // Test that methods accept the correct parameter types
      const warningCode: NextAuthWarningCode = 'debug-enabled';
      const error = new Error('Test error');
      const metadata = {test: 'data'};

      // These should not throw type errors
      expect(() => nextAuthLogger.warn(warningCode)).not.toThrow();
      expect(() => nextAuthLogger.error(error)).not.toThrow();
      expect(() => nextAuthLogger.debug('message', metadata)).not.toThrow();
    });
  });

  describe('timestamp consistency', () => {
    it('should use consistent timestamp format', () => {
      const fixedDate = new Date('2023-01-01T00:00:00.000Z');
      vi.setSystemTime(fixedDate);

      nextAuthLogger.warn('debug-enabled');
      nextAuthLogger.error(new Error('test'));
      nextAuthLogger.debug('test message');

      const logCalls = mockFimidxLogger.log.mock.calls;
      logCalls.forEach((call: any) => {
        expect(call[0].timestamp).toBe('2023-01-01T00:00:00.000Z');
      });

      vi.useRealTimers();
    });
  });

  describe('source identification', () => {
    it('should always include next-auth as source', () => {
      nextAuthLogger.warn('debug-enabled');
      nextAuthLogger.error(new Error('test'));
      nextAuthLogger.debug('test message');

      const logCalls = mockFimidxLogger.log.mock.calls;
      logCalls.forEach((call: any) => {
        expect(call[0].source).toBe('next-auth');
      });
    });
  });
});

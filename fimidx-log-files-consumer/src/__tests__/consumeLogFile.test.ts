import {FimidxConsoleLikeLogger} from 'fimidx';
import * as fs from 'fs/promises';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {consumeLogFile, IConsumeLogFileInput} from '../consumeLogFile.js';
import {ILogFileConsumptionEntry} from '../types.js';

// Mock fs module
vi.mock('fs/promises');

// Mock FimidxConsoleLikeLogger
vi.mock('fimidx');

describe('consumeLogFiles', () => {
  let mockFileHandle: any;
  let mockLogger: any;
  let mockFileStats: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock file handle
    mockFileHandle = {
      read: vi.fn(),
      close: vi.fn(),
    };

    // Setup mock logger
    mockLogger = {
      log: vi.fn(),
      flush: vi.fn(),
    };

    // Setup mock file stats
    mockFileStats = {
      mtime: {
        getTime: vi.fn().mockReturnValue(1234567890000), // Mock timestamp
      },
    };

    // Setup fs.open mock
    vi.mocked(fs.open).mockResolvedValue(mockFileHandle);

    // Setup fs.stat mock
    vi.mocked(fs.stat).mockResolvedValue(mockFileStats);

    // Setup FimidxConsoleLikeLogger mock
    vi.mocked(FimidxConsoleLikeLogger).mockImplementation(() => mockLogger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should process single line log entries correctly', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/log.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    const lastConsumptionEntry: ILogFileConsumptionEntry = {
      path: '/test/log.txt',
      startPosition: 0,
      lastModified: 1234567890000,
    };

    // Mock file content: "line1\nline2\n"
    mockFileHandle.read
      .mockImplementationOnce(
        async (
          buffer: Buffer,
          offset: number,
          length: number,
          position: number,
        ) => {
          const content = 'line1\nline2\n';
          buffer.write(content, offset, 'utf8');
          return {bytesRead: content.length};
        },
      )
      .mockResolvedValueOnce({bytesRead: 0}); // End of file

    const result = await consumeLogFile(input, lastConsumptionEntry);

    expect(fs.stat).toHaveBeenCalledWith('/test/log.txt');
    expect(fs.open).toHaveBeenCalledWith('/test/log.txt', 'r');
    expect(FimidxConsoleLikeLogger).toHaveBeenCalledWith({
      projectId: 'test-project',
      clientToken: 'test-token',
      serverURL: undefined,
      metadata: {source: 'test'},
    });
    expect(mockLogger.log).toHaveBeenCalledWith('line1');
    expect(mockLogger.log).toHaveBeenCalledWith('line2');
    expect(mockFileHandle.close).toHaveBeenCalled();
    expect(mockLogger.flush).toHaveBeenCalled();
    expect(result).toEqual({endPosition: 12}); // Position after "line1\nline2\n"
  });

  it('should process multi-line log entries correctly', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/log.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    const lastConsumptionEntry: ILogFileConsumptionEntry = {
      path: '/test/log.txt',
      startPosition: 0,
      lastModified: 1234567890000,
    };

    // Mock file content: "error: something went wrong\n  at line 10\n  at line 20\ninfo: success\n"
    const multiLineLog =
      'error: something went wrong\n  at line 10\n  at line 20\ninfo: success\n';
    mockFileHandle.read
      .mockImplementationOnce(
        async (
          buffer: Buffer,
          offset: number,
          length: number,
          position: number,
        ) => {
          buffer.write(multiLineLog, offset, 'utf8');
          return {bytesRead: multiLineLog.length};
        },
      )
      .mockResolvedValueOnce({bytesRead: 0});

    const result = await consumeLogFile(input, lastConsumptionEntry);

    expect(mockLogger.log).toHaveBeenCalledWith(
      'error: something went wrong\n  at line 10\n  at line 20',
    );
    expect(mockLogger.log).toHaveBeenCalledWith('info: success');
    expect(result).toEqual({endPosition: multiLineLog.length}); // Position after the entire content
  });

  it('should handle incomplete lines at buffer boundaries', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/log.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    const lastConsumptionEntry: ILogFileConsumptionEntry = {
      path: '/test/log.txt',
      startPosition: 0,
      lastModified: 1234567890000,
    };

    // First buffer ends with incomplete line
    mockFileHandle.read
      .mockImplementationOnce(
        async (
          buffer: Buffer,
          offset: number,
          length: number,
          position: number,
        ) => {
          const content = 'line1\nli';
          buffer.write(content, offset, 'utf8');
          return {bytesRead: content.length};
        },
      )
      .mockImplementationOnce(
        async (
          buffer: Buffer,
          offset: number,
          length: number,
          position: number,
        ) => {
          const content = 'ne2\n';
          buffer.write(content, offset, 'utf8');
          return {bytesRead: content.length};
        },
      )
      .mockResolvedValueOnce({bytesRead: 0});

    const result = await consumeLogFile(input, lastConsumptionEntry);

    expect(mockLogger.log).toHaveBeenCalledWith('line1');
    // line2 is incomplete, so it shouldn't be logged
    expect(mockLogger.log).toHaveBeenCalledTimes(1);
    expect(result).toEqual({endPosition: 6}); // Position after "line1\n"
  });

  it('should handle empty file', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/empty.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    const lastConsumptionEntry: ILogFileConsumptionEntry = {
      path: '/test/empty.txt',
      startPosition: 0,
      lastModified: 1234567890000,
    };

    mockFileHandle.read.mockResolvedValueOnce({bytesRead: 0});

    const result = await consumeLogFile(input, lastConsumptionEntry);

    expect(mockLogger.log).not.toHaveBeenCalled();
    expect(result).toEqual({endPosition: 0});
  });

  it('should handle file with only one incomplete line', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/incomplete.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    const lastConsumptionEntry: ILogFileConsumptionEntry = {
      path: '/test/incomplete.txt',
      startPosition: 0,
      lastModified: 1234567890000,
    };

    // File contains only "incomplete line" without newline
    mockFileHandle.read
      .mockResolvedValueOnce({bytesRead: 15}) // "incomplete line"
      .mockResolvedValueOnce({bytesRead: 0});

    const result = await consumeLogFile(input, lastConsumptionEntry);

    expect(mockLogger.log).not.toHaveBeenCalled();
    expect(result).toEqual({endPosition: 0});
  });

  it('should handle startPosition greater than 0', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/log.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    const lastConsumptionEntry: ILogFileConsumptionEntry = {
      path: '/test/log.txt',
      startPosition: 10,
      lastModified: 1234567890000,
    };

    mockFileHandle.read
      .mockImplementationOnce(
        async (
          buffer: Buffer,
          offset: number,
          length: number,
          position: number,
        ) => {
          const content = 'line2\n';
          buffer.write(content, offset, 'utf8');
          return {bytesRead: content.length};
        },
      )
      .mockResolvedValueOnce({bytesRead: 0});

    const result = await consumeLogFile(input, lastConsumptionEntry);

    expect(mockFileHandle.read).toHaveBeenCalledWith(
      expect.any(Buffer),
      0,
      8192,
      10,
    );
    expect(mockLogger.log).toHaveBeenCalledWith('line2');
    expect(result).toEqual({endPosition: 16});
  });

  it('should handle mixed single and multi-line entries', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/mixed.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    const lastConsumptionEntry: ILogFileConsumptionEntry = {
      path: '/test/mixed.txt',
      startPosition: 0,
      lastModified: 1234567890000,
    };

    const mixedContent =
      'single line\nmulti:\n  line1\n  line2\nanother single\n';
    mockFileHandle.read
      .mockImplementationOnce(
        async (
          buffer: Buffer,
          offset: number,
          length: number,
          position: number,
        ) => {
          buffer.write(mixedContent, offset, 'utf8');
          return {bytesRead: mixedContent.length};
        },
      )
      .mockResolvedValueOnce({bytesRead: 0});

    const result = await consumeLogFile(input, lastConsumptionEntry);

    expect(mockLogger.log).toHaveBeenCalledWith('single line');
    expect(mockLogger.log).toHaveBeenCalledWith('multi:\n  line1\n  line2');
    expect(mockLogger.log).toHaveBeenCalledWith('another single');
    expect(result).toEqual({endPosition: mixedContent.length});
  });

  it('should handle tabs as indentation', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/tabs.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    const lastConsumptionEntry: ILogFileConsumptionEntry = {
      path: '/test/tabs.txt',
      startPosition: 0,
      lastModified: 1234567890000,
    };

    const tabContent = 'error:\n\tat function1\n\tat function2\ninfo: done\n';
    mockFileHandle.read
      .mockImplementationOnce(
        async (
          buffer: Buffer,
          offset: number,
          length: number,
          position: number,
        ) => {
          buffer.write(tabContent, offset, 'utf8');
          return {bytesRead: tabContent.length};
        },
      )
      .mockResolvedValueOnce({bytesRead: 0});

    const result = await consumeLogFile(input, lastConsumptionEntry);

    expect(mockLogger.log).toHaveBeenCalledWith(
      'error:\n\tat function1\n\tat function2',
    );
    expect(mockLogger.log).toHaveBeenCalledWith('info: done');
    expect(result).toEqual({endPosition: tabContent.length});
  });

  it('should handle large files with multiple buffer reads', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/large.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    const lastConsumptionEntry: ILogFileConsumptionEntry = {
      path: '/test/large.txt',
      startPosition: 0,
      lastModified: 1234567890000,
    };

    // First buffer: full 8KB
    const buffer1 = 'line1\n'.repeat(1000); // ~6KB
    const buffer2 = 'line2\n'.repeat(500); // ~3KB
    const buffer3 = 'final\n'; // ~6 bytes

    mockFileHandle.read
      .mockImplementationOnce(
        async (
          buffer: Buffer,
          offset: number,
          length: number,
          position: number,
        ) => {
          buffer.write(buffer1, offset, 'utf8');
          return {bytesRead: 8192}; // Full buffer
        },
      )
      .mockImplementationOnce(
        async (
          buffer: Buffer,
          offset: number,
          length: number,
          position: number,
        ) => {
          buffer.write(buffer2, offset, 'utf8');
          return {bytesRead: 3000}; // Partial buffer
        },
      )
      .mockImplementationOnce(
        async (
          buffer: Buffer,
          offset: number,
          length: number,
          position: number,
        ) => {
          buffer.write(buffer3, offset, 'utf8');
          return {bytesRead: 6}; // Small final buffer
        },
      )
      .mockResolvedValueOnce({bytesRead: 0});

    const result = await consumeLogFile(input, lastConsumptionEntry);

    expect(mockFileHandle.read).toHaveBeenCalledTimes(2);
    expect(mockLogger.log).toHaveBeenCalled();
    expect(mockFileHandle.close).toHaveBeenCalled();
    expect(mockLogger.flush).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/error.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    const lastConsumptionEntry: ILogFileConsumptionEntry = {
      path: '/test/error.txt',
      startPosition: 0,
      lastModified: 1234567890000,
    };

    mockFileHandle.read.mockRejectedValue(new Error('File read error'));

    await expect(consumeLogFile(input, lastConsumptionEntry)).rejects.toThrow(
      'File read error',
    );
    expect(mockFileHandle.close).toHaveBeenCalled();
    expect(mockLogger.flush).toHaveBeenCalled();
  });

  it('should handle logger errors gracefully', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/log.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    const lastConsumptionEntry: ILogFileConsumptionEntry = {
      path: '/test/log.txt',
      startPosition: 0,
      lastModified: 1234567890000,
    };

    mockFileHandle.read
      .mockImplementationOnce(
        async (
          buffer: Buffer,
          offset: number,
          length: number,
          position: number,
        ) => {
          const content = 'line1\nline2';
          buffer.write(content, offset, 'utf8');
          return {bytesRead: content.length};
        },
      )
      .mockResolvedValueOnce({bytesRead: 0});

    mockLogger.log.mockRejectedValue(new Error('Logger error'));

    await expect(consumeLogFile(input, lastConsumptionEntry)).rejects.toThrow(
      'Logger error',
    );
    expect(mockFileHandle.close).toHaveBeenCalled();
    expect(mockLogger.flush).toHaveBeenCalled();
  });

  it('should return early if file has not changed and not enough time has passed', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/log.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    const lastConsumptionEntry: ILogFileConsumptionEntry = {
      path: '/test/log.txt',
      startPosition: 100,
      lastModified: 1234567890000,
    };

    // Mock current time to be close to last modified time
    const mockNow = 1234567890000 + 2000; // 2 seconds later
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);

    const result = await consumeLogFile(input, lastConsumptionEntry);

    expect(result).toEqual({endPosition: 100});
    expect(fs.open).not.toHaveBeenCalled();
    expect(FimidxConsoleLikeLogger).not.toHaveBeenCalled();
  });

  it('should process file if enough time has passed since last modification', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/log.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    const lastConsumptionEntry: ILogFileConsumptionEntry = {
      path: '/test/log.txt',
      startPosition: 100,
      lastModified: 1234567890000,
    };

    // Mock current time to be far from last modified time
    const mockNow = 1234567890000 + 10000; // 10 seconds later
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);

    mockFileHandle.read.mockResolvedValueOnce({bytesRead: 0});

    const result = await consumeLogFile(input, lastConsumptionEntry);

    expect(fs.open).toHaveBeenCalled();
    expect(FimidxConsoleLikeLogger).toHaveBeenCalled();
    expect(result).toEqual({endPosition: 100});
  });

  it('should process file if lastConsumptionEntry is undefined', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/log.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    mockFileHandle.read.mockResolvedValueOnce({bytesRead: 0});

    const result = await consumeLogFile(input, undefined);

    expect(fs.open).toHaveBeenCalled();
    expect(FimidxConsoleLikeLogger).toHaveBeenCalled();
    expect(result).toEqual({endPosition: 0});
  });

  it('should process file if lastConsumptionEntry path is different', async () => {
    const input: IConsumeLogFileInput = {
      path: '/test/log.txt',
      metadata: {source: 'test'},
      projectId: 'test-project',
      clientToken: 'test-token',
    };

    const lastConsumptionEntry: ILogFileConsumptionEntry = {
      path: '/test/different.txt',
      startPosition: 100,
      lastModified: 1234567890000,
    };

    mockFileHandle.read.mockResolvedValueOnce({bytesRead: 0});

    const result = await consumeLogFile(input, lastConsumptionEntry);

    expect(fs.open).toHaveBeenCalled();
    expect(FimidxConsoleLikeLogger).toHaveBeenCalled();
    expect(result).toEqual({endPosition: 0});
  });
});

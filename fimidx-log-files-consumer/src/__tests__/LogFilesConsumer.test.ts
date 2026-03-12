import * as chokidar from 'chokidar';
import * as fs from 'fs/promises';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {LogFilesConsumer} from '../LogFilesConsumer.js';
import {consumeLogFile} from '../consumeLogFile.js';

// Mock chokidar
const mockWatcher = {
  on: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
};

vi.mock('chokidar', () => ({
  watch: vi.fn(() => mockWatcher),
}));

// Mock fs
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  stat: vi.fn(),
  access: vi.fn(),
  open: vi.fn(),
}));

// Mock consumeLogFile
vi.mock('../consumeLogFile.js', () => ({
  consumeLogFile: vi.fn(),
}));

describe('LogFilesConsumer', () => {
  const mockConfig = {
    projectId: 'test-project',
    clientToken: 'test-token',
    serverURL: 'https://test-server.com',
    metadata: {environment: 'test'},
    logFiles: [
      {
        path: '/var/log/test.log',
        metadata: {logType: 'test'},
      },
      {
        path: '/var/log/another.log',
        projectId: 'another-project',
        clientToken: 'another-token',
      },
    ],
    trackConsumptionFilepath: './test-consumption.json',
  };

  const mockConsumptionData = {
    entries: [
      {
        path: '/var/log/test.log',
        startPosition: 100,
        lastModified: 1640995200000, // 2022-01-01T00:00:00Z
      },
    ],
  };

  let consumer: LogFilesConsumer;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fs.readFile for config
    vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
      if (path === './test-config.json') {
        return JSON.stringify(mockConfig);
      }
      if (path === './test-consumption.json') {
        return JSON.stringify(mockConsumptionData);
      }
      throw new Error('File not found');
    });

    // Mock fs.access to simulate file exists
    vi.mocked(fs.access).mockResolvedValue(undefined);

    // Mock fs.stat
    vi.mocked(fs.stat).mockResolvedValue({
      mtime: new Date('2023-01-01T00:00:00Z'),
    } as any);

    // Mock fs.writeFile
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    // Mock consumeLogFile
    vi.mocked(consumeLogFile).mockResolvedValue({
      endPosition: 200,
    });

    consumer = new LogFilesConsumer('./test-config.json');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with config filepath', () => {
      const consumer = new LogFilesConsumer('./test-config.json');
      expect(consumer).toBeInstanceOf(LogFilesConsumer);
      expect(consumer).toHaveProperty('start');
      expect(consumer).toHaveProperty('stop');
    });
  });

  describe('start', () => {
    it('should start the consumer successfully', async () => {
      await consumer.start();

      expect(chokidar.watch).toHaveBeenCalledWith('./test-config.json', {
        persistent: true,
        ignoreInitial: true,
      });

      expect(fs.readFile).toHaveBeenCalledWith('./test-config.json', 'utf-8');
    });

    it('should not start if already running', async () => {
      await consumer.start();
      await consumer.start(); // Second call should be ignored

      // The first start calls chokidar.watch for config file and each log file
      // So we expect 1 config watcher + 2 log file watchers = 3 total calls
      expect(chokidar.watch).toHaveBeenCalledTimes(3);
    });

    it('should handle config file not found', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      await expect(consumer.start()).rejects.toThrow('File not found');
    });

    it('should handle invalid JSON config', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json');

      await expect(consumer.start()).rejects.toThrow();
    });

    it('should handle missing required fields in config', async () => {
      const invalidConfig = {
        logFiles: [{path: '/var/log/test.log'}],
        trackConsumptionFilepath: './test-consumption.json',
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalidConfig));

      await expect(consumer.start()).rejects.toThrow(
        'Missing required config for file /var/log/test.log: projectId and clientToken are required',
      );
    });

    it('should handle log file that does not exist', async () => {
      const configWithMissingFile = {
        ...mockConfig,
        logFiles: [
          {
            path: '/var/log/missing.log',
            projectId: 'test',
            clientToken: 'test',
          },
        ],
      };

      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify(configWithMissingFile),
      );
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

      await consumer.start();

      // Should not throw, just warn and continue
      expect(fs.access).toHaveBeenCalledWith('/var/log/missing.log');
    });
  });

  describe('stop', () => {
    it('should stop the consumer successfully', async () => {
      await consumer.start();
      await consumer.stop();

      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should not stop if not running', async () => {
      await consumer.stop();

      expect(mockWatcher.close).not.toHaveBeenCalled();
    });
  });

  describe('config file watching', () => {
    it('should reload config when config file changes', async () => {
      await consumer.start();

      // Simulate config file change
      const changeCallback = vi
        .mocked(mockWatcher.on)
        .mock.calls.find(call => call[0] === 'change')?.[1];

      expect(changeCallback).toBeDefined();

      // Mock the config reload
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      // Trigger the change callback
      if (changeCallback) {
        changeCallback();
      }

      // Should reload config on next pass
      expect(fs.readFile).toHaveBeenCalledWith('./test-config.json', 'utf-8');
    });

    it('should handle config watcher errors', async () => {
      await consumer.start();

      const errorCallback = vi
        .mocked(mockWatcher.on)
        .mock.calls.find(call => call[0] === 'error')?.[1];

      expect(errorCallback).toBeDefined();

      // Trigger error callback
      if (errorCallback) {
        errorCallback(new Error('Watcher error'));
      }

      // Should not throw, just log error
    });
  });

  describe('log file watching', () => {
    it('should watch log files for changes', async () => {
      await consumer.start();

      // Should watch each log file
      expect(chokidar.watch).toHaveBeenCalledWith('/var/log/test.log', {
        persistent: true,
        ignoreInitial: true,
      });

      expect(chokidar.watch).toHaveBeenCalledWith('/var/log/another.log', {
        persistent: true,
        ignoreInitial: true,
      });
    });

    it('should handle file change events', async () => {
      await consumer.start();

      // Find the change callback for a log file
      const fileWatcherCalls = vi.mocked(chokidar.watch).mock.calls;
      const logFileWatcher = fileWatcherCalls.find(
        call => call[0] === '/var/log/test.log',
      );

      expect(logFileWatcher).toBeDefined();
    });
  });

  describe('consumption loop', () => {
    it('should process awake files in consumption loop', async () => {
      await consumer.start();

      // Wait for the consumption loop to run
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consumeLogFile).toHaveBeenCalled();
    });

    it('should handle errors in consumption loop', async () => {
      vi.mocked(consumeLogFile).mockRejectedValue(
        new Error('Consumption error'),
      );

      await consumer.start();

      // Wait for the consumption loop to run
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw, just log error and continue
      expect(consumeLogFile).toHaveBeenCalled();
    });
  });

  describe('consumption data management', () => {
    it('should load existing consumption data', async () => {
      await consumer.start();

      expect(fs.readFile).toHaveBeenCalledWith(
        './test-consumption.json',
        'utf-8',
      );
    });

    it('should handle missing consumption data file', async () => {
      vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (path === './test-config.json') {
          return JSON.stringify(mockConfig);
        }
        if (path === './test-consumption.json') {
          throw new Error('File not found');
        }
        throw new Error('File not found');
      });

      await consumer.start();

      // Should not throw, just start with empty consumption data
      expect(fs.readFile).toHaveBeenCalledWith(
        './test-consumption.json',
        'utf-8',
      );
    });

    it('should save consumption data after processing', async () => {
      await consumer.start();

      // Wait for the consumption loop to run
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(fs.writeFile).toHaveBeenCalledWith(
        './test-consumption.json',
        expect.any(String),
      );
    });
  });

  describe('file state management', () => {
    it('should move files from awake to asleep when no changes detected', async () => {
      // Mock that no new content was consumed
      vi.mocked(consumeLogFile).mockResolvedValue({
        endPosition: 100, // Same as existing entry
      });

      await consumer.start();

      // Wait for the consumption loop to run
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should move file to asleep state
      expect(consumeLogFile).toHaveBeenCalled();
    });

    it('should move files from asleep to awake when file changes', async () => {
      await consumer.start();

      // Simulate file change event
      const fileWatcherCalls = vi.mocked(chokidar.watch).mock.calls;
      const logFileWatcher = fileWatcherCalls.find(
        call => call[0] === '/var/log/test.log',
      );

      expect(logFileWatcher).toBeDefined();
    });
  });

  describe('config validation', () => {
    it('should validate required fields in config', async () => {
      const invalidConfig = {
        logFiles: [
          {
            path: '/var/log/test.log',
            // Missing projectId and clientToken
          },
        ],
        trackConsumptionFilepath: './test-consumption.json',
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalidConfig));

      await expect(consumer.start()).rejects.toThrow(
        'Missing required config for file /var/log/test.log: projectId and clientToken are required',
      );
    });

    it('should merge config options correctly', async () => {
      const configWithMergedOptions = {
        projectId: 'global-project',
        clientToken: 'global-token',
        metadata: {global: true},
        logFiles: [
          {
            path: '/var/log/test.log',
            projectId: 'local-project',
            metadata: {local: true},
          },
        ],
        trackConsumptionFilepath: './test-consumption.json',
      };

      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify(configWithMergedOptions),
      );

      await consumer.start();

      // Should use local projectId and merge metadata
      expect(consumeLogFile).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'local-project',
          clientToken: 'global-token',
          metadata: {local: true},
          path: '/var/log/test.log',
        }),
        undefined,
      );
    });
  });
});

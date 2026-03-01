import * as fs from 'fs/promises';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {startLogFilesConsumer} from '../index.js';

// Mock chokidar
vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(),
    })),
  },
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

// Mock LogFilesConsumer
vi.mock('../LogFilesConsumer.js', () => ({
  LogFilesConsumer: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  })),
  ILogFilesConsumer: vi.fn(),
}));

describe('startLogFilesConsumer', () => {
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
    ],
    trackConsumptionFilepath: './test-consumption.json',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fs.readFile for config
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

    // Mock fs.access to simulate file exists
    vi.mocked(fs.access).mockResolvedValue(undefined);

    // Mock fs.stat
    vi.mocked(fs.stat).mockResolvedValue({
      mtime: new Date('2023-01-01T00:00:00Z'),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start and stop correctly', async () => {
    const consumer = await startLogFilesConsumer('./test-config.json');

    expect(consumer).toBeDefined();
    expect(typeof consumer.start).toBe('function');
    expect(typeof consumer.stop).toBe('function');

    await consumer.stop();
  });

  it('should handle missing config file', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

    await expect(
      startLogFilesConsumer('./missing-config.json'),
    ).rejects.toThrow();
  });

  it('should handle invalid config', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('invalid json');

    await expect(
      startLogFilesConsumer('./invalid-config.json'),
    ).rejects.toThrow();
  });

  it('should handle missing required fields', async () => {
    const invalidConfig = {
      logFiles: [{path: '/var/log/test.log'}],
      trackConsumptionFilepath: './test-consumption.json',
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalidConfig));

    await expect(
      startLogFilesConsumer('./invalid-config.json'),
    ).rejects.toThrow();
  });
});

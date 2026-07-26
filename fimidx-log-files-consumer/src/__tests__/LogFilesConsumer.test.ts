import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  loadConsumptionData,
  saveConsumptionData,
} from '../checkpointStore.js';
import {LogFilesConsumer} from '../LogFilesConsumer.js';
import {getRuntimePaths} from '../runtimePaths.js';
import {kDefaultPassIntervalMs} from '../types.js';

const ingestLogs = vi.fn();

// Records the chokidar 'change' handler per watched path so tests can simulate
// the filesystem waking a sleeping file.
const changeHandlers = new Map<string, () => void>();

vi.mock('fimidx', () => ({
  FimidxEndpoints: vi.fn().mockImplementation(() => ({
    logs: {
      ingestLogs,
    },
  })),
}));

vi.mock('chokidar', () => ({
  watch: vi.fn((filepath: string) => ({
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'change') {
        changeHandlers.set(filepath, () => handler());
      }
    }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

function fireChange(filepath: string): void {
  const handler = changeHandlers.get(filepath);
  if (!handler) {
    throw new Error(`No chokidar change handler registered for ${filepath}`);
  }
  handler();
}

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 1000,
): Promise<void> {
  const start = Date.now();
  while (!(await predicate())) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise(r => setTimeout(r, 10));
  }
}

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'fimidx-consumer-orch-'));
}

function ingestedMessages(): string[] {
  return ingestLogs.mock.calls.flatMap(call => {
    const body = call[0] as {logs: {message: string}[]};
    return body.logs.map(log => log.message);
  });
}

describe('checkpointStore', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await makeTempDir();
  });

  afterEach(async () => {
    await fs.rm(tempDir, {recursive: true, force: true});
  });

  it('atomically saves and loads checkpoints including new fields', async () => {
    const filePath = path.join(tempDir, 'consumption.json');
    await saveConsumptionData(filePath, {
      entries: [
        {
          path: '/var/log/a.log',
          startPosition: 12,
          lastModified: 100,
          size: 12,
          dev: 1,
          ino: 2,
        },
      ],
    });

    const loaded = await loadConsumptionData(filePath);
    expect(loaded.entries[0]).toMatchObject({
      path: '/var/log/a.log',
      startPosition: 12,
      size: 12,
      dev: 1,
      ino: 2,
    });
  });

  it('loads legacy checkpoints without size/dev/ino', async () => {
    const filePath = path.join(tempDir, 'legacy.json');
    await fs.writeFile(
      filePath,
      JSON.stringify({
        entries: [
          {path: '/a.log', startPosition: 3, lastModified: 1},
        ],
      }),
    );

    const loaded = await loadConsumptionData(filePath);
    expect(loaded.entries[0].startPosition).toBe(3);
  });
});

describe('LogFilesConsumer', () => {
  let tempDir: string;
  let logPath: string;
  let configPath: string;
  let trackPath: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    changeHandlers.clear();
    ingestLogs.mockResolvedValue(undefined);
    tempDir = await makeTempDir();
    logPath = path.join(tempDir, 'app.log');
    configPath = path.join(tempDir, 'config.json');
    trackPath = getRuntimePaths(tempDir).consumptionFilepath;
    await fs.writeFile(logPath, 'one\ntwo\n');
  });

  afterEach(async () => {
    vi.useRealTimers();
    await fs.rm(tempDir, {recursive: true, force: true});
  });

  async function writeConfig(extra: Record<string, unknown> = {}) {
    await fs.writeFile(
      configPath,
      JSON.stringify({
        projectId: 'test-project',
        clientToken: 'test-token',
        workingDir: tempDir,
        logFiles: [{path: logPath}],
        flushIncompleteAfterMs: 0,
        ...extra,
      }),
    );
  }

  it('ingests logs and persists checkpoints', async () => {
    await writeConfig();
    const consumer = new LogFilesConsumer(configPath);

    // Avoid infinite loop scheduling: stop after first pass settles.
    const startPromise = consumer.start();
    await new Promise(r => setTimeout(r, 50));
    await consumer.stop();
    await startPromise.catch(() => undefined);

    expect(ingestLogs).toHaveBeenCalled();
    const body = ingestLogs.mock.calls[0][0];
    expect(body.projectId).toBe('test-project');
    expect(body.logs.map((l: {message: string}) => l.message)).toEqual([
      'one',
      'two',
    ]);

    const checkpoint = JSON.parse(await fs.readFile(trackPath, 'utf-8'));
    expect(checkpoint.entries[0].startPosition).toBe(
      Buffer.byteLength('one\ntwo\n'),
    );
    expect(checkpoint.entries[0].size).toBeDefined();
    await expect(
      fs.access(getRuntimePaths(tempDir).pidFilepath),
    ).rejects.toMatchObject({code: 'ENOENT'});
  });

  it('keeps running, wakes a sleeping file, and catches up on appended lines', async () => {
    await writeConfig();

    // Fake timers let us fire the next scheduled pass instead of waiting the
    // real 10s interval. Real filesystem/promise work still settles because
    // advanceTimersByTimeAsync flushes microtasks between timers.
    vi.useFakeTimers();
    const consumer = new LogFilesConsumer(configPath);

    // start() awaits the first pass, which consumes the initial content and
    // moves the file to asleep (fully consumed, nothing pending).
    await consumer.start();

    expect(ingestedMessages()).toEqual(['one', 'two']);
    const firstCheckpoint = JSON.parse(await fs.readFile(trackPath, 'utf-8'));
    expect(firstCheckpoint.entries[0].startPosition).toBe(
      Buffer.byteLength('one\ntwo\n'),
    );

    // New lines arrive while the consumer keeps running.
    await fs.appendFile(logPath, 'three\nfour\n');
    ingestLogs.mockClear();

    // chokidar observes the change and wakes the sleeping file...
    fireChange(logPath);
    // ...then the next scheduled pass fires. The pass is detached inside the
    // timer callback, so advance to start it, then let its real filesystem
    // work settle under real timers.
    await vi.advanceTimersByTimeAsync(kDefaultPassIntervalMs);
    vi.useRealTimers();

    const expectedPosition = Buffer.byteLength('one\ntwo\nthree\nfour\n');
    await waitFor(async () => {
      try {
        const cp = JSON.parse(await fs.readFile(trackPath, 'utf-8'));
        return cp.entries[0]?.startPosition === expectedPosition;
      } catch {
        return false;
      }
    });

    expect(ingestedMessages()).toEqual(['three', 'four']);

    await consumer.stop();
  });

  it('does not advance checkpoint when ingest fails', async () => {
    await writeConfig();
    ingestLogs.mockRejectedValue(new Error('boom'));

    const consumer = new LogFilesConsumer(configPath);
    const startPromise = consumer.start();
    await new Promise(r => setTimeout(r, 50));
    await consumer.stop();
    await startPromise.catch(() => undefined);

    const exists = await fs
      .access(trackPath)
      .then(() => true)
      .catch(() => false);

    if (exists) {
      const checkpoint = JSON.parse(await fs.readFile(trackPath, 'utf-8'));
      // Either no entry or still at 0 — never past unsent content.
      const entry = checkpoint.entries.find(
        (e: {path: string}) => e.path === logPath,
      );
      expect(entry?.startPosition ?? 0).toBe(0);
    }
  });

  it('uses env credentials when config omits them', async () => {
    vi.stubEnv('FIMIDX_PROJECT_ID', 'env-project');
    vi.stubEnv('FIMIDX_CLIENT_TOKEN', 'env-token');

    await fs.writeFile(
      configPath,
      JSON.stringify({
        workingDir: tempDir,
        logFiles: [{path: logPath}],
        flushIncompleteAfterMs: 0,
      }),
    );

    const consumer = new LogFilesConsumer(configPath);
    const startPromise = consumer.start();
    await new Promise(r => setTimeout(r, 50));
    await consumer.stop();
    await startPromise.catch(() => undefined);

    expect(ingestLogs).toHaveBeenCalled();
    expect(ingestLogs.mock.calls[0][0].projectId).toBe('env-project');

    vi.unstubAllEnvs();
  });

  it('picks up config changes only after a reload is requested', async () => {
    await writeConfig();
    const consumer = new LogFilesConsumer(configPath);
    await consumer.start();

    const secondLog = path.join(tempDir, 'other.log');
    await fs.writeFile(secondLog, 'three\n');
    await writeConfig({logFiles: [{path: logPath}, {path: secondLog}]});
    ingestLogs.mockClear();

    consumer.requestReload();
    await new Promise(r => setTimeout(r, 100));
    await consumer.stop();

    expect(ingestedMessages()).toEqual(['three']);
  });

  it('keeps the previous config when a reload fails', async () => {
    await writeConfig();
    const consumer = new LogFilesConsumer(configPath);
    await consumer.start();

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await fs.writeFile(configPath, '{not json');
    consumer.requestReload();
    await new Promise(r => setTimeout(r, 100));

    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to reload config, keeping the previous one:',
      expect.anything(),
    );

    // Still running: a subsequent valid reload is applied.
    const secondLog = path.join(tempDir, 'other.log');
    await fs.writeFile(secondLog, 'three\n');
    await writeConfig({logFiles: [{path: logPath}, {path: secondLog}]});
    ingestLogs.mockClear();

    consumer.requestReload();
    await new Promise(r => setTimeout(r, 100));
    await consumer.stop();

    expect(ingestedMessages()).toEqual(['three']);
    errorSpy.mockRestore();
  });

  it('writes the current PID while running and removes it on stop', async () => {
    await writeConfig();
    const runtimePaths = getRuntimePaths(tempDir);
    const logSpy = vi.spyOn(console, 'log');
    const consumer = new LogFilesConsumer(configPath);

    await consumer.start();

    expect(logSpy).toHaveBeenCalledWith(
      `Log files consumer started (PID: ${process.pid})`,
    );
    expect(await fs.readFile(runtimePaths.pidFilepath, 'utf-8')).toBe(
      `${process.pid}\n`,
    );

    await consumer.stop();
    await expect(fs.access(runtimePaths.pidFilepath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
    logSpy.mockRestore();
  });
});

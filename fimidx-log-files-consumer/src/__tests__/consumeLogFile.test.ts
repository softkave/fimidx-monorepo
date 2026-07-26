import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {
  consumeLogFile,
  shouldResetForRotation,
} from '../consumeLogFile.js';
import {LogFileReader} from '../logFileReader.js';
import {IConsumeBatch, ILogFileConsumptionEntry} from '../types.js';

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'fimidx-consumer-'));
}

describe('LogFileReader', () => {
  it('parses duplicate and empty lines with exact byte offsets', () => {
    const reader = new LogFileReader({
      flushIncompleteAfterMs: 0,
      now: () => 10_000,
    });
    reader.reset(0);
    reader.setFileMtime(0);

    const mid = reader.pushChunk(Buffer.from('a\na\n\n'), 0);
    expect(mid).toEqual([
      {message: 'a', endOffset: 2},
      {message: 'a', endOffset: 4},
    ]);

    const finish = reader.finish(true);
    expect(finish.records).toEqual([{message: '', endOffset: 5}]);
    expect(finish.position).toBe(5);
    expect(finish.hasPending).toBe(false);
  });

  it('handles UTF-8 and CRLF with byte-accurate offsets', () => {
    const reader = new LogFileReader({
      flushIncompleteAfterMs: 0,
      now: () => 10_000,
    });
    reader.reset(0);
    reader.setFileMtime(0);
    const content = Buffer.from('café\r\n😀\n', 'utf8');
    const mid = reader.pushChunk(content, 0);
    expect(mid).toEqual([
      {message: 'café', endOffset: Buffer.byteLength('café\r\n', 'utf8')},
    ]);
    const finish = reader.finish(true);
    expect(finish.records).toEqual([
      {message: '😀', endOffset: content.length},
    ]);
    expect(finish.position).toBe(content.length);
  });

  it('folds indented continuations across chunk boundaries', () => {
    const reader = new LogFileReader({
      flushIncompleteAfterMs: 0,
      now: () => 10_000,
    });
    reader.reset(0);
    reader.setFileMtime(0);

    const part1 = Buffer.from('err:\n');
    expect(reader.pushChunk(part1, 0)).toEqual([]);

    const part2 = Buffer.from('  at x\ninfo\n');
    const mid = reader.pushChunk(part2, part1.length);
    expect(mid).toEqual([
      {
        message: 'err:\n  at x',
        endOffset: Buffer.byteLength('err:\n  at x\n', 'utf8'),
      },
    ]);

    const finish = reader.finish(true);
    expect(finish.records).toEqual([
      {message: 'info', endOffset: part1.length + part2.length},
    ]);
  });

  it('carries incomplete UTF-8 sequences across chunks', () => {
    const reader = new LogFileReader({
      flushIncompleteAfterMs: 0,
      now: () => 10_000,
    });
    reader.reset(0);
    reader.setFileMtime(0);

    const full = Buffer.from('😀\n', 'utf8');
    expect(reader.pushChunk(full.subarray(0, 2), 0)).toEqual([]);
    expect(reader.pushChunk(full.subarray(2), 2)).toEqual([]);
    const finish = reader.finish(true);
    expect(finish.records).toEqual([{message: '😀', endOffset: full.length}]);
  });

  it('throws when a record exceeds maxRecordBytes', () => {
    const reader = new LogFileReader({maxRecordBytes: 8});
    reader.reset(0);
    expect(() => reader.pushChunk(Buffer.from('0123456789'), 0)).toThrow(
      /maxRecordBytes/,
    );
  });

  it('does not infinite-loop on lines larger than the read buffer', () => {
    const reader = new LogFileReader({
      maxRecordBytes: 100_000,
      flushIncompleteAfterMs: 0,
      now: () => 10_000,
    });
    reader.reset(0);
    reader.setFileMtime(0);

    const big = 'x'.repeat(20_000);
    const chunk1 = Buffer.from(big.slice(0, 8192));
    const chunk2 = Buffer.from(big.slice(8192) + '\n');
    expect(reader.pushChunk(chunk1, 0)).toEqual([]);
    expect(reader.pushChunk(chunk2, chunk1.length)).toEqual([]);
    const finish = reader.finish(true);
    expect(finish.records).toEqual([
      {message: big, endOffset: big.length + 1},
    ]);
  });

  it('holds pending until quiescence then flushes unterminated trailer', () => {
    let now = 1_000;
    const reader = new LogFileReader({
      flushIncompleteAfterMs: 5_000,
      now: () => now,
    });
    reader.reset(0);
    reader.setFileMtime(1_000);
    expect(reader.pushChunk(Buffer.from('partial'), 0)).toEqual([]);

    now = 2_000;
    expect(reader.finish(true).hasPending).toBe(true);

    now = 7_000;
    const finish = reader.finish(true);
    expect(finish.records).toEqual([{message: 'partial', endOffset: 7}]);
    expect(finish.hasPending).toBe(false);
  });
});

describe('shouldResetForRotation', () => {
  it('resets when file shrinks below checkpoint', () => {
    expect(
      shouldResetForRotation(
        {path: '/a', startPosition: 100, lastModified: 1},
        {size: 50, dev: 1, ino: 1},
      ),
    ).toBe(true);
  });

  it('resets when inode changes', () => {
    expect(
      shouldResetForRotation(
        {path: '/a', startPosition: 10, lastModified: 1, dev: 1, ino: 1},
        {size: 100, dev: 1, ino: 2},
      ),
    ).toBe(true);
  });

  it('does not reset for normal growth', () => {
    expect(
      shouldResetForRotation(
        {path: '/a', startPosition: 10, lastModified: 1, dev: 1, ino: 1},
        {size: 100, dev: 1, ino: 1},
      ),
    ).toBe(false);
  });

  it('does not reset when checkpoint stores number and stats use bigint', () => {
    expect(
      shouldResetForRotation(
        {path: '/a', startPosition: 10, lastModified: 1, dev: 1, ino: 2},
        {size: 100, dev: 1n, ino: 2n},
      ),
    ).toBe(false);
  });
});

describe('consumeLogFile', () => {
  let tempDir: string;
  let logPath: string;

  beforeEach(async () => {
    tempDir = await makeTempDir();
    logPath = path.join(tempDir, 'app.log');
  });

  afterEach(async () => {
    await fs.rm(tempDir, {recursive: true, force: true});
  });

  it('ships lines and advances checkpoint only after successful send', async () => {
    await fs.writeFile(logPath, 'line1\nline2\n');
    const batches: IConsumeBatch[] = [];

    const result = await consumeLogFile(
      {
        path: logPath,
        metadata: {source: 'test'},
        flushIncompleteAfterMs: 0,
        now: () => Date.now() + 10_000,
        sendBatch: async batch => {
          batches.push(batch);
        },
      },
      undefined,
    );

    expect(batches).toHaveLength(1);
    expect(batches[0].records.map(r => r.message)).toEqual(['line1', 'line2']);
    expect(batches[0].records[0]).toMatchObject({
      level: 'log',
      source: 'test',
    });
    expect(result.endPosition).toBe(Buffer.byteLength('line1\nline2\n'));
    expect(result.fullyConsumed).toBe(true);
  });

  it('does not advance past a failed batch', async () => {
    await fs.writeFile(logPath, 'a\nb\nc\n');
    let calls = 0;

    await expect(
      consumeLogFile(
        {
          path: logPath,
          metadata: {},
          batchSize: 1,
          flushIncompleteAfterMs: 0,
          now: () => Date.now() + 10_000,
          sendBatch: async () => {
            calls += 1;
            if (calls === 2) {
              throw new Error('ingest failed');
            }
          },
        },
        undefined,
      ),
    ).rejects.toThrow('ingest failed');

    expect(calls).toBe(2);
  });

  it('retries from last successful batch position', async () => {
    await fs.writeFile(logPath, 'a\nb\nc\n');
    const sent: string[] = [];

    await expect(
      consumeLogFile(
        {
          path: logPath,
          metadata: {},
          batchSize: 1,
          flushIncompleteAfterMs: 0,
          now: () => Date.now() + 10_000,
          sendBatch: async batch => {
            const msg = String(batch.records[0].message);
            if (msg === 'b') {
              throw new Error('fail b');
            }
            sent.push(msg);
          },
        },
        undefined,
      ),
    ).rejects.toThrow('fail b');

    expect(sent).toEqual(['a']);

    const checkpoint: ILogFileConsumptionEntry = {
      path: logPath,
      startPosition: 2,
      lastModified: (await fs.stat(logPath)).mtime.getTime(),
    };

    const sent2: string[] = [];
    const result = await consumeLogFile(
      {
        path: logPath,
        metadata: {},
        batchSize: 1,
        flushIncompleteAfterMs: 0,
        now: () => Date.now() + 10_000,
        sendBatch: async batch => {
          sent2.push(String(batch.records[0].message));
        },
      },
      checkpoint,
    );

    expect(sent2).toEqual(['b', 'c']);
    expect(result.endPosition).toBe(Buffer.byteLength('a\nb\nc\n'));
  });

  it('handles 8KB+ lines without hanging', async () => {
    const big = 'y'.repeat(10_000);
    await fs.writeFile(logPath, `${big}\n`);

    const result = await consumeLogFile(
      {
        path: logPath,
        metadata: {},
        bufferSize: 8192,
        flushIncompleteAfterMs: 0,
        now: () => Date.now() + 10_000,
        sendBatch: async () => undefined,
      },
      undefined,
    );

    expect(result.endPosition).toBe(big.length + 1);
    expect(result.fullyConsumed).toBe(true);
  });

  it('rejects oversized records without advancing', async () => {
    await fs.writeFile(logPath, `${'z'.repeat(50)}\n`);

    await expect(
      consumeLogFile(
        {
          path: logPath,
          metadata: {},
          maxRecordBytes: 10,
          flushIncompleteAfterMs: 0,
          now: () => Date.now() + 10_000,
          sendBatch: async () => undefined,
        },
        undefined,
      ),
    ).rejects.toThrow(/maxRecordBytes/);
  });

  it('holds unterminated trailing line until quiescence', async () => {
    await fs.writeFile(logPath, 'partial');
    const stats = await fs.stat(logPath);
    const mtime = stats.mtime.getTime();
    let now = mtime + 1000;
    const batches: IConsumeBatch[] = [];

    const early = await consumeLogFile(
      {
        path: logPath,
        metadata: {},
        flushIncompleteAfterMs: 5_000,
        now: () => now,
        sendBatch: async batch => {
          batches.push(batch);
        },
      },
      undefined,
    );

    expect(batches).toHaveLength(0);
    expect(early.hasPending).toBe(true);
    expect(early.endPosition).toBe(0);

    now = mtime + 6_000;
    const later = await consumeLogFile(
      {
        path: logPath,
        metadata: {},
        flushIncompleteAfterMs: 5_000,
        now: () => now,
        sendBatch: async batch => {
          batches.push(batch);
        },
      },
      undefined,
    );

    expect(batches).toHaveLength(1);
    expect(batches[0].records[0].message).toBe('partial');
    expect(later.endPosition).toBe(Buffer.byteLength('partial'));
    expect(later.fullyConsumed).toBe(true);
  });

  it('resets on truncation', async () => {
    await fs.writeFile(logPath, 'abcdefghij\n');
    const stats = await fs.stat(logPath);
    const checkpoint: ILogFileConsumptionEntry = {
      path: logPath,
      startPosition: 10,
      lastModified: stats.mtime.getTime(),
      size: stats.size,
      dev: stats.dev,
      ino: stats.ino,
    };

    await fs.writeFile(logPath, 'new\n');
    const batches: IConsumeBatch[] = [];

    const result = await consumeLogFile(
      {
        path: logPath,
        metadata: {},
        flushIncompleteAfterMs: 0,
        now: () => Date.now() + 10_000,
        sendBatch: async batch => {
          batches.push(batch);
        },
      },
      checkpoint,
    );

    expect(result.rotated).toBe(true);
    expect(batches[0].records.map(r => r.message)).toEqual(['new']);
    expect(result.endPosition).toBe(Buffer.byteLength('new\n'));
  });

  it('splits lines across small read buffers', async () => {
    await fs.writeFile(logPath, 'hello\nworld\n');
    const messages: string[] = [];

    await consumeLogFile(
      {
        path: logPath,
        metadata: {},
        bufferSize: 3,
        flushIncompleteAfterMs: 0,
        now: () => Date.now() + 10_000,
        sendBatch: async batch => {
          for (const r of batch.records) {
            messages.push(String(r.message));
          }
        },
      },
      undefined,
    );

    expect(messages).toEqual(['hello', 'world']);
  });
});

import * as fs from 'fs/promises';
import {
  createLogRecord,
  kDefaultBufferSize,
  LogFileReader,
  toConsumeBatch,
} from './logFileReader.js';
import {
  IConsumeBatch,
  ILogFileConsumptionEntry,
  kDefaultBatchSize,
  kDefaultFlushIncompleteAfterMs,
  kDefaultMaxRecordBytes,
} from './types.js';

export interface IConsumeLogFileInput {
  path: string;
  metadata: Record<string, any>;
  batchSize?: number;
  maxRecordBytes?: number;
  flushIncompleteAfterMs?: number;
  bufferSize?: number;
  now?: () => number;
  /**
   * Called for each completed batch. Must resolve only after durable ingest.
   * On rejection, consumption stops and the checkpoint is not advanced past
   * the last successful batch.
   */
  sendBatch: (batch: IConsumeBatch) => Promise<void>;
}

export interface IConsumeLogFileResult {
  endPosition: number;
  fullyConsumed: boolean;
  rotated: boolean;
  hasPending: boolean;
  lastModified: number;
  size: number;
  dev?: number | bigint;
  ino?: number | bigint;
}

function sameIdentity(
  a: number | bigint | undefined,
  b: number | bigint | undefined,
): boolean {
  if (a === undefined || b === undefined) {
    return true;
  }
  // stats.dev/ino may be bigint while checkpoints store number
  return String(a) === String(b);
}

export function shouldResetForRotation(
  entry: ILogFileConsumptionEntry | undefined,
  stats: {size: number; dev: number | bigint; ino: number | bigint},
): boolean {
  if (!entry) {
    return false;
  }
  if (stats.size < entry.startPosition) {
    return true;
  }
  if (
    entry.dev !== undefined &&
    entry.ino !== undefined &&
    (!sameIdentity(entry.dev, stats.dev) || !sameIdentity(entry.ino, stats.ino))
  ) {
    return true;
  }
  return false;
}

export async function consumeLogFile(
  input: IConsumeLogFileInput,
  lastConsumptionEntry: ILogFileConsumptionEntry | undefined,
): Promise<IConsumeLogFileResult> {
  const {
    path,
    metadata,
    sendBatch,
    batchSize = kDefaultBatchSize,
    maxRecordBytes = kDefaultMaxRecordBytes,
    flushIncompleteAfterMs = kDefaultFlushIncompleteAfterMs,
    bufferSize = kDefaultBufferSize,
    now = Date.now,
  } = input;

  const fileStats = await fs.stat(path);
  const mtimeMs = fileStats.mtime.getTime();
  const size = fileStats.size;
  const dev = fileStats.dev;
  const ino = fileStats.ino;

  let rotated = false;
  let startPosition = 0;

  if (lastConsumptionEntry && lastConsumptionEntry.path === path) {
    if (shouldResetForRotation(lastConsumptionEntry, {size, dev, ino})) {
      rotated = true;
      console.warn(
        `Log file rotated or truncated: ${path}. Resetting checkpoint to 0.`,
      );
      startPosition = 0;
    } else {
      startPosition = lastConsumptionEntry.startPosition;
    }
  }

  const reader = new LogFileReader({
    maxRecordBytes,
    flushIncompleteAfterMs,
    now,
  });
  reader.reset(startPosition);
  reader.setFileMtime(mtimeMs);

  let confirmedPosition = startPosition;
  let pendingBatch: Array<{message: string; endOffset: number}> = [];

  const flushBatch = async (): Promise<void> => {
    while (pendingBatch.length > 0) {
      const batchItems = pendingBatch.splice(0, batchSize);
      const endPosition = batchItems[batchItems.length - 1].endOffset;
      const records = batchItems.map(item =>
        createLogRecord(item.message, metadata),
      );
      const batch = toConsumeBatch(records, endPosition, {
        mtimeMs,
        size,
        dev,
        ino,
      });
      await sendBatch(batch);
      confirmedPosition = endPosition;
    }
  };

  const enqueue = async (
    records: Array<{message: string; endOffset: number}>,
  ): Promise<void> => {
    for (const record of records) {
      pendingBatch.push(record);
      if (pendingBatch.length >= batchSize) {
        const batchItems = pendingBatch.splice(0, batchSize);
        const endPosition = batchItems[batchItems.length - 1].endOffset;
        const logRecords = batchItems.map(item =>
          createLogRecord(item.message, metadata),
        );
        const batch = toConsumeBatch(logRecords, endPosition, {
          mtimeMs,
          size,
          dev,
          ino,
        });
        await sendBatch(batch);
        confirmedPosition = endPosition;
      }
    }
  };

  const fileHandle = await fs.open(path, 'r');
  try {
    let readOffset = startPosition;

    while (readOffset < size) {
      const toRead = Math.min(bufferSize, size - readOffset);
      const buffer = Buffer.alloc(toRead);
      const {bytesRead} = await fileHandle.read(
        buffer,
        0,
        toRead,
        readOffset,
      );

      if (bytesRead === 0) {
        break;
      }

      const chunk = buffer.subarray(0, bytesRead);
      const completed = reader.pushChunk(chunk, readOffset);
      readOffset += bytesRead;
      await enqueue(completed);
    }

    const atEof = readOffset >= size;
    const finishResult = reader.finish(atEof);
    await enqueue(finishResult.records);
    await flushBatch();

    const hasPending = finishResult.hasPending;
    const fullyConsumed = !hasPending && confirmedPosition >= size;

    return {
      endPosition: confirmedPosition,
      fullyConsumed,
      rotated,
      hasPending,
      lastModified: mtimeMs,
      size,
      dev,
      ino,
    };
  } finally {
    await fileHandle.close();
  }
}

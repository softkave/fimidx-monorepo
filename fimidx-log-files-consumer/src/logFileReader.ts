import {
  IConsumeBatch,
  ILogRecord,
  kDefaultBufferSize,
  kDefaultFlushIncompleteAfterMs,
  kDefaultMaxRecordBytes,
} from './types.js';

const LF = 0x0a;
const CR = 0x0d;
const SPACE = 0x20;
const TAB = 0x09;

export interface IParsedLine {
  /** Line text without trailing CR/LF */
  text: string;
  /** Absolute file byte offset after this line's terminating newline (or end of unterminated trailer) */
  endOffset: number;
  /** True when the line ended with a newline in the file */
  terminated: boolean;
  indented: boolean;
}

export interface ILogFileReaderOptions {
  maxRecordBytes?: number;
  flushIncompleteAfterMs?: number;
  now?: () => number;
}

export interface ILogFileReaderFlushResult {
  records: Array<{message: string; endOffset: number}>;
  /** Bytes fully committed into finalized records */
  position: number;
  hasPending: boolean;
}

function isIndentedBuffer(lineBytes: Buffer): boolean {
  if (lineBytes.length === 0) {
    return false;
  }
  const first = lineBytes[0];
  return first === SPACE || first === TAB;
}

function decodeLine(lineBytes: Buffer): string {
  return lineBytes.toString('utf8');
}

/**
 * Byte-accurate log file parser. Scans raw buffers for newlines, carries
 * incomplete bytes and pending logical records across chunks, and folds
 * indented continuation lines into the preceding record.
 */
export class LogFileReader {
  private readonly maxRecordBytes: number;
  private readonly flushIncompleteAfterMs: number;
  private readonly now: () => number;

  private pendingBytes = Buffer.alloc(0);
  /** Absolute file offset of pendingBytes[0] */
  private pendingBytesStartOffset = 0;
  private pendingRecordParts: string[] = [];
  private pendingRecordBytes = 0;
  private pendingRecordEndOffset = 0;
  /** Absolute offset through last finalized record */
  private position = 0;
  private fileMtimeMs = 0;

  constructor(options: ILogFileReaderOptions = {}) {
    this.maxRecordBytes = options.maxRecordBytes ?? kDefaultMaxRecordBytes;
    this.flushIncompleteAfterMs =
      options.flushIncompleteAfterMs ?? kDefaultFlushIncompleteAfterMs;
    this.now = options.now ?? Date.now;
  }

  getPosition(): number {
    return this.position;
  }

  hasPending(): boolean {
    return (
      this.pendingRecordParts.length > 0 || this.pendingBytes.length > 0
    );
  }

  reset(position = 0): void {
    this.position = position;
    this.pendingBytes = Buffer.alloc(0);
    this.pendingBytesStartOffset = position;
    this.pendingRecordParts = [];
    this.pendingRecordBytes = 0;
    this.pendingRecordEndOffset = position;
  }

  setFileMtime(mtimeMs: number): void {
    this.fileMtimeMs = mtimeMs;
  }

  /**
   * Feed a chunk read starting at absolute file offset `readOffset`.
   * Returns newly completed logical records with their committed end offsets.
   */
  pushChunk(
    chunk: Buffer,
    readOffset: number,
  ): Array<{message: string; endOffset: number}> {
    const expected = this.pendingBytesStartOffset + this.pendingBytes.length;
    if (readOffset !== expected) {
      throw new Error(
        `Non-contiguous read: expected offset ${expected}, got ${readOffset}`,
      );
    }

    this.pendingBytes = Buffer.concat([this.pendingBytes, chunk]);
    return this.drainCompleteLines();
  }

  /**
   * At EOF: optionally flush a trailing incomplete record after quiescence.
   */
  finish(atEof: boolean): ILogFileReaderFlushResult {
    const records: Array<{message: string; endOffset: number}> = [];

    if (!atEof) {
      return {
        records,
        position: this.position,
        hasPending: this.hasPending(),
      };
    }

    const quiescent =
      this.now() - this.fileMtimeMs >= this.flushIncompleteAfterMs;

    if (!quiescent) {
      return {
        records,
        position: this.position,
        hasPending: this.hasPending(),
      };
    }

    // Flush any remaining unterminated bytes as a final line.
    if (this.pendingBytes.length > 0) {
      this.assertRecordBudget(this.pendingBytes.length);
      const text = decodeLine(this.pendingBytes);
      const endOffset =
        this.pendingBytesStartOffset + this.pendingBytes.length;
      const indented = isIndentedBuffer(this.pendingBytes);
      this.pendingBytesStartOffset = endOffset;
      this.pendingBytes = Buffer.alloc(0);

      const completed = this.acceptLine({
        text,
        endOffset,
        terminated: false,
        indented,
      });
      records.push(...completed);
    }

    // Flush the last candidate record (no further continuation possible).
    if (this.pendingRecordParts.length > 0) {
      records.push({
        message: this.pendingRecordParts.join('\n'),
        endOffset: this.pendingRecordEndOffset,
      });
      this.position = this.pendingRecordEndOffset;
      this.pendingRecordParts = [];
      this.pendingRecordBytes = 0;
    }

    return {
      records,
      position: this.position,
      hasPending: false,
    };
  }

  private drainCompleteLines(): Array<{message: string; endOffset: number}> {
    const completed: Array<{message: string; endOffset: number}> = [];

    while (this.pendingBytes.length > 0) {
      const nlIndex = this.pendingBytes.indexOf(LF);
      if (nlIndex === -1) {
        break;
      }

      let lineEnd = nlIndex;
      if (lineEnd > 0 && this.pendingBytes[lineEnd - 1] === CR) {
        lineEnd -= 1;
      }

      const lineBytes = this.pendingBytes.subarray(0, lineEnd);
      const absoluteEnd = this.pendingBytesStartOffset + nlIndex + 1;
      this.assertRecordBudget(lineBytes.length);

      const line: IParsedLine = {
        text: decodeLine(lineBytes),
        endOffset: absoluteEnd,
        terminated: true,
        indented: isIndentedBuffer(lineBytes),
      };

      this.pendingBytes = this.pendingBytes.subarray(nlIndex + 1);
      this.pendingBytesStartOffset = absoluteEnd;

      completed.push(...this.acceptLine(line));
    }

    // Guard against unbounded pendingBytes for a single overlong line.
    if (this.pendingBytes.length > this.maxRecordBytes) {
      throw new Error(
        `Log record exceeds maxRecordBytes (${this.maxRecordBytes}). ` +
          `Raise maxRecordBytes in config if this is expected.`,
      );
    }

    return completed;
  }

  private acceptLine(
    line: IParsedLine,
  ): Array<{message: string; endOffset: number}> {
    const completed: Array<{message: string; endOffset: number}> = [];

    if (line.indented && this.pendingRecordParts.length > 0) {
      this.assertRecordBudget(Buffer.byteLength(line.text, 'utf8') + 1);
      this.pendingRecordParts.push(line.text);
      this.pendingRecordBytes += Buffer.byteLength(line.text, 'utf8') + 1;
      this.pendingRecordEndOffset = line.endOffset;
      return completed;
    }

    // Non-indented line (or indented with no pending record): finalize prior candidate.
    if (this.pendingRecordParts.length > 0) {
      completed.push({
        message: this.pendingRecordParts.join('\n'),
        endOffset: this.pendingRecordEndOffset,
      });
      this.position = this.pendingRecordEndOffset;
      this.pendingRecordParts = [];
      this.pendingRecordBytes = 0;
    }

    this.pendingRecordParts = [line.text];
    this.pendingRecordBytes = Buffer.byteLength(line.text, 'utf8');
    this.pendingRecordEndOffset = line.endOffset;
    return completed;
  }

  private assertRecordBudget(additionalBytes: number): void {
    if (this.pendingRecordBytes + additionalBytes > this.maxRecordBytes) {
      throw new Error(
        `Log record exceeds maxRecordBytes (${this.maxRecordBytes}). ` +
          `Raise maxRecordBytes in config if this is expected.`,
      );
    }
  }
}

export function createLogRecord(
  message: string,
  metadata: Record<string, any>,
  timestamp = new Date().toISOString(),
): ILogRecord {
  return {
    level: 'log',
    timestamp,
    message,
    ...metadata,
  };
}

export function toConsumeBatch(
  records: ILogRecord[],
  endPosition: number,
  stats: {
    mtimeMs: number;
    size: number;
    dev?: number | bigint;
    ino?: number | bigint;
  },
): IConsumeBatch {
  return {
    records,
    endPosition,
    lastModified: stats.mtimeMs,
    size: stats.size,
    ...(stats.dev !== undefined ? {dev: stats.dev} : {}),
    ...(stats.ino !== undefined ? {ino: stats.ino} : {}),
  };
}

export {kDefaultBufferSize};

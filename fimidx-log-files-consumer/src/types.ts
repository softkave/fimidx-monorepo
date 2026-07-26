import {z} from 'zod';

export const kDefaultBatchSize = 100;
export const kDefaultMaxRecordBytes = 1_048_576; // 1 MiB
export const kDefaultFlushIncompleteAfterMs = 5000;
export const kDefaultBufferSize = 8192;
export const kDefaultPassIntervalMs = 10_000;
export const kRuntimeDirectoryName = '.fimidx-log-files-consumer';
export const kPidFilename = 'consumer.pid';
export const kConsumptionFilename = 'consumption.json';

export const ProcessingOptionsSchema = z.object({
  metadata: z.record(z.string(), z.any()).optional(),
  projectId: z.string().optional(),
  clientToken: z.string().optional(),
  serverURL: z.string().optional(),
  batchSize: z.number().int().positive().optional(),
  maxRecordBytes: z.number().int().positive().optional(),
  flushIncompleteAfterMs: z.number().int().nonnegative().optional(),
});

export const LogFileInputSchema = ProcessingOptionsSchema.extend({
  path: z.string(),
});

export const LogFilesConsumerOptionsSchema = ProcessingOptionsSchema.extend({
  logFiles: z.array(LogFileInputSchema),
  workingDir: z.string().optional(),
});

export const LogFileConsumptionEntrySchema = z.object({
  path: z.string(),
  startPosition: z.number(),
  lastModified: z.number(),
  size: z.number().optional(),
  // Node stats.dev/ino can be number or bigint depending on platform
  dev: z.union([z.number(), z.bigint()]).optional(),
  ino: z.union([z.number(), z.bigint()]).optional(),
});

export const LogFilesConsumptionSchema = z.object({
  entries: z.array(LogFileConsumptionEntrySchema),
});

export type ProcessingOptions = z.infer<typeof ProcessingOptionsSchema>;
export type LogFileInput = z.infer<typeof LogFileInputSchema>;
export type LogFilesConsumerOptions = z.infer<
  typeof LogFilesConsumerOptionsSchema
>;
export type LogFileConsumptionEntry = z.infer<
  typeof LogFileConsumptionEntrySchema
>;
export type LogFilesConsumption = z.infer<typeof LogFilesConsumptionSchema>;

/** @deprecated Prefer LogFileConsumptionEntry */
export type ILogFileConsumptionEntry = LogFileConsumptionEntry;
/** @deprecated Prefer LogFilesConsumption */
export type ILogFilesConsumption = LogFilesConsumption;

export interface IResolvedFileConfig {
  path: string;
  metadata: Record<string, any>;
  projectId: string;
  clientToken: string;
  serverURL?: string;
  batchSize: number;
  maxRecordBytes: number;
  flushIncompleteAfterMs: number;
}

export interface ILogRecord {
  level: 'log';
  timestamp: string;
  message: string;
  [key: string]: unknown;
}

export interface IConsumeBatch {
  records: ILogRecord[];
  endPosition: number;
  lastModified: number;
  size: number;
  dev?: number | bigint;
  ino?: number | bigint;
}

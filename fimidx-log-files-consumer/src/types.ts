import {z} from 'zod';

export interface ILogFileConsumptionEntry {
  path: string;
  startPosition: number;
  lastModified: number;
}

export interface ILogFilesConsumption {
  entries: ILogFileConsumptionEntry[];
}

// Zod schemas
export const ProcessingOptionsSchema = z.object({
  metadata: z.record(z.string(), z.any()).optional(),
  projectId: z.string().optional(),
  clientToken: z.string().optional(),
  serverURL: z.string().optional(),
});

export const LogFileInputSchema = ProcessingOptionsSchema.extend({
  path: z.string(),
});

export const LogFilesConsumerOptionsSchema = ProcessingOptionsSchema.extend({
  logFiles: z.array(LogFileInputSchema),
  trackConsumptionFilepath: z.string(),
});

export const LogFileConsumptionEntrySchema = z.object({
  path: z.string(),
  startPosition: z.number(),
  lastModified: z.number(),
});

export const LogFilesConsumptionSchema = z.object({
  entries: z.array(LogFileConsumptionEntrySchema),
});

// Type exports from schemas
export type ProcessingOptions = z.infer<typeof ProcessingOptionsSchema>;
export type LogFileInput = z.infer<typeof LogFileInputSchema>;
export type LogFilesConsumerOptions = z.infer<
  typeof LogFilesConsumerOptionsSchema
>;
export type LogFileConsumptionEntry = z.infer<
  typeof LogFileConsumptionEntrySchema
>;
export type LogFilesConsumption = z.infer<typeof LogFilesConsumptionSchema>;

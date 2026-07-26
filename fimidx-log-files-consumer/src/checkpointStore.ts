import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ILogFileConsumptionEntry,
  ILogFilesConsumption,
  LogFilesConsumptionSchema,
} from './types.js';

function serializeIdentityValue(
  value: number | bigint | undefined,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'bigint') {
    // Checkpoint identity only; number is sufficient for equality checks on restart.
    return Number(value);
  }
  return value;
}

function serializeEntry(
  entry: ILogFileConsumptionEntry,
): ILogFileConsumptionEntry {
  return {
    ...entry,
    ...(entry.dev !== undefined
      ? {dev: serializeIdentityValue(entry.dev)}
      : {}),
    ...(entry.ino !== undefined
      ? {ino: serializeIdentityValue(entry.ino)}
      : {}),
  };
}

export async function loadConsumptionData(
  filepath: string,
): Promise<ILogFilesConsumption> {
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    const data = JSON.parse(content);
    return LogFilesConsumptionSchema.parse(data);
  } catch {
    return {entries: []};
  }
}

/**
 * Atomically persist consumption checkpoints (write temp file, then rename).
 */
export async function saveConsumptionData(
  filepath: string,
  data: ILogFilesConsumption,
): Promise<void> {
  const dir = path.dirname(filepath);
  const base = path.basename(filepath);
  const tempPath = path.join(dir, `.${base}.${process.pid}.${Date.now()}.tmp`);

  const serializable: ILogFilesConsumption = {
    entries: data.entries.map(serializeEntry),
  };

  await fs.writeFile(tempPath, JSON.stringify(serializable, null, 2), 'utf-8');
  await fs.rename(tempPath, filepath);
}

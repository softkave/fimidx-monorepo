import * as fs from 'fs/promises';
import * as path from 'path';
import {
  kConsumptionFilename,
  kPidFilename,
  kRuntimeDirectoryName,
} from './types.js';

export interface IRuntimePaths {
  workingDir: string;
  runtimeDir: string;
  pidFilepath: string;
  consumptionFilepath: string;
}

export function getRuntimePaths(
  workingDir = process.cwd(),
): IRuntimePaths {
  const absoluteWorkingDir = path.resolve(workingDir);
  const runtimeDir = path.join(absoluteWorkingDir, kRuntimeDirectoryName);

  return {
    workingDir: absoluteWorkingDir,
    runtimeDir,
    pidFilepath: path.join(runtimeDir, kPidFilename),
    consumptionFilepath: path.join(runtimeDir, kConsumptionFilename),
  };
}

export async function writePidFile(paths: IRuntimePaths): Promise<void> {
  await fs.mkdir(paths.runtimeDir, {recursive: true});
  await fs.writeFile(paths.pidFilepath, `${process.pid}\n`, 'utf-8');
}

export async function removeOwnPidFile(paths: IRuntimePaths): Promise<void> {
  try {
    const pid = (await fs.readFile(paths.pidFilepath, 'utf-8')).trim();
    if (pid === String(process.pid)) {
      await fs.unlink(paths.pidFilepath);
    }
  } catch (error: unknown) {
    if (
      !error ||
      typeof error !== 'object' ||
      !('code' in error) ||
      error.code !== 'ENOENT'
    ) {
      throw error;
    }
  }
}

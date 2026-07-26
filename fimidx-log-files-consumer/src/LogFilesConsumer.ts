import {FimidxEndpoints} from 'fimidx';
import * as chokidar from 'chokidar';
import * as fs from 'fs/promises';
import {
  loadConsumptionData,
  saveConsumptionData,
} from './checkpointStore.js';
import {resolveFileConfig} from './config.js';
import {consumeLogFile} from './consumeLogFile.js';
import {
  getRuntimePaths,
  IRuntimePaths,
  removeOwnPidFile,
  writePidFile,
} from './runtimePaths.js';
import {
  IConsumeBatch,
  ILogFileConsumptionEntry,
  ILogFilesConsumption,
  IResolvedFileConfig,
  kDefaultPassIntervalMs,
  LogFilesConsumerOptions,
  LogFilesConsumerOptionsSchema,
} from './types.js';

export interface ILogFilesConsumer {
  start(): Promise<void>;
  stop(): Promise<void>;
  requestReload(): void;
}

export class LogFilesConsumer implements ILogFilesConsumer {
  private configFilepath: string;
  private fileWatchers: Map<string, chokidar.FSWatcher> = new Map();
  private awakeFiles: Map<string, IResolvedFileConfig> = new Map();
  private asleepFiles: Map<string, IResolvedFileConfig> = new Map();
  private consumptionData: ILogFilesConsumption = {entries: []};
  private cachedConfig: LogFilesConsumerOptions | null = null;
  private runtimePaths: IRuntimePaths | null = null;
  private endpointsByKey = new Map<string, FimidxEndpoints>();
  private isRunning = false;
  private passInterval = kDefaultPassIntervalMs;
  private passTimer: NodeJS.Timeout | null = null;
  private passInFlight = false;
  private reloadRequested = false;

  constructor(configFilepath: string) {
    this.configFilepath = configFilepath;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log(
      `Starting log files consumer (PID: ${process.pid}) with config: ${this.configFilepath}`,
    );

    try {
      await this.loadConfig();
      await this.runPass();
      console.log(`Log files consumer started (PID: ${process.pid})`);
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  /**
   * Ask the consumer to re-read its config file. The reload is applied at the
   * start of a pass so it never interleaves with an in-flight pass.
   */
  requestReload(): void {
    if (!this.isRunning) {
      return;
    }

    this.reloadRequested = true;
    console.log('Config reload requested');

    if (!this.passInFlight) {
      this.scheduleNextPass(0);
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('Stopping log files consumer...');

    if (this.passTimer) {
      clearTimeout(this.passTimer);
      this.passTimer = null;
    }

    for (const watcher of this.fileWatchers.values()) {
      await watcher.close();
    }
    this.fileWatchers.clear();

    if (this.runtimePaths) {
      await removeOwnPidFile(this.runtimePaths);
    }

    this.endpointsByKey.clear();
    console.log('Log files consumer stopped');
  }

  private async loadConfig(): Promise<void> {
    // Everything that can fail is resolved before any live state is mutated, so
    // a bad config leaves the previously loaded one running.
    const configContent = await fs.readFile(this.configFilepath, 'utf-8');
    const configData = JSON.parse(configContent);
    const validatedConfig = LogFilesConsumerOptionsSchema.parse(configData);
    const resolvedFiles = validatedConfig.logFiles.map(logFile =>
      resolveFileConfig(logFile, validatedConfig),
    );
    const nextRuntimePaths = getRuntimePaths(validatedConfig.workingDir);
    const runtimeChanged =
      this.runtimePaths?.runtimeDir !== nextRuntimePaths.runtimeDir;

    await writePidFile(nextRuntimePaths);
    if (runtimeChanged) {
      if (this.runtimePaths) {
        await removeOwnPidFile(this.runtimePaths);
      }
      this.consumptionData = await loadConsumptionData(
        nextRuntimePaths.consumptionFilepath,
      );
    }

    this.runtimePaths = nextRuntimePaths;
    this.cachedConfig = validatedConfig;
    await this.applyResolvedLogFiles(resolvedFiles);

    console.log(
      `Loaded config with ${validatedConfig.logFiles.length} log files; runtime data: ${nextRuntimePaths.runtimeDir}`,
    );
  }

  private getEndpoints(file: IResolvedFileConfig): FimidxEndpoints {
    const key = `${file.clientToken}::${file.serverURL ?? ''}`;
    let endpoints = this.endpointsByKey.get(key);
    if (!endpoints) {
      endpoints = new FimidxEndpoints({
        authToken: file.clientToken,
        ...(file.serverURL ? {serverURL: file.serverURL} : {}),
      });
      this.endpointsByKey.set(key, endpoints);
    }
    return endpoints;
  }

  private async applyResolvedLogFiles(
    resolvedFiles: IResolvedFileConfig[],
  ): Promise<void> {
    this.awakeFiles.clear();
    this.asleepFiles.clear();
    this.endpointsByKey.clear();

    for (const watcher of this.fileWatchers.values()) {
      await watcher.close();
    }
    this.fileWatchers.clear();

    for (const resolved of resolvedFiles) {
      try {
        await fs.access(resolved.path);
      } catch {
        console.warn(`Log file does not exist: ${resolved.path}`);
        continue;
      }

      this.awakeFiles.set(resolved.path, resolved);
      await this.startFileWatcher(resolved.path);
    }
  }

  private async startFileWatcher(filepath: string): Promise<void> {
    if (this.fileWatchers.has(filepath)) {
      return;
    }

    const watcher = chokidar.watch(filepath, {
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('change', () => {
      console.log(`File changed: ${filepath}`);
      this.handleFileChange(filepath);
    });

    watcher.on('error', error => {
      console.error(`Error watching file ${filepath}:`, error);
    });

    this.fileWatchers.set(filepath, watcher);
  }

  private handleFileChange(filepath: string): void {
    const asleepFile = this.asleepFiles.get(filepath);
    if (asleepFile) {
      this.awakeFiles.set(filepath, asleepFile);
      this.asleepFiles.delete(filepath);
      console.log(`Moved ${filepath} from asleep to awake`);
    }
  }

  private scheduleNextPass(delayMs = this.passInterval): void {
    if (this.passTimer) {
      clearTimeout(this.passTimer);
      this.passTimer = null;
    }

    if (!this.isRunning) {
      return;
    }

    this.passTimer = setTimeout(() => {
      void this.runPass();
    }, delayMs);
  }

  private async runPass(): Promise<void> {
    if (!this.isRunning || this.passInFlight) {
      return;
    }

    this.passInFlight = true;

    try {
      if (this.reloadRequested) {
        this.reloadRequested = false;
        await this.reloadConfig();
      }

      await this.processAwakeFiles();
    } catch (error) {
      console.error('Error in consumption pass:', error);
    } finally {
      this.passInFlight = false;
      this.scheduleNextPass();
    }
  }

  private async reloadConfig(): Promise<void> {
    try {
      await this.loadConfig();
    } catch (error) {
      console.error(
        'Failed to reload config, keeping the previous one:',
        error,
      );
    }
  }

  private updateCheckpointEntry(entry: ILogFileConsumptionEntry): void {
    const existingIndex = this.consumptionData.entries.findIndex(
      e => e.path === entry.path,
    );
    if (existingIndex >= 0) {
      this.consumptionData.entries[existingIndex] = entry;
    } else {
      this.consumptionData.entries.push(entry);
    }
  }

  private async processAwakeFiles(): Promise<void> {
    if (!this.cachedConfig || !this.runtimePaths) {
      return;
    }

    const trackPath = this.runtimePaths.consumptionFilepath;
    const filesToSleep: string[] = [];

    for (const [key, awakeFile] of this.awakeFiles) {
      try {
        const lastEntry = this.consumptionData.entries.find(
          entry => entry.path === awakeFile.path,
        );

        const endpoints = this.getEndpoints(awakeFile);

        const result = await consumeLogFile(
          {
            path: awakeFile.path,
            metadata: awakeFile.metadata,
            batchSize: awakeFile.batchSize,
            maxRecordBytes: awakeFile.maxRecordBytes,
            flushIncompleteAfterMs: awakeFile.flushIncompleteAfterMs,
            sendBatch: async (batch: IConsumeBatch) => {
              await endpoints.logs.ingestLogs({
                projectId: awakeFile.projectId,
                logs: batch.records,
              });

              this.updateCheckpointEntry({
                path: awakeFile.path,
                startPosition: batch.endPosition,
                lastModified: batch.lastModified,
                size: batch.size,
                ...(batch.dev !== undefined ? {dev: batch.dev} : {}),
                ...(batch.ino !== undefined ? {ino: batch.ino} : {}),
              });
              await saveConsumptionData(trackPath, this.consumptionData);
            },
          },
          lastEntry,
        );

        // Ensure checkpoint reflects latest confirmed position even if no new batches.
        this.updateCheckpointEntry({
          path: awakeFile.path,
          startPosition: result.endPosition,
          lastModified: result.lastModified,
          size: result.size,
          ...(result.dev !== undefined ? {dev: result.dev} : {}),
          ...(result.ino !== undefined ? {ino: result.ino} : {}),
        });
        await saveConsumptionData(trackPath, this.consumptionData);

        if (result.fullyConsumed && !result.hasPending) {
          this.asleepFiles.set(key, awakeFile);
          filesToSleep.push(key);
          console.log(
            `Moved ${awakeFile.path} from awake to asleep (fully consumed)`,
          );
        }
      } catch (error) {
        console.error(`Error processing file ${awakeFile.path}:`, error);
        // Keep awake for retry; checkpoint already reflects last successful batch.
      }
    }

    for (const key of filesToSleep) {
      this.awakeFiles.delete(key);
    }
  }
}

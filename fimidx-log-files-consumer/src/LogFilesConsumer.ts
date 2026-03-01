import * as chokidar from 'chokidar';
import * as fs from 'fs/promises';
import {consumeLogFile} from './consumeLogFile.js';
import {
  ILogFileConsumptionEntry,
  ILogFilesConsumption,
  LogFilesConsumerOptions,
  LogFilesConsumerOptionsSchema,
  LogFilesConsumptionSchema,
} from './types.js';

interface IAwakeFile {
  path: string;
  metadata: Record<string, any>;
  projectId: string;
  clientToken: string;
  serverURL?: string;
}

interface IAsleepFile {
  path: string;
  metadata: Record<string, any>;
  projectId: string;
  clientToken: string;
  serverURL?: string;
}

export interface ILogFilesConsumer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class LogFilesConsumer implements ILogFilesConsumer {
  private configFilepath: string;
  private configWatcher: chokidar.FSWatcher | null = null;
  private fileWatchers: Map<string, chokidar.FSWatcher> = new Map();
  private awakeFiles: Map<string, IAwakeFile> = new Map();
  private asleepFiles: Map<string, IAsleepFile> = new Map();
  private consumptionData: ILogFilesConsumption = {entries: []};
  private isRunning = false;
  private passInterval: number = 10000; // 10 seconds default
  private passTimer: NodeJS.Timeout | null = null;
  private configChanged = false;

  constructor(configFilepath: string) {
    this.configFilepath = configFilepath;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log(
      `Starting log files consumer with config: ${this.configFilepath}`,
    );

    // Start watching the config file
    await this.startConfigWatcher();

    // Load initial config
    await this.loadConfig();

    // Start the main consumption loop
    await this.startConsumptionLoop();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('Stopping log files consumer...');

    // Clear the pass timer
    if (this.passTimer) {
      clearTimeout(this.passTimer);
      this.passTimer = null;
    }

    // Stop all file watchers
    for (const [filepath, watcher] of this.fileWatchers) {
      await watcher.close();
    }
    this.fileWatchers.clear();

    // Stop config watcher
    if (this.configWatcher) {
      await this.configWatcher.close();
      this.configWatcher = null;
    }

    console.log('Log files consumer stopped');
  }

  private async startConfigWatcher(): Promise<void> {
    this.configWatcher = chokidar.watch(this.configFilepath, {
      persistent: true,
      ignoreInitial: true,
    });

    this.configWatcher.on('change', () => {
      console.log('Config file changed, will reload on next pass');
      this.configChanged = true;
    });

    this.configWatcher.on('error', error => {
      console.error('Error watching config file:', error);
    });
  }

  private async loadConfig(): Promise<void> {
    try {
      const configContent = await fs.readFile(this.configFilepath, 'utf-8');
      const configData = JSON.parse(configContent);

      // Validate config
      const validatedConfig = LogFilesConsumerOptionsSchema.parse(configData);

      // Load consumption data if it exists
      await this.loadConsumptionData(validatedConfig.trackConsumptionFilepath);

      // Process log files from config
      await this.processConfigLogFiles(validatedConfig);

      console.log(
        `Loaded config with ${validatedConfig.logFiles.length} log files`,
      );
    } catch (error) {
      console.error('Error loading config:', error);
      throw error;
    }
  }

  private async loadConsumptionData(filepath: string): Promise<void> {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const data = JSON.parse(content);
      this.consumptionData = LogFilesConsumptionSchema.parse(data);
    } catch (error: unknown) {
      // File doesn't exist or is invalid, start with empty consumption data
      this.consumptionData = {entries: []};
    }
  }

  private async saveConsumptionData(filepath: string): Promise<void> {
    try {
      await fs.writeFile(
        filepath,
        JSON.stringify(this.consumptionData, null, 2),
      );
    } catch (error) {
      console.error('Error saving consumption data:', error);
    }
  }

  private async processConfigLogFiles(
    config: LogFilesConsumerOptions,
  ): Promise<void> {
    // Clear current awake and asleep files
    this.awakeFiles.clear();
    this.asleepFiles.clear();

    // Stop existing file watchers
    for (const [filepath, watcher] of this.fileWatchers) {
      await watcher.close();
    }
    this.fileWatchers.clear();

    // Process each log file from config
    for (const logFile of config.logFiles) {
      const fileKey = logFile.path;

      // Merge config options (per-entry config takes priority)
      const mergedConfig = {
        metadata: logFile.metadata || config.metadata || {},
        projectId: logFile.projectId || config.projectId,
        clientToken: logFile.clientToken || config.clientToken,
        serverURL: logFile.serverURL || config.serverURL,
      };

      // Validate that required fields are present
      if (!mergedConfig.projectId || !mergedConfig.clientToken) {
        throw new Error(
          `Missing required config for file ${logFile.path}: projectId and clientToken are required`,
        );
      }

      // Check if file exists
      try {
        await fs.access(logFile.path);
      } catch (error) {
        console.warn(`Log file does not exist: ${logFile.path}`);
        continue;
      }

      // Add to awake files initially
      this.awakeFiles.set(fileKey, {
        path: logFile.path,
        metadata: mergedConfig.metadata,
        projectId: mergedConfig.projectId!,
        clientToken: mergedConfig.clientToken!,
        serverURL: mergedConfig.serverURL,
      });

      // Start watching the file
      await this.startFileWatcher(logFile.path);
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
    // Find the file in asleep files and move it to awake files
    for (const [key, asleepFile] of this.asleepFiles) {
      if (asleepFile.path === filepath) {
        this.awakeFiles.set(key, asleepFile);
        this.asleepFiles.delete(key);
        console.log(`Moved ${filepath} from asleep to awake`);
        break;
      }
    }
  }

  private async startConsumptionLoop(): Promise<void> {
    const runPass = async () => {
      if (!this.isRunning) {
        return;
      }

      try {
        // Check if config has changed
        if (this.configChanged) {
          console.log('Config changed, reloading...');
          await this.loadConfig();
          this.configChanged = false;
        }

        // Process awake files
        await this.processAwakeFiles();

        // Schedule next pass
        this.passTimer = setTimeout(runPass, this.passInterval);
      } catch (error) {
        console.error('Error in consumption pass:', error);
        // Schedule next pass even if there was an error
        this.passTimer = setTimeout(runPass, this.passInterval);
      }
    };

    // Start the first pass
    await runPass();
  }

  private async processAwakeFiles(): Promise<void> {
    const filesToRemove: string[] = [];
    const config = await this.getCurrentConfig();

    for (const [key, awakeFile] of this.awakeFiles) {
      try {
        // Find last consumption entry for this file
        const lastEntry = this.consumptionData.entries.find(
          entry => entry.path === awakeFile.path,
        );

        // Consume the log file
        const result = await consumeLogFile(
          {
            path: awakeFile.path,
            metadata: awakeFile.metadata,
            projectId: awakeFile.projectId,
            clientToken: awakeFile.clientToken,
            serverURL: awakeFile.serverURL,
          },
          lastEntry,
        );

        // Get current file stats
        const stats = await fs.stat(awakeFile.path);
        const currentModifiedTime = stats.mtime.getTime();

        // Update or create consumption entry
        const newEntry: ILogFileConsumptionEntry = {
          path: awakeFile.path,
          startPosition: result.endPosition,
          lastModified: currentModifiedTime,
        };

        // Update consumption data
        const existingIndex = this.consumptionData.entries.findIndex(
          entry => entry.path === awakeFile.path,
        );

        if (existingIndex >= 0) {
          this.consumptionData.entries[existingIndex] = newEntry;
        } else {
          this.consumptionData.entries.push(newEntry);
        }

        // Check if file has changed
        if (lastEntry && lastEntry.lastModified === currentModifiedTime) {
          // File hasn't changed, check if it should be moved to asleep
          if (lastEntry.startPosition === result.endPosition) {
            // No new content consumed, move to asleep files
            this.asleepFiles.set(key, awakeFile);
            filesToRemove.push(key);
            console.log(
              `Moved ${awakeFile.path} from awake to asleep (no changes)`,
            );
          }
        }

        // Save consumption data
        if (config) {
          await this.saveConsumptionData(config.trackConsumptionFilepath);
        }
      } catch (error) {
        console.error(`Error processing file ${awakeFile.path}:`, error);
      }
    }

    // Remove files that were moved to asleep
    for (const key of filesToRemove) {
      this.awakeFiles.delete(key);
    }
  }

  private async getCurrentConfig(): Promise<LogFilesConsumerOptions | null> {
    try {
      const configContent = await fs.readFile(this.configFilepath, 'utf-8');
      const configData = JSON.parse(configContent);
      return LogFilesConsumerOptionsSchema.parse(configData);
    } catch (error) {
      console.error('Error reading current config:', error);
      return null;
    }
  }
}

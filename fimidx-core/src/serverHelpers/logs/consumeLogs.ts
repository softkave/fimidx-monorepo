import type { File } from "fimidara";
import split2 from "split2";
import { getCoreConfig } from "../../common/getCoreConfig.js";
import { fimidxConsoleLogger } from "../../common/logger/fimidx-console-logger.js";
import type { IApp } from "../../definitions/app.js";
import { getApps } from "../app/getApps.js";
import { listFolderContent, readFileWithRange } from "../fimidara/index.js";
import {
  getLatestConsumptionDay,
  getLogFileConsumption,
  updateLogFileConsumption,
} from "./index.js";
import { ingestLogs } from "./ingestLogs.js";

// System type for internal operations
const kSystemByType = "system";

// Maximum number of logs to accumulate before processing
const MAX_LOGS_BATCH_SIZE = 5000;

async function parseNdjsonStream(
  stream: NodeJS.ReadableStream,
  filePath: string
): Promise<any[]> {
  const logs: any[] = [];

  await new Promise<void>((resolve, reject) => {
    stream
      .pipe(split2())
      .on("data", (line: string) => {
        if (line.trim()) {
          try {
            const log = JSON.parse(line);
            logs.push(log);
          } catch (error) {
            // Skip invalid JSON lines - don't break everything for a single line
            fimidxConsoleLogger.error({
              message: "Failed to parse log line",
              error,
              filePath,
            });
          }
        }
      })
      .on("error", (error: unknown) => {
        reject(error);
      })
      .on("end", () => {
        resolve();
      });
  });

  return logs;
}

async function consumeLogFile(params: {
  app: IApp;
  file: File;
  filePath: string;
  fileIndex: number;
}): Promise<void> {
  const { app, file, filePath, fileIndex } = params;

  const match = file.name.match(/^(.+)-(\d{4}-\d{2}-\d{2})\.ndjson$/);
  if (!match) return;

  const day = match[2];

  // Get consumption state
  const consumptionState = await getLogFileConsumption({
    appId: app.id,
    filePath,
  });

  const startPosition = consumptionState?.lastPosition ?? 0;
  const lastModified = file.lastUpdatedAt
    ? new Date(file.lastUpdatedAt).getTime()
    : Date.now();

  // If file hasn't changed and we've read everything, skip
  if (
    consumptionState &&
    consumptionState.lastModified === lastModified &&
    startPosition >= (file.size ?? 0)
  ) {
    return;
  }

  // Read file from start position
  const chunkSize = 64 * 1024; // 64KB chunks
  let currentPosition = startPosition;
  const logs: any[] = [];

  while (currentPosition < (file.size ?? 0)) {
    const endPosition = Math.min(currentPosition + chunkSize, file.size ?? 0);

    // Read chunk
    const stream = await readFileWithRange({
      filepath: filePath,
      rangeStart: currentPosition,
      rangeEnd: endPosition - 1,
    });

    // Parse NDJSON from stream
    const chunkLogs = await parseNdjsonStream(stream, filePath);
    logs.push(...chunkLogs);

    currentPosition = endPosition;

    // If we've reached max logs count, break to process what we have
    if (logs.length >= MAX_LOGS_BATCH_SIZE) {
      break;
    }

    // If we've read all available data, break
    if (currentPosition >= (file.size ?? 0)) {
      break;
    }
  }

  // Process logs if we have any
  if (logs.length > 0) {
    await ingestLogs({
      args: {
        appId: app.id,
        logs,
      },
      by: "system",
      byType: kSystemByType,
      groupId: app.orgId,
    });
  }

  // Update consumption state
  await updateLogFileConsumption({
    appId: app.id,
    filePath,
    lastDay: day,
    fileIndex,
    lastPosition: currentPosition,
    lastModified,
  });
}

export async function consumeLogs(): Promise<void> {
  const { fimidara: fimidaraConfig } = getCoreConfig();

  // Get all apps
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { apps, hasMore: hasMoreApps } = await getApps({
      args: {
        query: {},
        page,
        limit: 10,
      },
    });

    for (const app of apps) {
      // Construct fimidara folder path
      const folderPath = `${fimidaraConfig.workspaceRootname}/${fimidaraConfig.logsFolderPrefix}/${app.id}`;

      try {
        // Get the latest consumption day, or use app's created date
        const latestDay = await getLatestConsumptionDay({ appId: app.id });
        const startDate = latestDay
          ? new Date(latestDay + "T00:00:00Z")
          : app.createdAt;

        // Get current date in UTC
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Start from the day after the latest processed day, or from app creation date
        const currentDate = new Date(startDate);
        currentDate.setUTCHours(0, 0, 0, 0);

        // If we have a latest day, start from the next day
        if (latestDay) {
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        // If current date is after today, skip this app
        if (currentDate > today) {
          continue;
        }

        // List all files once and group by day
        const { files } = await listFolderContent({
          folderpath: folderPath,
        });

        // Group files by day
        const filesByDay = new Map<string, File[]>();
        for (const file of files) {
          const match = file.name.match(/^(.+)-(\d{4}-\d{2}-\d{2})\.ndjson$/);
          if (match) {
            const day = match[2];
            if (!filesByDay.has(day)) {
              filesByDay.set(day, []);
            }
            filesByDay.get(day)!.push(file);
          }
        }

        // Sort files within each day by name
        for (const [day, dayFiles] of filesByDay.entries()) {
          dayFiles.sort((a, b) => a.name.localeCompare(b.name));
        }

        // Process each day from start date to today (inclusive)
        while (currentDate <= today) {
          const dayStr = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD

          // Get files for this day
          const dayFiles = filesByDay.get(dayStr) || [];

          // Process each file for this day
          for (const file of dayFiles) {
            const filePath = `${folderPath}/${file.name}`;
            const fileIndex = dayFiles.indexOf(file);

            await consumeLogFile({
              app,
              file,
              filePath,
              fileIndex,
            });
          }

          // Move to next day
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
      } catch (error) {
        // Log error but continue with other apps
        console.error(`Error consuming logs for app ${app.id}:`, error);
      }
    }

    hasMore = hasMoreApps;
    page++;
  }
}

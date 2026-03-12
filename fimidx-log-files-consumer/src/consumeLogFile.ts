import {FimidxConsoleLikeLogger} from 'fimidx';
import * as fs from 'fs/promises';
import {ILogFileConsumptionEntry} from './types.js';

export interface IConsumeLogFileInput {
  path: string;
  metadata: Record<string, any>;
  projectId: string;
  clientToken: string;
  serverURL?: string;
}

export interface IConsumeLogFileOutput {
  endPosition: number;
}

export async function consumeLogFile(
  input: IConsumeLogFileInput,
  lastConsumptionEntry: ILogFileConsumptionEntry | undefined,
): Promise<IConsumeLogFileOutput> {
  const {path, metadata, projectId, clientToken, serverURL} = input;

  // Get file stats to check if file has changed
  const fileStats = await fs.stat(path);
  const currentModifiedTime = fileStats.mtime.getTime();

  // If we have a last consumption entry, check if file has changed
  if (lastConsumptionEntry && lastConsumptionEntry.path === path) {
    if (lastConsumptionEntry.lastModified === currentModifiedTime) {
      // File hasn't changed since last consumption, check if enough time has passed
      // for an incomplete line to be complete
      const timeSinceLastModified = Date.now() - currentModifiedTime;
      const minWaitTime = 5000; // 5 seconds - adjust as needed

      if (timeSinceLastModified < minWaitTime) {
        // Not enough time has passed, return current position without processing
        return {endPosition: lastConsumptionEntry.startPosition};
      }
    }
  }

  // Create a new Fimidx ConsoleLikeLogger client
  const logger = new FimidxConsoleLikeLogger({
    projectId,
    clientToken,
    serverURL,
    metadata,
  });

  let currentPosition = lastConsumptionEntry?.startPosition ?? 0;

  // If the lastConsumptionEntry path is different from current path, start from 0
  if (lastConsumptionEntry && lastConsumptionEntry.path !== path) {
    currentPosition = 0;
  }
  const bufferSize = 8192; // 8KB buffer
  const fileHandle = await fs.open(path, 'r');

  try {
    while (true) {
      // Read buffer from current position
      const buffer = Buffer.alloc(bufferSize);
      const {bytesRead} = await fileHandle.read(
        buffer,
        0,
        bufferSize,
        currentPosition,
      );

      if (bytesRead === 0) {
        // End of file reached
        break;
      }

      // Convert buffer to string and split into lines
      const chunk = buffer.toString('utf8', 0, bytesRead);
      const lines = chunk.split('\n');

      // Process all lines except the last one (which may be incomplete)
      const linesToProcess = lines.slice(0, -1);
      let lastCompleteLineEnd = currentPosition;

      for (let i = 0; i < linesToProcess.length; i++) {
        const line = linesToProcess[i];
        const nextLine = linesToProcess[i + 1];

        // Check if next line is indented (part of the same log entry)
        if (
          nextLine &&
          (nextLine.startsWith(' ') || nextLine.startsWith('\t'))
        ) {
          // This line is part of a multi-line log entry, skip for now
          continue;
        }

        // This is either a single line or the end of a multi-line entry
        let fullLogEntry = line;

        // Look backwards to find the start of this multi-line entry
        let j = i - 1;
        while (j >= 0) {
          const prevLine = linesToProcess[j];
          const currentLine = linesToProcess[j + 1];

          if (
            currentLine &&
            (currentLine.startsWith(' ') || currentLine.startsWith('\t'))
          ) {
            // This is part of the multi-line entry
            fullLogEntry = prevLine + '\n' + fullLogEntry;
            j--;
          } else {
            break;
          }
        }

        // Send the complete log entry to the logger
        await logger.log(fullLogEntry);

        // Find the position of the end of this line in the chunk
        const lineStartInChunk = chunk.indexOf(line);
        if (lineStartInChunk !== -1) {
          const lineEndInChunk = chunk.indexOf('\n', lineStartInChunk);
          if (lineEndInChunk !== -1) {
            lastCompleteLineEnd = currentPosition + lineEndInChunk + 1;
          } else {
            // Line doesn't end with newline in this chunk, so it's incomplete
            // Don't update lastCompleteLineEnd, keep it at the previous position
          }
        }
      }

      // Update current position to the end of the last complete line
      currentPosition = lastCompleteLineEnd;

      // If we didn't read a full buffer, we've reached the end
      if (bytesRead < bufferSize) {
        break;
      }
    }
  } finally {
    await fileHandle.close();
    await logger.flush();
  }

  return {endPosition: currentPosition};
}

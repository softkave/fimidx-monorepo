# Fimidx Log Files Consumer

A Node.js application that monitors log files and sends their contents to a Fimidx server for processing and analysis.

## Features

- **Real-time monitoring**: Uses chokidar to watch log files for changes
- **Configurable**: JSON configuration file with per-file and global settings
- **Efficient processing**: Only processes new content since last consumption
- **Resilient**: Handles file rotation, missing files, and network issues
- **State persistence**: Tracks consumption progress to avoid reprocessing

## Installation

```bash
npm install
npm run compile
```

## Usage

### Command Line

```bash
node build/index.js <config-filepath>
```

### Programmatic

```typescript
import {startLogFilesConsumer} from './build/index.js';

const consumer = await startLogFilesConsumer('./config.json');

// Stop the consumer when done
await consumer.stop();
```

## Configuration

The configuration file is a JSON file with the following structure:

```json
{
  "projectId": "your-project-id",
  "clientToken": "your-client-token",
  "serverURL": "https://your-fimidx-server.com",
  "metadata": {
    "environment": "production",
    "service": "log-consumer"
  },
  "logFiles": [
    {
      "path": "/var/log/application.log",
      "metadata": {
        "logType": "application",
        "level": "info"
      }
    }
  ],
  "trackConsumptionFilepath": "./consumption-data.json"
}
```

### Configuration Options

#### Global Options (optional, can be overridden per file)

- `projectId` (string): Your Fimidx application ID
- `clientToken` (string): Your Fimidx client token
- `serverURL` (string): Fimidx server URL
- `metadata` (object): Global metadata to attach to all log entries

#### Per-File Options

- `path` (string, required): Path to the log file to monitor
- `metadata` (object, optional): File-specific metadata
- `projectId` (string, optional): Override global projectId
- `clientToken` (string, optional): Override global clientToken
- `serverURL` (string, optional): Override global serverURL

#### Required Options

- `trackConsumptionFilepath` (string): Path to save consumption progress

## How It Works

1. **Initialization**: Loads configuration and starts watching the config file
2. **File Monitoring**: Watches all configured log files for changes
3. **Consumption Loop**: Runs every 10 seconds to process awake files
4. **State Management**:
   - Files with new content are in "awake" state
   - Files without changes are moved to "asleep" state
   - When asleep files change, they're moved back to awake state
5. **Progress Tracking**: Saves consumption progress to avoid reprocessing

## File States

- **Awake Files**: Files that have new content to process
- **Asleep Files**: Files that haven't changed recently (watched for changes)

## Error Handling

- Missing files are logged as warnings and skipped
- Network errors are logged but don't stop processing
- Invalid configurations throw errors and stop the application
- File access errors are logged but processing continues

## Development

```bash
# Compile TypeScript
npm run compile

# Run tests
npm test

# Lint code
npm run lint
```

## Example

See `example-config.json` for a complete configuration example.

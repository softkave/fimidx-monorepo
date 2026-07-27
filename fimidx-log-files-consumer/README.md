# fimidx-log-files-consumer

Monitors log files on disk and ships new lines to [fimidx](https://dx.fimidara.com). Useful when you already write to files and do not want to change application logging code.

Delivery is **at least once**: a byte offset is persisted only after a successful ingest. If the process crashes after ingest but before the checkpoint write, the next run may re-send that batch (duplicates). A failed ingest never skips content.

## Install

```bash
npm install fimidx-log-files-consumer
```

## Command line

```bash
npx fimidx-log-files-consumer ./config.json
# or after a global/local install
fimidx-log-files-consumer ./config.json
```

From a checkout of this repo (after `npm run compile`):

```bash
node build/cli.js ./config.json
# or
npm start -- ./config.json
```

Pass a single positional argument: the path to a JSON config file. The process watches the configured log files, reloads its config on `SIGHUP` / `SIGUSR2`, and shuts down cleanly on `SIGINT` / `SIGTERM`.

On startup, the consumer prints its process ID and writes it to
`<workingDir>/.fimidx-log-files-consumer/consumer.pid`. The PID file is
removed during a clean shutdown.

### Credentials

Prefer keeping secrets out of the config file. After per-file and global merge, missing values fall back to:

| Env | Maps to |
|-----|---------|
| `FIMIDX_CLIENT_TOKEN` | `clientToken` |
| `FIMIDX_PROJECT_ID` | `projectId` |
| `FIMIDX_SERVER_URL` | `serverURL` (optional) |

Precedence: **per-file config → global config → environment**.

```bash
export FIMIDX_CLIENT_TOKEN=…
export FIMIDX_PROJECT_ID=…
fimidx-log-files-consumer ./config.json
```

## Programmatic

```ts
import {startLogFilesConsumer} from 'fimidx-log-files-consumer';

const consumer = await startLogFilesConsumer('./config.json');

// After editing the config file
consumer.requestReload();

// Later
await consumer.stop();
```

`startLogFilesConsumer` returns `{ start(), stop(), requestReload() }`. `start()` is already called for you.

## Configuration

```json
{
  "workingDir": ".",
  "projectId": "your-project-id",
  "serverURL": "https://dx.fimidara.com/api",
  "metadata": {
    "environment": "production",
    "service": "log-consumer"
  },
  "batchSize": 100,
  "maxRecordBytes": 1048576,
  "flushIncompleteAfterMs": 5000,
  "logFiles": [
    {
      "path": "/var/log/application.log",
      "metadata": {
        "logType": "application"
      }
    }
  ]
}
```

### Global options

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `workingDir` | `string` | no | current process directory (`process.cwd()`) | Parent directory for `.fimidx-log-files-consumer` runtime state |
| `projectId` | `string` | if not set per file or via env | — | Fimidx project ID |
| `clientToken` | `string` | if not set per file or via env | — | Client token (prefer env) |
| `serverURL` | `string` | no | SDK default | Fimidx API base URL |
| `metadata` | `object` | no | — | Attached to every shipped record |
| `batchSize` | `number` | no | `100` | Max records per ingest request |
| `maxRecordBytes` | `number` | no | `1048576` (1 MiB) | Max size of one logical record; raise if you emit larger stack traces |
| `flushIncompleteAfterMs` | `number` | no | `5000` | After the file is unchanged this long, flush a trailing line/record that has no newline yet |
| `logFiles` | `array` | yes | — | Files to watch |

### Per-file options (`logFiles[]`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | `string` | yes | Path to the log file |
| `projectId` / `clientToken` / `serverURL` | | no | Overrides global values |
| `metadata` | `object` | no | Merged into global metadata; per-file keys win on conflict |
| `batchSize` / `maxRecordBytes` / `flushIncompleteAfterMs` | | no | Overrides global processing options |

## How it works

1. Loads and validates the config once at startup, and again whenever you send a reload signal (see [Reloading config](#reloading-config)).
2. Watches each configured log file with chokidar.
3. Every **10 seconds**, processes **awake** files.
4. Reads only bytes after the last confirmed checkpoint, using a **byte-accurate** parser (handles UTF-8, CRLF, empty lines, and lines larger than the read buffer).
5. Indented continuation lines (leading space or tab) are folded into the previous entry as one multi-line record. Trailing util.inspect-style dumps (`{ ... }`, `[{ ... }]`, multi-line `[ ... ]`, including column-0 closers like `}` / `]` / `}]`) stay with that same record.
6. Records are batched and sent with `FimidxEndpoints.logs.ingestLogs`. The checkpoint advances **only after** that call succeeds, and is written atomically (temp file + rename).
7. A final incomplete line (no trailing newline) is held until the file has been unchanged for `flushIncompleteAfterMs`, then shipped.
8. If the file shrinks below the checkpoint or its device/inode changes (rotation/truncate), the consumer resets to byte 0 and warns.

### Reloading config

The consumer does not watch its config file. Editors and deployment tooling
write files in stages, so a watcher can read a half-written config. Instead you
tell the consumer when the file is ready by sending `SIGHUP` (or `SIGUSR2`):

```bash
kill -HUP "$(cat .fimidx-log-files-consumer/consumer.pid)"
```

The reload is applied at the start of the next pass, so it never interleaves
with an in-flight batch. If the new config is unreadable or invalid, the error
is logged and the consumer keeps running on the previous config — fix the file
and signal again. Checkpoints are keyed by file path, so reloading never
re-ships already-delivered lines.

Embedding the consumer instead of running the CLI? Call `consumer.requestReload()`
and wire it to whatever trigger you prefer.

### File states

- **Awake** — has new content, a pending incomplete record, or was just woken by chokidar.
- **Asleep** — fully consumed with nothing pending; still watched. A filesystem change moves it back to awake.

### Runtime state

Runtime files are kept together under:

```text
<workingDir>/.fimidx-log-files-consumer/
├── consumer.pid
└── consumption.json
```

When `workingDir` is omitted, it defaults to the process's current working
directory. `consumer.pid` contains the current process ID while the consumer
is running. `consumption.json` stores confirmed byte checkpoints:

```json
{
  "entries": [
    {
      "path": "/var/log/application.log",
      "startPosition": 4096,
      "lastModified": 1710000000000,
      "size": 4096,
      "dev": 16777220,
      "ino": 1234567
    }
  ]
}
```

Older checkpoints without `size` / `dev` / `ino` are accepted and upgraded on the next successful write.

## Error handling

- Missing log files are logged as warnings and skipped.
- Ingest failures leave the checkpoint unchanged; the file stays awake for the next pass.
- Invalid config at startup throws and stops the process; an invalid config on reload is logged and the previous config keeps running.
- Records larger than `maxRecordBytes` throw for that file without advancing the checkpoint.

## Links

- npm: https://www.npmjs.com/package/fimidx-log-files-consumer
- SDK: https://www.npmjs.com/package/fimidx
- Source: https://github.com/softkave/fimidx-monorepo/tree/main/fimidx-log-files-consumer

## License

MIT

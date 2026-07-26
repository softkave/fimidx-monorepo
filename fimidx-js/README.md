# fimidx

JavaScript SDK and CLI for [fimidx](https://dx.fimidara.com) — buffered log shipping, direct API access, and source map uploads for readable stack traces.

## Install

```bash
npm install fimidx
```

## Entry points

| Import | Use when |
|--------|----------|
| `fimidx` / `fimidx/indexIsomorphic` | Default. Loggers + endpoints (Node and browser). |
| `fimidx/indexNode` | Node-only APIs such as `uploadSourceMaps`. |
| `fimidx/indexBrowser` | Same as isomorphic; explicit browser entry. |

Default API base URL: `https://dx.fimidara.com/api`.

## FimidxLogger

Buffered logger that batches log entries and POSTs them to fimidx.

```ts
import {FimidxLogger} from 'fimidx';

const logger = new FimidxLogger({
  projectId: 'your-project-id',
  clientToken: 'your-client-token',
  // serverURL: 'https://dx.fimidara.com/api', // optional
  metadata: {service: 'api', env: 'production'},
});

logger.log({message: 'hello', level: 'info'});
logger.logList([{message: 'a'}, {message: 'b'}]);

// On shutdown — logs are buffered, so flush or close before exiting
await logger.flush();
// or
await logger.close(); // flush + clear pending flush timer
```

### Options (`IFimidxLoggerOptions`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectId` | `string` | required | Fimidx project ID |
| `clientToken` | `string` | required | Client token used as the API auth token |
| `serverURL` | `string` | `https://dx.fimidara.com/api` | API base URL |
| `bufferTimeout` | `number` | `1000` | Flush interval in ms |
| `maxBufferSize` | `number` | `100` | Flush when buffer reaches this size |
| `maxRetries` | `number` | `3` | Retries on transient send failures |
| `retryDelay` | `number` | `1000` | Base retry delay in ms (exponential backoff) |
| `consoleLogOnError` | `boolean` | `true` | Print failed batches to the console so logs are not lost |
| `logRemoteErrors` | `boolean` | `false` | Log remote errors during retries |
| `metadata` | `object` | — | Merged into every log entry |

### Methods

- `log(entry)` / `logList(entries)` — enqueue
- `flush()` — send the current buffer
- `close()` — clear the flush timer and flush
- `setMetadata` / `getMetadata` / `mergeMetadata` — manage shared metadata

## FimidxConsoleLikeLogger

`console`-style wrapper around a `FimidxLogger`. Useful when you want `info` / `warn` / `error` (and helpers like `time`, `group`, `assert`) while still shipping to fimidx.

```ts
import {FimidxConsoleLikeLogger, FimidxLogger} from 'fimidx';

const fimidxLogger = new FimidxLogger({
  projectId: 'your-project-id',
  clientToken: 'your-client-token',
});

const consoleLogger = new FimidxConsoleLikeLogger({
  fimidxLogger,
  enableConsoleFallback: true, // also print to console (default: true)
  logToFimidx: true, // ship to fimidx (default: true)
});

consoleLogger.info('ready');
consoleLogger.error('failed', {code: 500});

await fimidxLogger.close();
```

## FimidxEndpoints

Lower-level client for direct API calls (no buffering).

```ts
import {FimidxEndpoints} from 'fimidx';

const endpoints = new FimidxEndpoints({
  authToken: 'your-client-token',
  // serverURL: 'https://dx.fimidara.com/api',
});

await endpoints.logs.ingestLogs({
  projectId: 'your-project-id',
  logs: [
    {message: 'Hello', level: 'info', timestamp: new Date()},
  ],
});
```

Also available:

- `endpoints.sourceMaps.getUploadToken(...)`
- `endpoints.sourceMaps.notifyUploadComplete(...)`

## Source map uploads (Node)

Use the Node entry to upload a folder or zip of source maps:

```ts
import {uploadSourceMaps} from 'fimidx/indexNode';

await uploadSourceMaps({
  clientToken: 'your-client-token',
  projectId: 'your-project-id',
  repo: 'my-org/my-app',
  version: '1.2.3',
  inputPath: './.next',
  // serverUrl: 'https://dx.fimidara.com/api',
  // fimidaraUrl: 'https://api.fimidara.com',
});
```

## CLI

The package ships a `fimidx` binary.

```bash
npx fimidx source-maps upload \
  --client-token "$FIMIDX_CLIENT_TOKEN" \
  --project-id "$FIMIDX_PROJECT_ID" \
  --repo "my-org/my-app" \
  --version "1.2.3" \
  --path .next
```

| Flag | Required | Description |
|------|----------|-------------|
| `--client-token` | yes | Fimidx client token |
| `--project-id` | yes | Project ID |
| `--repo` | yes | Repo identifier |
| `--version` | yes | Release / version string |
| `--path` | yes | Folder or zip of source maps |
| `--server-url` | no | Fimidx API base URL (default `https://dx.fimidara.com/api`) |
| `--fimidara-url` | no | fimidara API base URL for the file upload |

Print the CLI version with `-V` / `--cli-version` (not `--version`, which is reserved for the release id).

## Links

- npm: https://www.npmjs.com/package/fimidx
- Source: https://github.com/softkave/fimidx-monorepo/tree/main/fimidx-js
- App: https://dx.fimidara.com

## License

MIT

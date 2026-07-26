# fimidx-winston-transport

Winston transport that drains log entries to [fimidx](https://dx.fimidara.com) via a `FimidxLogger`.

## Install

```bash
npm install fimidx-winston-transport fimidx winston
```

Built on `winston-transport@^4.9.0`.

## Usage

Create a `FimidxLogger`, pass it to the transport, and add the transport to your Winston logger:

```ts
import {FimidxLogger} from 'fimidx';
import {FimidxWinstonTransport} from 'fimidx-winston-transport';
import winston from 'winston';

const fimidxLogger = new FimidxLogger({
  projectId: process.env.FIMIDX_PROJECT_ID!,
  clientToken: process.env.FIMIDX_CLIENT_TOKEN!,
  // serverURL: 'https://dx.fimidara.com/api',
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new FimidxWinstonTransport({
      fimidxLogger,
      // level: 'info',
    }),
    new winston.transports.Console({
      format: winston.format.json(),
    }),
  ],
});

logger.info('hello from winston', {requestId: 'abc'});

// On shutdown — the underlying FimidxLogger buffers entries
await logger.transports
  .find(t => t instanceof FimidxWinstonTransport)
  ?.close();
// or call fimidxLogger.close() / fimidxLogger.flush() directly
```

## Options (`IFimidxWinstonTransportOptions`)

| Option | Type | Description |
|--------|------|-------------|
| `fimidxLogger` | `FimidxLogger` | **Required.** Logger that ships entries to fimidx |
| `level` | `string` | Inherited from `winston-transport` — minimum level to handle |
| `format` | `logform.Format` | Inherited — format applied before `log()` |
| `silent` | `boolean` | Inherited — disable the transport |
| `handleExceptions` | `boolean` | Inherited |
| `handleRejections` | `boolean` | Inherited |

Auth, project, buffering, and retries are configured on the injected `FimidxLogger`, not on the transport.

## Methods

- `log(info, callback)` — Winston transport entry point; forwards `info` to `fimidxLogger.log`
- `flush()` — flushes the underlying `FimidxLogger` buffer
- `close()` — closes the underlying `FimidxLogger` (flush + clear pending timer)

## Links

- npm: https://www.npmjs.com/package/fimidx-winston-transport
- SDK: https://www.npmjs.com/package/fimidx
- Source: https://github.com/softkave/fimidx-monorepo/tree/main/fimidx-winston-transport

## License

MIT

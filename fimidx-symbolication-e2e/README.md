# fimidx-symbolication-e2e

End-to-end symbolication test runner for the local fimidx stack.

## Prerequisites

- **Running services**: Next.js API, `fimidx-node-server`, and MongoDB.
- **Node-server env**: `SYMBOLICATION_MAX_AGE_MS` must be **0** in the environment used by `fimidx-node-server`.
  - Reason: `runSymbolication` only processes logs with `createdAt <= now - maxAgeMs`; with the default \(1 day\), freshly ingested logs are excluded.
- **Built CLI**: the fixture’s `upload-source-maps` script runs `pnpm --filter fimidx compile` to ensure `fimidx-js/build/cli.js` exists.

## Seeding env

From `ixtb-nextjs`:

```bash
pnpm seed:symbolication-sample-app-env:test
pnpm seed:fimidx-symbolication-e2e-env:test
```

## Run

```bash
pnpm --filter fimidx-symbolication-e2e test
```

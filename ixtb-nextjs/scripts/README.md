# Scripts

## Seed `fimidx-js/.env.test` from `ixtb-nextjs`

This script:

- Requires `E2E_TEST_USER_EMAIL` and `E2E_TEST_USER_PASSWORD` in the environment (same as api-e2e / `credentials-e2e`)
- Creates an org (group), project, and client token via **fimidx-core DB helpers** (no NextAuth HTTP login)
- Writes the resulting values into `../fimidx-js/.env.test`

### Prerequisites

- `ixtb-nextjs/.env.test` loaded (e.g. via `env-cmd`), including **database** settings used by `fimidx-core` (same as `pnpm test:e2e`)
- `E2E_TEST_USER_EMAIL` and `E2E_TEST_USER_PASSWORD` set (parity with E2E; `E2E_TEST_USER_ID` optional, defaults to email like the tests)

### Run (recommended)

From `fimidx-monorepo/ixtb-nextjs`:

```bash
pnpm seed:fimidx-js-env:test
```

### Run (explicit tsx + env-cmd)

From `fimidx-monorepo/ixtb-nextjs`:

```bash
env-cmd -f ".env.test" tsx ./scripts/seedFimidxJsEnvTest.ts
```


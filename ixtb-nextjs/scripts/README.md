# Scripts

## Seed `fimidx-js` / symbolication packages `.env.test` from `ixtb-nextjs`

`seedEnvTest.ts`:

- Requires `E2E_TEST_USER_EMAIL` and `E2E_TEST_USER_PASSWORD` in the environment (same as api-e2e / `credentials-e2e`).
- Reuses **one** org, project, and symbolication repo/version via Mongo collection **`seed_fimidx_js_env_test_state`** (singleton key `default`), so `fimidx-js`, `symbolication-sample-app`, and `fimidx-symbolication-e2e` stay aligned when you re-run the script.
- On first run (or after reset), creates org, project, and a client token via **fimidx-core** helpers, then persists `groupId`, `projectId`, optional `clientToken`, and `symRepo` / `symVersion`.
- Writes merged values into the target package’s `.env.test` (see package.json `seed:*` scripts).
- Parses the CLI with [`commander`](https://www.npmjs.com/package/commander); run `tsx ./scripts/seedEnvTest.ts --help` for options.

### Concurrency / locking

The script acquires a **cross-process file lock** on `ixtb-nextjs/.seed-fimidx-js-env-test.lock` (via [`proper-lockfile`](https://www.npmjs.com/package/proper-lockfile)) so two invocations do not race and create different org/project rows. If another process holds the lock, this process waits (with retries) until it can run.

### CLI

| Option               | Purpose                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `[target]`           | Positional: `fimidx-js` (default), `symbolication-sample-app`, or `fimidx-symbolication-e2e`.                                                                |
| `--reset`, `-r`      | Deletes the singleton Mongo row before continuing so this run creates a **new** org/project.                                                                 |
| `--refresh-token`    | Mints a new client token for the **existing** project and stores it on the seed row (same `projectId` / `groupId`).                                          |
| `--sym-repo <id>`    | Sets `SYM_REPO` for this run; **overrides** env `SYM_REPO` when set. For symbolication targets, updates Mongo when either `--sym-repo` or `SYM_REPO` is set. |
| `--sym-version <id>` | Same as `--sym-repo`, for `SYM_VERSION` / env `SYM_VERSION`.                                                                                                 |
| `--one-off`          | Creates a **new** org, project, and client token and writes `.env.test` only. Does **not** read or write the seed state collection (`seed_fimidx_js_env_test_state`). Still persists the new group/project/token via normal fimidx-core helpers. **Incompatible** with `--reset` and `--refresh-token`. |

### Environment variables

| Variable                   | Purpose                                                                     |
| -------------------------- | --------------------------------------------------------------------------- |
| `SYM_REPO` / `SYM_VERSION` | Optional fallbacks when CLI flags are omitted (CLI wins when both are set). |

`clientToken` in Mongo is optional in principle: if it is missing, the script mints one. Reusing a stored token avoids creating extra tokens on every run.

### Prerequisites

- `ixtb-nextjs/.env.test` loaded (e.g. via `env-cmd`), including **Mongo** settings used by `fimidx-core` (same as `pnpm test:e2e`).
- `E2E_TEST_USER_EMAIL` and `E2E_TEST_USER_PASSWORD` set (`E2E_TEST_USER_ID` optional, defaults to email).

### Run (recommended)

From `fimidx-monorepo/ixtb-nextjs`:

```bash
pnpm seed:fimidx-js-env:test
pnpm seed:symbolication-sample-app-env:test
pnpm seed:fimidx-symbolication-e2e-env:test
```

### Run (explicit tsx + env-cmd)

From `fimidx-monorepo/ixtb-nextjs`:

```bash
env-cmd -f ".env.test" tsx ./scripts/seedEnvTest.ts fimidx-js
env-cmd -f ".env.test" tsx ./scripts/seedEnvTest.ts --reset fimidx-js
env-cmd -f ".env.test" tsx ./scripts/seedEnvTest.ts symbolication-sample-app --refresh-token
env-cmd -f ".env.test" tsx ./scripts/seedEnvTest.ts fimidx-symbolication-e2e --sym-repo my_repo --sym-version 1.0.0
env-cmd -f ".env.test" tsx ./scripts/seedEnvTest.ts fimidx-js --one-off
```

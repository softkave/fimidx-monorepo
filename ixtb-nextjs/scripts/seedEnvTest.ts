import { Command } from "commander";
import {
  closeMongoConnection,
  getMongoConnection,
} from "fimidx-core/db/fimidx.mongo";
import {
  getSeedEnvTestStateModel,
  kSeedEnvTestStateKey,
} from "fimidx-core/db/seedEnvTestState.mongo";
import { kByTypes } from "fimidx-core/definitions/other";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import lockfile from "proper-lockfile";
import {
  createTestClientToken,
  createTestOrg,
  createTestProject,
} from "../api-e2e/helpers/setup.ts";

type DotenvMap = Record<string, string>;

type SeedTarget =
  | "fimidx-js"
  | "symbolication-sample-app"
  | "fimidx-symbolication-e2e";

function getEnvOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

function parseDotenv(contents: string): DotenvMap {
  const out: DotenvMap = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function toDotenvLine(key: string, value: string): string {
  const escaped = value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return `${key}="${escaped}"`;
}

function mergeDotenv(original: string, updates: DotenvMap): string {
  const lines = original.split(/\r?\n/);
  const seen = new Set<string>();

  const nextLines = lines.map((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return rawLine;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) return rawLine;
    const key = line.slice(0, eqIdx).trim();
    if (!(key in updates)) return rawLine;
    seen.add(key);
    return toDotenvLine(key, updates[key]!);
  });

  for (const [key, value] of Object.entries(updates)) {
    if (seen.has(key)) continue;
    if (nextLines.length && nextLines[nextLines.length - 1].trim() !== "") {
      nextLines.push("");
    }
    nextLines.push(toDotenvLine(key, value));
  }

  return (
    nextLines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}

function parseSeedCli(): {
  target: SeedTarget;
  reset: boolean;
  refreshToken: boolean;
  oneOff: boolean;
  symRepo?: string;
  symVersion?: string;
} {
  const program = new Command();
  program
    .name("seedEnvTest")
    .description(
      "Seed fimidx-js / symbolication packages .env.test from Mongo-backed shared state"
    )
    .argument(
      "[target]",
      "fimidx-js | symbolication-sample-app | fimidx-symbolication-e2e",
      "fimidx-js"
    )
    .option(
      "--reset, -r",
      "Delete the singleton Mongo seed row and create a new org/project"
    )
    .option(
      "--refresh-token",
      "Mint a new client token for the existing project and store it on the seed row"
    )
    .option(
      "--sym-repo <id>",
      "SYM_REPO (overrides env SYM_REPO when set; persisted for symbolication targets)"
    )
    .option(
      "--sym-version <id>",
      "SYM_VERSION (overrides env SYM_VERSION when set; persisted for symbolication targets)"
    )
    .option(
      "--one-off",
      "Create a new org/project/token and write .env only; do not read or write the seed state collection (incompatible with --reset and --refresh-token)"
    )
    .allowExcessArguments(false);

  program.parse(process.argv);

  const targetArg = (program.args[0] ?? "fimidx-js").trim();
  if (
    targetArg !== "fimidx-js" &&
    targetArg !== "symbolication-sample-app" &&
    targetArg !== "fimidx-symbolication-e2e"
  ) {
    throw new Error(
      `Unknown target "${targetArg}". Expected one of: fimidx-js, symbolication-sample-app, fimidx-symbolication-e2e`
    );
  }

  const o = program.opts<{
    reset?: boolean;
    refreshToken?: boolean;
    oneOff?: boolean;
    symRepo?: string;
    symVersion?: string;
  }>();

  return {
    target: targetArg as SeedTarget,
    reset: Boolean(o.reset),
    refreshToken: Boolean(o.refreshToken),
    oneOff: Boolean(o.oneOff),
    symRepo: o.symRepo,
    symVersion: o.symVersion,
  };
}

function randomSymKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function seedLockPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "../.seed-fimidx-js-env-test.lock");
}

function clientTokenPermissions(projectId: string) {
  return [
    { action: kFimidxPermissions.log.read, target: projectId },
    { action: kFimidxPermissions.log.ingest, target: projectId },
    { action: kFimidxPermissions.sourceMap.upload, target: projectId },
  ];
}

function symRepoEffective(
  cli: string | undefined,
  env: string | undefined,
  fallback?: string
): string {
  const c = cli?.trim();
  if (c) return c;
  const e = env?.trim();
  if (e) return e;
  if (fallback !== undefined) return fallback;
  return randomSymKey("sym_repo");
}

function symVersionEffective(
  cli: string | undefined,
  env: string | undefined,
  fallback?: string
): string {
  const c = cli?.trim();
  if (c) return c;
  const e = env?.trim();
  if (e) return e;
  if (fallback !== undefined) return fallback;
  return randomSymKey("sym_ver");
}

/**
 * New org/project/client token for .env only. Still uses fimidx-core DB helpers
 * (creates real group/project/token rows). Does not read or write
 * `seed_fimidx_js_env_test_state`.
 */
async function generateOneOffSeed(params: {
  userId: string;
  userEmail: string;
  symRepoCli?: string;
  symVersionCli?: string;
}): Promise<{
  orgId: string;
  projectId: string;
  bearerToken: string;
  symRepo: string;
  symVersion: string;
}> {
  const { userId, userEmail, symRepoCli, symVersionCli } = params;
  const { orgId } = await createTestOrg({ userId, userEmail });
  const { projectId } = await createTestProject({ orgId, by: userId });
  const { bearerToken } = await createTestClientToken({
    projectId,
    groupId: orgId,
    by: userId,
    byType: kByTypes.user,
    permissions: clientTokenPermissions(projectId),
  });
  const symRepo = symRepoEffective(symRepoCli, process.env.SYM_REPO, undefined);
  const symVersion = symVersionEffective(
    symVersionCli,
    process.env.SYM_VERSION,
    undefined
  );
  return { orgId, projectId, bearerToken, symRepo, symVersion };
}

async function loadOrCreateSharedSeed(params: {
  userId: string;
  userEmail: string;
  target: SeedTarget;
  reset: boolean;
  refreshToken: boolean;
  symRepoCli?: string;
  symVersionCli?: string;
}): Promise<{
  orgId: string;
  projectId: string;
  bearerToken: string;
  symRepo: string;
  symVersion: string;
  createdNewSeedRow: boolean;
}> {
  const {
    userId,
    userEmail,
    target,
    reset,
    refreshToken,
    symRepoCli,
    symVersionCli,
  } = params;
  const model = getSeedEnvTestStateModel();

  if (reset) {
    await model.deleteMany({ key: kSeedEnvTestStateKey });
  }

  const doc = await model.findOne({ key: kSeedEnvTestStateKey }).lean().exec();

  if (!doc) {
    const { orgId, projectId, bearerToken, symRepo, symVersion } =
      await generateOneOffSeed({
        userId,
        userEmail,
        symRepoCli,
        symVersionCli,
      });
    await model.create({
      key: kSeedEnvTestStateKey,
      groupId: orgId,
      projectId,
      clientToken: bearerToken,
      symRepo,
      symVersion,
      seededByUserId: userId,
      updatedAt: new Date(),
    });
    return {
      orgId,
      projectId,
      bearerToken,
      symRepo,
      symVersion,
      createdNewSeedRow: true,
    };
  }

  const orgId = doc.groupId;
  const projectId = doc.projectId;

  let symRepo = doc.symRepo ?? undefined;
  let symVersion = doc.symVersion ?? undefined;
  if (!symRepo || !symVersion) {
    symRepo = symRepoEffective(symRepoCli, process.env.SYM_REPO, symRepo);
    symVersion = symVersionEffective(
      symVersionCli,
      process.env.SYM_VERSION,
      symVersion
    );
    await model.updateOne(
      { key: kSeedEnvTestStateKey },
      {
        $set: {
          symRepo,
          symVersion,
          updatedAt: new Date(),
        },
      }
    );
  }

  let bearerToken = doc.clientToken ?? "";
  if (refreshToken || !bearerToken) {
    const { bearerToken: next } = await createTestClientToken({
      projectId,
      groupId: orgId,
      by: userId,
      byType: kByTypes.user,
      permissions: clientTokenPermissions(projectId),
    });
    bearerToken = next;
    await model.updateOne(
      { key: kSeedEnvTestStateKey },
      {
        $set: {
          clientToken: bearerToken,
          updatedAt: new Date(),
        },
      }
    );
  }

  if (
    target === "symbolication-sample-app" ||
    target === "fimidx-symbolication-e2e"
  ) {
    const repoOverride =
      symRepoCli?.trim() || process.env.SYM_REPO?.trim() || null;
    const verOverride =
      symVersionCli?.trim() || process.env.SYM_VERSION?.trim() || null;
    let touched = false;
    if (repoOverride) {
      symRepo = repoOverride;
      touched = true;
    }
    if (verOverride) {
      symVersion = verOverride;
      touched = true;
    }
    if (touched) {
      await model.updateOne(
        { key: kSeedEnvTestStateKey },
        {
          $set: {
            symRepo,
            symVersion,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  return {
    orgId,
    projectId,
    bearerToken,
    symRepo: symRepo!,
    symVersion: symVersion!,
    createdNewSeedRow: false,
  };
}

async function run(): Promise<void> {
  const {
    target,
    reset,
    refreshToken,
    oneOff,
    symRepo: symRepoCli,
    symVersion: symVersionCli,
  } = parseSeedCli();
  if (oneOff && (reset || refreshToken)) {
    throw new Error(
      "--one-off cannot be used with --reset or --refresh-token (seed state is not used)"
    );
  }
  const email = getEnvOrThrow("E2E_TEST_USER_EMAIL");
  getEnvOrThrow("E2E_TEST_USER_PASSWORD");

  const userId = process.env.E2E_TEST_USER_ID ?? email;

  const baseUrl = process.env.API_E2E_BASE_URL ?? "http://localhost:3000";
  const serverUrl = `${baseUrl.replace(/\/$/, "")}/api`;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envTestPath =
    target === "fimidx-js"
      ? path.resolve(__dirname, "../../fimidx-js/.env.test")
      : target === "symbolication-sample-app"
      ? path.resolve(__dirname, "../../symbolication-sample-app/.env.test")
      : path.resolve(__dirname, "../../fimidx-symbolication-e2e/.env.test");

  const { promise } = getMongoConnection();
  await promise;

  let orgId: string;
  let projectId: string;
  let bearerToken: string;
  let symRepo: string;
  let symVersion: string;
  let createdNewSeedRow: boolean;
  let seedStatePersisted: boolean;

  if (oneOff) {
    const seed = await generateOneOffSeed({
      userId,
      userEmail: email,
      symRepoCli,
      symVersionCli,
    });
    orgId = seed.orgId;
    projectId = seed.projectId;
    bearerToken = seed.bearerToken;
    symRepo = seed.symRepo;
    symVersion = seed.symVersion;
    createdNewSeedRow = false;
    seedStatePersisted = false;
  } else {
    const shared = await loadOrCreateSharedSeed({
      userId,
      userEmail: email,
      target,
      reset,
      refreshToken,
      symRepoCli,
      symVersionCli,
    });
    orgId = shared.orgId;
    projectId = shared.projectId;
    bearerToken = shared.bearerToken;
    symRepo = shared.symRepo;
    symVersion = shared.symVersion;
    createdNewSeedRow = shared.createdNewSeedRow;
    seedStatePersisted = true;
  }

  const existing = await fs.readFile(envTestPath, "utf8");
  const existingMap = parseDotenv(existing);

  const next = mergeDotenv(existing, {
    FIMIDX_SERVER_URL: serverUrl,
    FIMIDX_PROJECT_ID: projectId,
    FIMIDX_AUTH_TOKEN: bearerToken,
    FIMIDX_GROUP_ID: orgId,
    ...(target === "symbolication-sample-app" ||
    target === "fimidx-symbolication-e2e"
      ? {
          SYM_REPO: symRepo,
          SYM_VERSION: symVersion,
        }
      : {}),
    ...(existingMap.NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID !== undefined
      ? { NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID: projectId }
      : {}),
    ...(existingMap.NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN !== undefined
      ? { NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN: bearerToken }
      : {}),
    ...(existingMap.NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL !== undefined
      ? { NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL: serverUrl }
      : {}),
  });

  await fs.writeFile(envTestPath, next, "utf8");

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        wrote: path.relative(path.resolve(__dirname, "../.."), envTestPath),
        target,
        oneOff,
        reset: oneOff ? false : reset,
        refreshToken: oneOff ? false : refreshToken,
        ...(symRepoCli ? { symRepoCli } : {}),
        ...(symVersionCli ? { symVersionCli } : {}),
        seedStatePersisted,
        ...(seedStatePersisted
          ? {
              mongoCollection: "seed_fimidx_js_env_test_state",
              mongoKey: kSeedEnvTestStateKey,
              createdNewSeedRow,
            }
          : {}),
        groupId: orgId,
        projectId,
        serverUrl,
        ...(target === "symbolication-sample-app" ||
        target === "fimidx-symbolication-e2e"
          ? { symRepo, symVersion }
          : {}),
      },
      null,
      2
    )
  );
}

async function main(): Promise<void> {
  const release = await lockfile.lock(seedLockPath(), {
    stale: 120_000,
    retries: {
      retries: 120,
      minTimeout: 100,
      maxTimeout: 500,
    },
  });
  try {
    await run();
  } finally {
    await release();
  }
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    closeMongoConnection();
  });

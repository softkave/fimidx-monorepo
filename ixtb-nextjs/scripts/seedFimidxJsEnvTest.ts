import { closeMongoConnection } from "fimidx-core/db/fimidx.mongo";
import { kByTypes } from "fimidx-core/definitions/other";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createTestClientToken,
  createTestOrg,
  createTestProject,
} from "../api-e2e/helpers/setup.ts";

type DotenvMap = Record<string, string>;

type SeedTarget = "fimidx-js" | "symbolication-sample-app" | "fimidx-symbolication-e2e";

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

function parseTargetFromArgs(): SeedTarget {
  const raw = process.argv[2]?.trim();
  if (!raw) return "fimidx-js";
  if (
    raw === "fimidx-js" ||
    raw === "symbolication-sample-app" ||
    raw === "fimidx-symbolication-e2e"
  ) {
    return raw;
  }
  throw new Error(
    `Unknown target "${raw}". Expected one of: fimidx-js, symbolication-sample-app, fimidx-symbolication-e2e`
  );
}

async function main() {
  // Same env contract as api-e2e (and NextAuth `credentials-e2e` authorize).
  // Seeding uses fimidx-core DB helpers only — no NextAuth session / HTTP sign-in.
  const target = parseTargetFromArgs();
  const email = getEnvOrThrow("E2E_TEST_USER_EMAIL");
  getEnvOrThrow("E2E_TEST_USER_PASSWORD");

  const userId = process.env.E2E_TEST_USER_ID ?? email;

  const { orgId } = await createTestOrg({ userId, userEmail: email });
  const { projectId } = await createTestProject({ orgId, by: userId });
  const { bearerToken } = await createTestClientToken({
    projectId,
    groupId: orgId,
    by: userId,
    byType: kByTypes.user,
    permissions: [
      { action: kFimidxPermissions.log.read, target: projectId },
      { action: kFimidxPermissions.log.ingest, target: projectId },
      { action: kFimidxPermissions.sourceMap.upload, target: projectId },
    ],
  });

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

  const existing = await fs.readFile(envTestPath, "utf8");
  const existingMap = parseDotenv(existing);

  const symRepo =
    process.env.SYM_REPO ?? `sym_repo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const symVersion =
    process.env.SYM_VERSION ?? `sym_ver_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const next = mergeDotenv(existing, {
    // Existing JS SDK config keys in fimidx-js/.env.test
    FIMIDX_SERVER_URL: serverUrl,
    FIMIDX_PROJECT_ID: projectId,
    FIMIDX_AUTH_TOKEN: bearerToken,
    // Additional helpful keys for tests/debugging
    FIMIDX_GROUP_ID: orgId,
    ...(target === "symbolication-sample-app" || target === "fimidx-symbolication-e2e"
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
        groupId: orgId,
        projectId,
        serverUrl,
        ...(target === "symbolication-sample-app" || target === "fimidx-symbolication-e2e"
          ? { symRepo, symVersion }
          : {}),
      },
      null,
      2
    )
  );
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

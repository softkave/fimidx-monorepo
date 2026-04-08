import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".env.test"),
});

import { closeMongoConnection, getObjModel } from "fimidx-core/db/fimidx.mongo";
import { kObjTags } from "fimidx-core/definitions/obj";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const pExecFile = promisify(execFile);

function ixtbNextjsRoot(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../ixtb-nextjs"
  );
}

/**
 * Writes `symbolication-sample-app/.env.test` and
 * `fimidx-symbolication-e2e/.env.test` via the same scripts as
 * `ixtb-nextjs/package.json` seed:* entries.
 */
async function runSeedScriptsFromIxtb(): Promise<void> {
  const cwd = ixtbNextjsRoot();
  const scripts = [
    "seed:symbolication-sample-app-env:test",
    "seed:fimidx-symbolication-e2e-env:test",
  ] as const;
  for (const script of scripts) {
    // eslint-disable-next-line no-console
    console.log(`[globalSetup] pnpm run ${script} (cwd=${cwd})`);
    const { stdout, stderr } = await pExecFile("pnpm", ["run", script], {
      cwd,
      env: process.env,
    });
    if (stderr?.trim()) {
      // eslint-disable-next-line no-console
      console.error(stderr);
    }
    if (stdout?.trim()) {
      // eslint-disable-next-line no-console
      console.log(stdout);
    }
  }
}

async function clearLogsObjs() {
  const model = getObjModel();
  const query = {
    tag: kObjTags.log,
  };
  await model.deleteMany(query).exec();
}

export async function setup() {
  // TODO: look into why clearing the db leads to client token not found when
  // generated again.
  // await runSeedScriptsFromIxtb();
  await clearLogsObjs();
}

export async function teardown() {
  await closeMongoConnection();
}

import { FimidxLogger } from "fimidx";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extraError } from "./extraError.js";
import { errorSiteA } from "./pkgA/shared/errorSite.js";
import { errorSiteB } from "./pkgB/shared/errorSite.js";
import { rootError } from "./rootError.js";
import {
  rewriteNodeStackToFileUrls,
  rewriteNodeStackToHttpUrls,
  rewriteNodeStackToWebpackUrls,
} from "./stackUtils.js";

function getEnvOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

function getDistDirAbsolute(): string {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
}

function captureStack(fn: () => void): string {
  try {
    fn();
    return "";
  } catch (err) {
    const stack = err instanceof Error ? err.stack : String(err);
    return stack ?? "";
  }
}

async function main(): Promise<void> {
  const serverURL = getEnvOrThrow("FIMIDX_SERVER_URL");
  const projectId = getEnvOrThrow("FIMIDX_PROJECT_ID");
  const clientToken = getEnvOrThrow("FIMIDX_AUTH_TOKEN");
  const groupId = process.env.FIMIDX_GROUP_ID;
  const repo = getEnvOrThrow("SYM_REPO");
  const version = getEnvOrThrow("SYM_VERSION");
  const stackHttpBaseUrl =
    process.env.STACK_HTTP_BASE_URL ?? "http://localhost:9999";

  const logger = new FimidxLogger({
    serverURL,
    projectId,
    clientToken,
    bufferTimeout: 50,
    maxBufferSize: 1,
    consoleLogOnError: true,
    logRemoteErrors: true,
  });

  const distDirAbsolute = getDistDirAbsolute();

  const stacks = [
    { key: "root", stack: captureStack(() => rootError()) },
    { key: "pkgA", stack: captureStack(() => errorSiteA()) },
    { key: "pkgB", stack: captureStack(() => errorSiteB()) },
    { key: "extra", stack: captureStack(() => extraError()) },
  ];

  for (const s of stacks) {
    const variants = [
      { variant: "native", stack: s.stack },
      {
        variant: "file",
        stack: rewriteNodeStackToFileUrls({ stack: s.stack, distDirAbsolute }),
      },
      {
        variant: "webpack",
        stack: rewriteNodeStackToWebpackUrls({
          stack: s.stack,
          distDirAbsolute,
        }),
      },
      {
        variant: "http",
        stack: rewriteNodeStackToHttpUrls({
          stack: s.stack,
          distDirAbsolute,
          baseUrl: stackHttpBaseUrl,
        }),
      },
    ];

    for (const v of variants) {
      logger.log({
        level: "error",
        message: `symbolication-sample-app ${s.key} (${v.variant})`,
        stack: v.stack,
        repo,
        version,
        ...(groupId ? { groupId } : {}),
        sampleKey: s.key,
        stackVariant: v.variant,
      });
    }
  }

  await logger.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

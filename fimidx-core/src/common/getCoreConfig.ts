import { isString } from "lodash-es";
import type { z } from "zod";
import { coreConfigSchema, envVars } from "../definitions/coreConfig.js";

export function getCoreConfig(): z.infer<typeof coreConfigSchema> {
  const fimidxPostgresUrl = process.env[envVars.FIMIDX_POSTGRES_URL];
  const mongoUri = process.env[envVars.MONGO_URI];
  const mongoDbName = process.env[envVars.MONGO_DB_NAME];
  const adminEmails = process.env[envVars.ADMIN_EMAILS];
  const storageType = process.env[envVars.STORAGE_TYPE];
  const jwtSecret = process.env[envVars.JWT_SECRET];
  const resendFromEmail = process.env[envVars.RESEND_FROM_EMAIL];
  const resendApiKey = process.env[envVars.RESEND_API_KEY];
  const fimidxInternalNodeServerUrl =
    process.env[envVars.FIMIDX_INTERNAL_NODE_SERVER_URL];
  const fimidxInternalInternalAccessKey =
    process.env[envVars.FIMIDX_INTERNAL_INTERNAL_ACCESS_KEY];
  const indexObjsUrl = process.env[envVars.INDEX_OBJS_URL];
  const indexObjsIntervalMs = process.env[envVars.INDEX_OBJS_INTERVAL_MS];
  const cleanupObjsUrl = process.env[envVars.CLEANUP_OBJS_URL];
  const cleanupObjsIntervalMs = process.env[envVars.CLEANUP_OBJS_INTERVAL_MS];
  const sourceMapsLocalDir = process.env[envVars.FIMIDX_SOURCE_MAPS_LOCAL_DIR];
  const fimidaraAuthToken = process.env[envVars.FIMIDARA_AUTH_TOKEN];
  const fimidaraRootname = process.env[envVars.FIMIDARA_ROOTNAME];
  const fimidaraSourceMapsFolderpath =
    process.env[envVars.FIMIDARA_SOURCE_MAPS_FOLDERPATH];
  const symbolicationUrl = process.env[envVars.SYMBOLICATION_URL];
  const symbolicationIntervalMs =
    process.env[envVars.SYMBOLICATION_INTERVAL_MS];
  const symbolicationBatchSize =
    process.env[envVars.SYMBOLICATION_LOG_BATCH_SIZE];
  const symbolicationMaxAgeMs = process.env[envVars.SYMBOLICATION_MAX_AGE_MS];
  const unzipSourceMapsUrl = process.env[envVars.UNZIP_SOURCE_MAPS_URL];
  const unzipSourceMapsIntervalMs =
    process.env[envVars.UNZIP_SOURCE_MAPS_INTERVAL_MS];
  const purgeSourceMapCacheUrl =
    process.env[envVars.PURGE_SOURCE_MAP_CACHE_URL];
  const purgeSourceMapCacheIntervalMs =
    process.env[envVars.PURGE_SOURCE_MAP_CACHE_INTERVAL_MS];
  const purgeSourceMapCacheMaxUnusedCycles =
    process.env[envVars.SYMBOLICATION_LOCAL_CACHE_MAX_UNUSED_CYCLES];
  const nodeServerHttpPort = process.env[envVars.NODE_SERVER_HTTP_PORT];
  const fimidxLoggerProjectId =
    process.env[envVars.NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID];
  const fimidxLoggerClientToken =
    process.env[envVars.NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN];
  const fimidxLoggerServerUrl =
    process.env[envVars.NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL];
  const wsHost = process.env[envVars.WS_HOST];
  const betterAuthUrl =
    process.env[envVars.BETTER_AUTH_URL] ?? process.env.NEXT_PUBLIC_URL;
  const betterAuthSecret = process.env[envVars.BETTER_AUTH_SECRET];
  const nextPublicBetterAuthUrl =
    process.env[envVars.NEXT_PUBLIC_BETTER_AUTH_URL];

  return coreConfigSchema.parse({
    postgres: {
      url: fimidxPostgresUrl,
    },
    mongo: {
      uri: mongoUri,
      dbName: mongoDbName,
    },
    adminEmails: isString(adminEmails) ? adminEmails.split(",") : [],
    storage: {
      type: storageType,
    },
    jwtSecret,
    resend: {
      fromEmail: resendFromEmail,
      apiKey: resendApiKey,
    },
    fimidxInternal: {
      nodeServerUrl: fimidxInternalNodeServerUrl,
      internalAccessKey: fimidxInternalInternalAccessKey,
    },
    indexObjs: {
      url: indexObjsUrl,
      intervalMs: indexObjsIntervalMs,
    },
    cleanupObjs: {
      url: cleanupObjsUrl,
      intervalMs: cleanupObjsIntervalMs,
    },
    sourceMaps: { localDir: sourceMapsLocalDir },
    fimidara: {
      authToken: fimidaraAuthToken,
      rootname: fimidaraRootname ?? "fimidx",
      sourceMapsFolderpath: fimidaraSourceMapsFolderpath ?? "source-maps",
    },
    symbolication: {
      url: symbolicationUrl,
      intervalMs: symbolicationIntervalMs,
      batchSize: symbolicationBatchSize,
      maxAgeMs: symbolicationMaxAgeMs,
    },
    unzipSourceMaps: {
      url: unzipSourceMapsUrl,
      intervalMs: unzipSourceMapsIntervalMs,
    },
    purgeSourceMapCache: {
      url: purgeSourceMapCacheUrl,
      intervalMs: purgeSourceMapCacheIntervalMs,
      maxUnusedCycles: purgeSourceMapCacheMaxUnusedCycles,
    },
    nodeServerHttp: {
      port: nodeServerHttpPort,
    },
    logger: {
      fimidxProjectId: fimidxLoggerProjectId,
      fimidxClientToken: fimidxLoggerClientToken,
      fimidxServerUrl: fimidxLoggerServerUrl,
    },
    ws: {
      host: wsHost,
    },
    betterAuth: {
      url: betterAuthUrl,
      secret: betterAuthSecret,
      nextPublicUrl: nextPublicBetterAuthUrl,
    },
  });
}

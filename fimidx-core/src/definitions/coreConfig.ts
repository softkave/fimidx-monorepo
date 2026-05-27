import { z } from "zod";

export const envVars = {
  FIMIDX_POSTGRES_URL: "FIMIDX_POSTGRES_URL",
  AUTH_POSTGRES_URL: "AUTH_POSTGRES_URL",
  MONGO_URI: "MONGO_URI",
  MONGO_DB_NAME: "MONGO_DB_NAME",
  ADMIN_EMAILS: "ADMIN_EMAILS",
  STORAGE_TYPE: "STORAGE_TYPE",
  JWT_SECRET: "JWT_SECRET",
  RESEND_FROM_EMAIL: "RESEND_FROM_EMAIL",
  RESEND_API_KEY: "RESEND_API_KEY",
  FIMIDX_INTERNAL_NODE_SERVER_URL: "FIMIDX_INTERNAL_NODE_SERVER_URL",
  FIMIDX_INTERNAL_INTERNAL_ACCESS_KEY: "FIMIDX_INTERNAL_INTERNAL_ACCESS_KEY",
  INDEX_OBJS_URL: "INDEX_OBJS_URL",
  INDEX_OBJS_INTERVAL_MS: "INDEX_OBJS_INTERVAL_MS",
  CLEANUP_OBJS_URL: "CLEANUP_OBJS_URL",
  CLEANUP_OBJS_INTERVAL_MS: "CLEANUP_OBJS_INTERVAL_MS",
  FIMIDX_SOURCE_MAPS_LOCAL_DIR: "FIMIDX_SOURCE_MAPS_LOCAL_DIR",
  FIMIDARA_AUTH_TOKEN: "FIMIDARA_AUTH_TOKEN",
  FIMIDARA_ROOTNAME: "FIMIDARA_ROOTNAME",
  FIMIDARA_SOURCE_MAPS_FOLDERPATH: "FIMIDARA_SOURCE_MAPS_FOLDERPATH",
  SYMBOLICATION_URL: "SYMBOLICATION_URL",
  SYMBOLICATION_INTERVAL_MS: "SYMBOLICATION_INTERVAL_MS",
  SYMBOLICATION_LOG_BATCH_SIZE: "SYMBOLICATION_LOG_BATCH_SIZE",
  SYMBOLICATION_MAX_AGE_MS: "SYMBOLICATION_MAX_AGE_MS",
  UNZIP_SOURCE_MAPS_URL: "UNZIP_SOURCE_MAPS_URL",
  UNZIP_SOURCE_MAPS_INTERVAL_MS: "UNZIP_SOURCE_MAPS_INTERVAL_MS",
  PURGE_SOURCE_MAP_CACHE_URL: "PURGE_SOURCE_MAP_CACHE_URL",
  PURGE_SOURCE_MAP_CACHE_INTERVAL_MS: "PURGE_SOURCE_MAP_CACHE_INTERVAL_MS",
  SYMBOLICATION_LOCAL_CACHE_MAX_UNUSED_CYCLES:
    "SYMBOLICATION_LOCAL_CACHE_MAX_UNUSED_CYCLES",
  NODE_SERVER_HTTP_PORT: "NODE_SERVER_HTTP_PORT",
  NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID: "NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID",
  NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN:
    "NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN",
  NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL: "NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL",
  WS_HOST: "WS_HOST",
} as const;

export const coreConfigSchema = z
  .object({
    postgres: z.object({
      url: z
        .string({ message: `${envVars.FIMIDX_POSTGRES_URL} is not set` })
        .url({ message: `${envVars.FIMIDX_POSTGRES_URL} is not a valid URL` }),
    }),
    auth: z.object({
      postgres: z.object({
        url: z
          .string({ message: `${envVars.AUTH_POSTGRES_URL} is not set` })
          .url({ message: `${envVars.AUTH_POSTGRES_URL} is not a valid URL` }),
      }),
    }),
    mongo: z.object({
      uri: z.string({ message: `${envVars.MONGO_URI} is not set` }),
      dbName: z.string({ message: `${envVars.MONGO_DB_NAME} is not set` }),
    }),
    adminEmails: z
      .array(z.string())
      .max(100, {
        message: `${envVars.ADMIN_EMAILS} must have at most 100 comma-separated emails`,
      })
      .optional(),
    storage: z.object({
      type: z.enum(["postgres", "mongo"], {
        message: `${envVars.STORAGE_TYPE} is not set`,
      }),
    }),
    jwtSecret: z.string({ message: `${envVars.JWT_SECRET} is not set` }),
    resend: z.object({
      fromEmail: z.string({
        message: `${envVars.RESEND_FROM_EMAIL} is not set`,
      }),
      apiKey: z.string({ message: `${envVars.RESEND_API_KEY} is not set` }),
    }),
    fimidxInternal: z.object({
      nodeServerUrl: z
        .string({
          message: `${envVars.FIMIDX_INTERNAL_NODE_SERVER_URL} is not set`,
        })
        .url({
          message: `${envVars.FIMIDX_INTERNAL_NODE_SERVER_URL} is not a valid URL`,
        }),
      internalAccessKey: z.string({
        message: `${envVars.FIMIDX_INTERNAL_INTERNAL_ACCESS_KEY} is not set`,
      }),
    }),
    indexObjs: z.object({
      url: z
        .string({ message: `${envVars.INDEX_OBJS_URL} is not set` })
        .url({ message: `${envVars.INDEX_OBJS_URL} is not a valid URL` }),
      intervalMs: z.coerce
        .number()
        .optional()
        .default(1000 * 60 * 10), // 10 minutes
    }),
    cleanupObjs: z.object({
      url: z
        .string({ message: `${envVars.CLEANUP_OBJS_URL} is not set` })
        .url({ message: `${envVars.CLEANUP_OBJS_URL} is not a valid URL` }),
      intervalMs: z.coerce
        .number()
        .optional()
        .default(1000 * 60 * 60 * 24), // 1 day
    }),
    /** When set, used for unzip temp dir and symbolication local cache. */
    sourceMaps: z.object({
      localDir: z.string({
        message: `${envVars.FIMIDX_SOURCE_MAPS_LOCAL_DIR} is not set`,
      }),
    }),
    /** fimidara service auth and rootname for source map folders. */
    fimidara: z.object({
      authToken: z.string({
        message: `${envVars.FIMIDARA_AUTH_TOKEN} is not set`,
      }),
      rootname: z.string({
        message: `${envVars.FIMIDARA_ROOTNAME} is not set`,
      }),
      /**
       * Nested folder path under `rootname` that should contain all source map
       * folders (e.g. `tests/source-maps`). Allows isolating and cleaning up test
       * uploads within a shared fimidara workspace.
       */
      sourceMapsFolderpath: z.string().optional().default("source-maps"),
    }),
    symbolication: z.object({
      url: z
        .string({ message: `${envVars.SYMBOLICATION_URL} is not set` })
        .url({ message: `${envVars.SYMBOLICATION_URL} is not a valid URL` }),
      intervalMs: z.coerce
        .number()
        .optional()
        .default(1000 * 60 * 10), // 10 minutes
      batchSize: z.coerce.number().optional().default(1000),
      maxAgeMs: z.coerce
        .number()
        .optional()
        .default(10 * 60 * 1000), // 10 minutes
      concurrency: z.coerce.number().optional().default(50),
    }),
    unzipSourceMaps: z.object({
      url: z
        .string({ message: `${envVars.UNZIP_SOURCE_MAPS_URL} is not set` })
        .url({
          message: `${envVars.UNZIP_SOURCE_MAPS_URL} is not a valid URL`,
        }),
      intervalMs: z.coerce
        .number()
        .optional()
        .default(1000 * 60 * 10), // 10 minutes
    }),
    purgeSourceMapCache: z.object({
      url: z
        .string({
          message: `${envVars.PURGE_SOURCE_MAP_CACHE_URL} is not set`,
        })
        .url({
          message: `${envVars.PURGE_SOURCE_MAP_CACHE_URL} is not a valid URL`,
        }),
      intervalMs: z.coerce
        .number()
        .optional()
        .default(1000 * 60 * 60 * 24), // 1 day
      maxUnusedCycles: z.coerce.number().optional().default(10),
    }),
    nodeServerHttp: z.object({
      port: z.coerce.number({
        message: `${envVars.NODE_SERVER_HTTP_PORT} is not set`,
      }),
    }),
    logger: z.object({
      fimidxProjectId: z.string({
        message: `${envVars.NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID} is not set`,
      }),
      fimidxClientToken: z.string({
        message: `${envVars.NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN} is not set`,
      }),
      fimidxServerUrl: z
        .string()
        .url({
          message: `${envVars.NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL} is not a valid URL`,
        })
        .optional(),
    }),
    ws: z.object({
      host: z
        .string()
        .url({ message: `${envVars.WS_HOST} is not a valid URL` })
        .optional(),
    }),
  })
  .refine(
    (config) => {
      if (config.storage.type === "postgres") {
        return config.postgres.url !== undefined;
      } else if (config.storage.type === "mongo") {
        return (
          config.mongo.uri !== undefined && config.mongo.dbName !== undefined
        );
      }
      return false;
    },
    {
      message:
        "Provide postgres.url (if using postgres) or mongo.uri and mongo.dbName (if using mongo)",
      path: ["storage.type"],
    }
  );

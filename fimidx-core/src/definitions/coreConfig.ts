import { z } from "zod";

export const coreConfigSchema = z.object({
  postgres: z.object({
    url: z.string(),
  }),
  turso: z.object({
    url: z.string(),
    authToken: z.string(),
  }),
  auth: z.object({
    turso: z.object({
      url: z.string(),
      authToken: z.string(),
    }),
  }),
  mongo: z.object({
    uri: z.string(),
    dbName: z.string(),
  }),
  adminEmails: z.array(z.string()).max(100).optional(),
  storage: z.object({
    type: z.enum(["postgres", "mongo"]),
  }),
  jwtSecret: z.string(),
  resend: z.object({
    fromEmail: z.string(),
    apiKey: z.string(),
  }),
  fimidxInternal: z.object({
    nodeServerUrl: z.string(),
    internalAccessKey: z.string(),
  }),
  indexObjs: z.object({
    url: z.string(),
    intervalMs: z.coerce
      .number()
      .optional()
      .default(1000 * 60 * 10), // 10 minutes
  }),
  cleanupObjs: z.object({
    url: z.string(),
    intervalMs: z.coerce
      .number()
      .optional()
      .default(1000 * 60 * 60 * 24), // 1 day
  }),
  /** When set, used for unzip temp dir and symbolication local cache. */
  sourceMaps: z.object({
    localDir: z.string(),
  }),
  /** Fimidara service auth and rootname for source map folders. */
  fimidara: z.object({
    authToken: z.string(),
    rootname: z.string(),
  }),
  symbolication: z.object({
    url: z.string(),
    intervalMs: z.coerce
      .number()
      .optional()
      .default(1000 * 60 * 10), // 10 minutes
    batchSize: z.coerce.number().optional().default(1000),
    maxAgeMs: z.coerce
      .number()
      .optional()
      .default(1000 * 60 * 60 * 24), // 1 day
  }),
  unzipSourceMaps: z.object({
    url: z.string(),
    intervalMs: z.coerce
      .number()
      .optional()
      .default(1000 * 60 * 10), // 10 minutes
  }),
  purgeSourceMapCache: z.object({
    url: z.string(),
    intervalMs: z.coerce
      .number()
      .optional()
      .default(1000 * 60 * 60 * 24), // 1 day
    maxUnusedCycles: z.coerce.number().optional().default(10),
  }),
  nodeServerHttp: z.object({
    port: z.coerce.number(),
  }),
  logger: z.object({
    fimidxProjectId: z.string(),
    fimidxClientToken: z.string(),
    fimidxServerUrl: z.string().optional(),
  }),
  ws: z.object({
    host: z.string().optional(),
  }),
});

export type CoreConfig = z.infer<typeof coreConfigSchema>;

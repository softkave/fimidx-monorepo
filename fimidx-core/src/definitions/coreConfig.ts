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
  adminEmails: z.array(z.string()).optional(),
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
    intervalMs: z.coerce.number(),
  }),
  cleanupObjs: z.object({
    url: z.string(),
    intervalMs: z.coerce.number(),
  }),
  nodeServerHttp: z.object({
    port: z.coerce.number(),
  }),
  logger: z.object({
    fimidxAppId: z.string(),
    fimidxClientToken: z.string(),
    fimidxServerUrl: z.string().optional(),
  }),
  ws: z.object({
    host: z.string().optional(),
  }),
  fimidara: z.object({
    authToken: z.string(),
    workspaceRootname: z.string(),
    logsFolderPrefix: z.string(),
  }),
  redis: z.object({
    url: z.string(),
  }),
  consumeLogs: z.object({
    url: z.string(),
    intervalMs: z.coerce.number(),
  }),
});

export type CoreConfig = z.infer<typeof coreConfigSchema>;

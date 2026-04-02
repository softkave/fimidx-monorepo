import { z } from "zod";

const publicURL = process.env.NEXT_PUBLIC_URL;
const fimidxProjectId = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID;
const fimidxClientToken = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN;
const fimidxServerUrl = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL;
const nodeEnv = process.env.NEXT_PUBLIC_PROJECT_ENV;
const fimidxLoggerEnabled =
  process.env.NEXT_PUBLIC_FIMIDX_LOGGER_ENABLED === "true";

const clientConfigSchema = z.object({
  publicURL: z.string().url().optional(),
  fimidxProjectId: z.string(),
  fimidxClientToken: z.string(),
  fimidxServerUrl: z.string().url().optional(),
  nodeEnv: z.string(),
  fimidxLoggerEnabled: z.boolean().optional().default(false),
});

export const getClientConfig = () => {
  return clientConfigSchema.parse({
    publicURL,
    fimidxProjectId,
    fimidxClientToken,
    fimidxServerUrl,
    nodeEnv,
    fimidxLoggerEnabled,
  });
};

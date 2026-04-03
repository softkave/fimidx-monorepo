import { z } from "zod";

const publicURL = process.env.NEXT_PUBLIC_URL;
const fimidxProjectId = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID;
const fimidxClientToken = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN;
const fimidxServerUrl = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL;
const fimidxLoggerEnabled =
  process.env.NEXT_PUBLIC_FIMIDX_LOGGER_ENABLED === "true";

const clientConfigSchema = z.object({
  publicURL: z.string().url().optional(),
  fimidxLoggerEnabled: z.boolean().optional().default(false),
  fimidxProjectId: z.string(),
  fimidxClientToken: z.string(),
  fimidxServerUrl: z.string().url().optional(),
});

export const getClientConfig = () => {
  return clientConfigSchema.parse({
    publicURL,
    fimidxProjectId,
    fimidxClientToken,
    fimidxServerUrl,
    fimidxLoggerEnabled,
  });
};

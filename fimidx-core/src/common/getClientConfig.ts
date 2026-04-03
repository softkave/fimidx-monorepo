import { z } from "zod";

const publicURL = process.env.NEXT_PUBLIC_URL;
const fimidxProjectId = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID;
const fimidxClientToken = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN;
const fimidxServerUrl = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL;
const nodeEnv = process.env.NEXT_PUBLIC_PROJECT_ENV;
const fimidxLoggerEnabled =
  process.env.NEXT_PUBLIC_FIMIDX_LOGGER_ENABLED === "true";

const clientConfigSchema = z
  .object({
    publicURL: z.string().url().optional(),
    fimidxLoggerEnabled: z.boolean().optional().default(false),
    fimidxProjectId: z.string().optional(),
    fimidxClientToken: z.string().optional(),
    fimidxServerUrl: z.string().url().optional(),
    nodeEnv: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.fimidxLoggerEnabled) {
        return (
          data.fimidxProjectId && data.fimidxClientToken && data.fimidxServerUrl
        );
      }
      return true;
    },
    {
      message:
        "fimidxLoggerEnabled is true, but fimidxProjectId (NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID), " +
        "fimidxClientToken (NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN), and " +
        "fimidxServerUrl (NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL) are not set",
    }
  );

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

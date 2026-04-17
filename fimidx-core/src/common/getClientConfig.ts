import { z } from "zod";

const publicURL = process.env.NEXT_PUBLIC_URL;
const fimidxProjectId = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID;
const fimidxClientToken = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN;
const fimidxLoggerEnabled = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_ENABLED;
const fimidxLoggerMetadataApp =
  process.env.NEXT_PUBLIC_FIMIDX_LOGGER_METADATA_APP;
const fimidxSymbolicationVersion =
  process.env.NEXT_PUBLIC_FIMIDX_SYMBOLICATION_VERSION;
const fimidxSymbolicationRepo =
  process.env.NEXT_PUBLIC_FIMIDX_SYMBOLICATION_REPO;
const fimidxServerUrl = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL;

const clientConfigSchema = z.object({
  publicURL: z.string().url().optional(),
  fimidxLoggerEnabled: z.boolean().optional().default(false),
  fimidxProjectId: z.string(),
  fimidxClientToken: z.string(),
  fimidxSymbolicationVersion: z.string(),
  fimidxSymbolicationRepo: z.string(),
  fimidxLoggerMetadataApp: z.string(),
  fimidxServerUrl: z.string().url().optional(),
});

export const getClientConfig = () => {
  return clientConfigSchema.parse({
    publicURL,
    fimidxLoggerEnabled: fimidxLoggerEnabled === "true",
    fimidxProjectId,
    fimidxClientToken,
    fimidxLoggerMetadataApp,
    fimidxSymbolicationVersion,
    fimidxSymbolicationRepo,
    fimidxServerUrl,
  });
};

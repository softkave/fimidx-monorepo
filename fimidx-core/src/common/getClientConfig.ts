const publicURL = process.env.NEXT_PUBLIC_URL;
const fimidxProjectId = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID;
const fimidxClientToken = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN;
const fimidxServerUrl = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL;
const nodeEnv = process.env.NEXT_PUBLIC_PROJECT_ENV;
const fimidxLoggerEnabled =
  process.env.NEXT_PUBLIC_FIMIDX_LOGGER_ENABLED === "true";

export const getClientConfig = () => {
  return {
    publicURL,
    fimidxProjectId,
    fimidxClientToken,
    fimidxServerUrl,
    nodeEnv,
    fimidxLoggerEnabled,
  };
};

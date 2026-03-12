import assert from "assert";

const publicURL = process.env.NEXT_PUBLIC_URL;
const fimidxProjectId = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID;
const fimidxClientToken = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN;
const fimidxServerUrl = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL;
const nodeEnv = process.env.NEXT_PUBLIC_PROJECT_ENV;
const fimidxLoggerEnabled =
  process.env.NEXT_PUBLIC_FIMIDX_LOGGER_ENABLED === "true";

assert.ok(publicURL, "NEXT_PUBLIC_URL is not set");
assert.ok(fimidxProjectId, "NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID is not set");
assert.ok(
  fimidxClientToken,
  "NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN is not set"
);
assert.ok(fimidxServerUrl, "NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL is not set");
assert.ok(nodeEnv, "NEXT_PUBLIC_PROJECT_ENV is not set");

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

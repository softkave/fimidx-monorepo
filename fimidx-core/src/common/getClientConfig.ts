import assert from "assert";

const publicURL = process.env.NEXT_PUBLIC_URL;
const fimidxAppId = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_APP_ID;
const fimidxClientToken = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN;
const fimidxServerUrl = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL;
const nodeEnv = process.env.NEXT_PUBLIC_APP_ENV;

assert.ok(publicURL, "NEXT_PUBLIC_URL is not set");
assert.ok(fimidxAppId, "NEXT_PUBLIC_FIMIDX_LOGGER_APP_ID is not set");
assert.ok(
  fimidxClientToken,
  "NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN is not set"
);
assert.ok(fimidxServerUrl, "NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL is not set");
assert.ok(nodeEnv, "NEXT_PUBLIC_APP_ENV is not set");

export const getClientConfig = () => {
  return {
    publicURL,
    fimidxAppId,
    fimidxClientToken,
    fimidxServerUrl,
    nodeEnv,
  };
};

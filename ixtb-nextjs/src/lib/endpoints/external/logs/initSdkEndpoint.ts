import { initSdkSchema } from "fimidx-core/definitions/log";
import { initSdk } from "fimidx-core/serverHelpers/index";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";

export const initSdkEndpoint: NextClientTokenAuthenticatedEndpointFn<{
  fimidaraToken: string;
  folderPath: string;
  filePrefix: string;
}> = async (params) => {
  const {
    session: { clientToken },
  } = params;

  // Validate input (empty schema for now, but we validate client token)
  initSdkSchema.parse({});

  const result = await initSdk({
    clientToken,
  });

  return result;
};

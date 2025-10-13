import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { IClientToken } from "fimidx-core/definitions/clientToken";
import { getApps } from "fimidx-core/serverHelpers/index";
import { first } from "lodash-es";

export async function getApp(params: {
  input: { appId: string };
  clientToken?: IClientToken;
}) {
  const { input, clientToken } = params;
  const { apps } = await getApps({
    args: {
      query: {
        id: {
          eq: input.appId,
        },
      },
    },
  });

  const app = first(apps);
  assert.ok(
    app,
    new OwnServerError("App not found", kOwnServerErrorCodes.NotFound)
  );

  if (clientToken) {
    assert.ok(
      app?.id === clientToken.appId,
      new OwnServerError("Permission denied", kOwnServerErrorCodes.Unauthorized)
    );
  }

  return { app };
}

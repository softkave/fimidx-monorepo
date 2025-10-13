import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { getClientTokens } from "fimidx-core/serverHelpers/index";
import { first } from "lodash-es";

export async function getClientToken(params: {
  input: { clientTokenId: string };
}) {
  const { input } = params;
  const { clientTokens } = await getClientTokens({
    args: {
      // @ts-expect-error
      query: {
        id: {
          eq: input.clientTokenId,
        },
      },
    },
  });

  const clientToken = first(clientTokens);
  assert.ok(
    clientToken,
    new OwnServerError("Client token not found", kOwnServerErrorCodes.NotFound)
  );

  if (clientToken) {
    assert.ok(
      clientToken?.id === clientToken.id,
      new OwnServerError("Permission denied", kOwnServerErrorCodes.Unauthorized)
    );
  }

  return { clientToken };
}

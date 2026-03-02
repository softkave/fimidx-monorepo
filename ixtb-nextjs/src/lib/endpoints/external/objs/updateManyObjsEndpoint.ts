import {
  IUpdateManyObjsEndpointResponse,
  kObjTags,
  updateManyObjsSchema,
} from "fimidx-core/definitions/obj";
import { kByTypes } from "fimidx-core/definitions/other";
import { updateManyObjs } from "fimidx-core/serverHelpers/index";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeUpdateManyObjsInput } from "../../utils/sanitizeKId0.js";

export const updateManyObjsEndpoint: NextClientTokenAuthenticatedEndpointFn<
  IUpdateManyObjsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = updateManyObjsSchema.parse(await req.json());
  sanitizeUpdateManyObjsInput(input);
  await updateManyObjs({
    by: clientToken.id,
    byType: kByTypes.clientToken,
    tag: kObjTags.obj,
    objQuery: input.query,
    update: input.update,
    updateWay: input.updateWay,
    fieldsToIndex: input.fieldsToIndex,
    shouldIndex: input.shouldIndex,
    count: input.count,
  });

  return {
    success: true,
  };
};

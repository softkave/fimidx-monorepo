import { deleteManyObjsSchema, kObjTags } from "fimidx-core/definitions/obj";
import { kByTypes } from "fimidx-core/definitions/other";
import { deleteManyObjs } from "fimidx-core/serverHelpers/index";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeDeleteManyObjsInput } from "../../utils/sanitizeKId0.js";

export const deleteManyObjsEndpoint: NextClientTokenAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = deleteManyObjsSchema.parse(await req.json());
  sanitizeDeleteManyObjsInput(input);
  await deleteManyObjs({
    deletedBy: clientToken.id,
    deletedByType: kByTypes.clientToken,
    objQuery: input.query,
    tag: kObjTags.obj,
    deleteMany: input.deleteMany ?? false,
  });
};

import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type {
  AddAppEndpointArgs,
  AddAppEndpointResponse,
  IAppObjRecord,
} from "../../definitions/app.js";
import { kObjTags } from "../../definitions/obj.js";
import { kId0 } from "../../definitions/system.js";
import type { IObjStorage } from "../../storage/types.js";
import { setManyObjs } from "../obj/setObjs.js";
import { objToApp } from "./objToApp.js";

export async function addApp(params: {
  args: AddAppEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
}): Promise<AddAppEndpointResponse> {
  const { args, by, byType, storage } = params;
  const { name, description, orgId: groupId, objFieldsToIndex } = args;
  const objRecord: IAppObjRecord = {
    name,
    description,
    orgId: groupId,
    objFieldsToIndex: objFieldsToIndex
      ? Array.from(new Set(objFieldsToIndex))
      : null,
  };

  const { failedItems, newObjs } = await setManyObjs({
    by,
    byType,
    groupId,
    tag: kObjTags.app,
    input: {
      appId: kId0,
      items: [objRecord],
      conflictOnKeys: ["name", "groupId"],
      onConflict: "fail",
      fieldsToIndex: objFieldsToIndex
        ? Array.from(new Set(objFieldsToIndex))
        : undefined,
    },
    storage,
  });

  assert.ok(
    failedItems.length === 0,
    new OwnServerError(
      "Failed to add app",
      kOwnServerErrorCodes.InternalServerError
    )
  );
  assert.ok(
    newObjs.length === 1,
    new OwnServerError(
      "Failed to add app",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  const app = objToApp(newObjs[0]);
  const response: AddAppEndpointResponse = {
    app,
  };

  return response;
}

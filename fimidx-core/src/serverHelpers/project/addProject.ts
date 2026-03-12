import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import { kObjTags } from "../../definitions/obj.js";
import type {
  AddProjectEndpointArgs,
  AddProjectEndpointResponse,
  IProjectObjRecord,
} from "../../definitions/project.js";
import { kId0 } from "../../definitions/system.js";
import type { IObjStorage } from "../../storage/types.js";
import { setManyObjs } from "../obj/setObjs.js";
import { objToProject } from "./objToProject.js";

export async function addProject(params: {
  args: AddProjectEndpointArgs;
  by: string;
  byType: string;
  storage?: IObjStorage;
}): Promise<AddProjectEndpointResponse> {
  const { args, by, byType, storage } = params;
  const { name, description, orgId: groupId, objFieldsToIndex } = args;
  const objRecord: IProjectObjRecord = {
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
    tag: kObjTags.project,
    input: {
      projectId: kId0,
      items: [objRecord],
      conflictOnKeys: ["name", "orgId"],
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
      "Failed to add project",
      kOwnServerErrorCodes.InternalServerError
    )
  );
  assert.ok(
    newObjs.length === 1,
    new OwnServerError(
      "Failed to add project",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  const project = objToProject(newObjs[0]);
  const response: AddProjectEndpointResponse = {
    project,
  };

  return response;
}

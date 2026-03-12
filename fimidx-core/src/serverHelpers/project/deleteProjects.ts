import { type DeleteProjectsEndpointArgs } from "../../definitions/index.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { deleteManyObjs } from "../obj/deleteObjs.js";
import { getProjectsObjQuery } from "./getProjects.js";

export async function deleteProjects(
  params: DeleteProjectsEndpointArgs & {
    by: string;
    byType: string;
    storage?: IObjStorage;
  }
) {
  const { deleteMany, by, byType, storage, ...args } = params;
  const objQuery = getProjectsObjQuery({ args });
  await deleteManyObjs({
    objQuery,
    tag: kObjTags.project,
    deletedBy: by,
    deletedByType: byType,
    deleteMany,
    storage,
  });
}

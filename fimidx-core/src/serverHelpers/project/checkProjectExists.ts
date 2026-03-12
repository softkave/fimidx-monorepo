import { first } from "lodash-es";
import { OwnServerError } from "../../common/error.js";
import { getProjects } from "./getProjects.js";

export async function checkProjectExists(params: {
  name: string;
  isId?: string;
  groupId: string;
}) {
  const { projects } = await getProjects({
    args: {
      query: {
        orgId: params.groupId,
        name: {
          eq: params.name,
        },
      },
      limit: 1,
    },
  });

  const project = first(projects);
  const isId = project && params.isId === project.id;

  return {
    exists: !!project,
    isId: isId || false,
  };
}

export async function checkProjectAvailable(params: {
  name: string;
  isId?: string;
  groupId: string;
}) {
  const { exists, isId } = await checkProjectExists(params);

  if (exists && !isId) {
    throw new OwnServerError("Project already exists", 400);
  }

  return {
    available: !exists,
  };
}

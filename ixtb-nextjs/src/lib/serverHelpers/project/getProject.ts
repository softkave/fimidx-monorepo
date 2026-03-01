import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { IClientToken } from "fimidx-core/definitions/clientToken";
import { getProjects } from "fimidx-core/serverHelpers/index";
import { first } from "lodash-es";

export async function getProject(params: {
  input: { projectId: string };
  clientToken?: IClientToken;
}) {
  const { input, clientToken } = params;
  const { projects } = await getProjects({
    args: {
      query: {
        id: {
          eq: input.projectId,
        },
      },
    },
  });

  const project = first(projects);
  assert.ok(
    project,
    new OwnServerError("Project not found", kOwnServerErrorCodes.NotFound)
  );

  if (clientToken) {
    assert.ok(
      project?.id === clientToken.projectId,
      new OwnServerError("Permission denied", kOwnServerErrorCodes.Unauthorized)
    );
  }

  return { project };
}

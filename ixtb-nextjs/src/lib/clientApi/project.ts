import {
  AddProjectEndpointResponse,
  addProjectSchema,
  deleteProjectsSchema,
  GetProjectsEndpointResponse,
  projectQuerySchema,
  UpdateProjectEndpointResponse,
  updateProjectsSchema,
} from "fimidx-core/definitions/project";
import { convertToArray } from "softkave-js-utils";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { z } from "zod";
import { kApiProjectKeys } from "./apikeys.ts";
import { kProjectSWRKeys } from "./swrkeys.ts";
import {
  handleResponse,
  IUseMutationHandlerOpts,
  useMutationHandler,
} from "./utils.ts";

async function addProject(
  key: ReturnType<typeof kProjectSWRKeys.addProject>,
  params: {
    arg: z.infer<typeof addProjectSchema>;
  }
) {
  const res = await fetch(key, {
    method: "POST",
    body: JSON.stringify(params.arg),
  });

  return await handleResponse<AddProjectEndpointResponse>(res);
}

export type AddProjectOnSuccessParams = [
  params: Parameters<typeof addProject>,
  res: Awaited<ReturnType<typeof addProject>>
];

export function useAddProject(
  opts: IUseMutationHandlerOpts<typeof addProject>
) {
  const mutationHandler = useMutationHandler(addProject, {
    ...opts,
    invalidate: [
      kApiProjectKeys.getProjects(),
      ...convertToArray(opts.invalidate || []),
    ],
  });

  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    kProjectSWRKeys.addProject(),
    mutationHandler
  );

  return { trigger, data, error, isMutating, reset };
}

export async function getProjects(
  key: ReturnType<typeof kProjectSWRKeys.getProjects>
) {
  const [url, opts] = key;
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(opts),
  });

  return await handleResponse<GetProjectsEndpointResponse>(res);
}

export function useGetProjects(opts: {
  page?: number;
  limit?: number;
  query: z.infer<typeof projectQuerySchema>;
}) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    kProjectSWRKeys.getProjects({
      query: opts.query,
      page: opts.page,
      limit: opts.limit,
    }),
    getProjects
  );

  return { data, error, isLoading, isValidating, mutate };
}

async function updateProject(
  key: ReturnType<typeof kProjectSWRKeys.updateProject>,
  params: {
    arg: z.infer<typeof updateProjectsSchema>;
  }
) {
  const res = await fetch(key, {
    method: "PATCH",
    body: JSON.stringify(params.arg),
  });

  return await handleResponse<UpdateProjectEndpointResponse>(res);
}

export type UpdateProjectOnSuccessParams = [
  params: Parameters<typeof updateProject>,
  res: Awaited<ReturnType<typeof updateProject>>
];

export function useUpdateProject(
  opts: IUseMutationHandlerOpts<typeof updateProject>
) {
  const mutationHandler = useMutationHandler(updateProject, {
    ...opts,
    invalidate: [
      kApiProjectKeys.getProjects(),
      ...convertToArray(opts.invalidate || []),
    ],
  });

  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    kProjectSWRKeys.updateProject(),
    mutationHandler
  );

  return { trigger, data, error, isMutating, reset };
}

async function deleteProject(
  key: ReturnType<typeof kProjectSWRKeys.deleteProject>,
  params: {
    arg: z.infer<typeof deleteProjectsSchema>;
  }
) {
  const res = await fetch(key, {
    method: "DELETE",
    body: JSON.stringify(params.arg),
  });

  return await handleResponse(res);
}

export type DeleteProjectOnSuccessParams = [
  params: Parameters<typeof deleteProject>,
  res: Awaited<ReturnType<typeof deleteProject>>
];

export function useDeleteProject(
  opts: IUseMutationHandlerOpts<typeof deleteProject>
) {
  const mutationHandler = useMutationHandler(deleteProject, {
    ...opts,
    invalidate: [
      kApiProjectKeys.getProjects(),
      ...convertToArray(opts.invalidate || []),
    ],
  });

  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    kProjectSWRKeys.deleteProject(),
    mutationHandler
  );

  return { trigger, data, error, isMutating, reset };
}

import {
  AddOrgEndpointResponse,
  addOrgSchema,
  deleteOrgSchema,
  GetOrgEndpointResponse,
  GetOrgsEndpointResponse,
  UpdateOrgEndpointResponse,
  updateOrgSchema,
} from "@/src/definitions/org.ts";
import type { GetOrgMembersEndpointResponse } from "@/src/lib/endpoints/internal/orgs/getOrgMembersEndpoint";
import { first } from "lodash-es";
import { convertToArray } from "softkave-js-utils";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { z } from "zod";
import { kOrgSWRKeys } from "./swrkeys.ts";
import {
  handleResponse,
  IUseMutationHandlerOpts,
  useMutationHandler,
} from "./utils.ts";

async function addOrg(
  key: ReturnType<typeof kOrgSWRKeys.addOrg>,
  params: {
    arg: z.infer<typeof addOrgSchema>;
  }
) {
  const res = await fetch(key, {
    method: "POST",
    body: JSON.stringify(params.arg),
  });

  return await handleResponse<AddOrgEndpointResponse>(res);
}

export type AddOrgOnSuccessParams = [
  params: Parameters<typeof addOrg>,
  res: Awaited<ReturnType<typeof addOrg>>
];

export function useAddOrg(opts: IUseMutationHandlerOpts<typeof addOrg> = {}) {
  const mutationHandler = useMutationHandler(addOrg, {
    ...opts,
    invalidate: [
      // Use only the first key to invalidate the cache
      first(kOrgSWRKeys.getOrgs({})),
      ...convertToArray(opts.invalidate || []),
    ],
  });

  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    kOrgSWRKeys.addOrg(),
    mutationHandler
  );

  return { trigger, data, error, isMutating, reset };
}

export async function getOrgs(key: ReturnType<typeof kOrgSWRKeys.getOrgs>) {
  const [url, args] = key;
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(args),
  });

  return await handleResponse<GetOrgsEndpointResponse>(res);
}

export function useGetOrgs(opts: { page?: number; limit?: number } = {}) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    kOrgSWRKeys.getOrgs(opts),
    getOrgs
  );

  return { data, error, isLoading, isValidating, mutate };
}

async function getOrg(key: ReturnType<typeof kOrgSWRKeys.getOrg>) {
  const res = await fetch(key, {
    method: "GET",
  });

  return await handleResponse<GetOrgEndpointResponse>(res);
}

export function useGetOrg(opts: { orgId: string }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    kOrgSWRKeys.getOrg(opts.orgId),
    getOrg
  );

  return { data, error, isLoading, isValidating, mutate };
}

async function getOrgMembers(
  key: ReturnType<typeof kOrgSWRKeys.getOrgMembers>
) {
  const res = await fetch(key, {
    method: "GET",
  });

  return await handleResponse<GetOrgMembersEndpointResponse>(res);
}

export function useGetOrgMembers(opts: { orgId: string }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    opts.orgId ? kOrgSWRKeys.getOrgMembers(opts.orgId) : null,
    getOrgMembers
  );

  return { data, error, isLoading, isValidating, mutate };
}

async function updateOrg(
  key: ReturnType<typeof kOrgSWRKeys.updateOrg>,
  params: {
    arg: z.infer<typeof updateOrgSchema>;
  }
) {
  const res = await fetch(key, {
    method: "PATCH",
    body: JSON.stringify(params.arg),
  });

  return await handleResponse<UpdateOrgEndpointResponse>(res);
}

export type UpdateOrgOnSuccessParams = [
  params: Parameters<typeof updateOrg>,
  res: Awaited<ReturnType<typeof updateOrg>>
];

export function useUpdateOrg(
  opts: IUseMutationHandlerOpts<typeof updateOrg> & { orgId: string }
) {
  const mutationHandler = useMutationHandler(updateOrg, {
    ...opts,
    invalidate: [
      // Use only the first key to invalidate the cache
      first(kOrgSWRKeys.getOrgs({})),
      kOrgSWRKeys.getOrg(opts.orgId),
      ...convertToArray(opts.invalidate || []),
    ],
  });

  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    kOrgSWRKeys.updateOrg(opts.orgId),
    mutationHandler
  );

  return { trigger, data, error, isMutating, reset };
}

async function deleteOrg(
  key: ReturnType<typeof kOrgSWRKeys.deleteOrg>,
  params: {
    arg: z.infer<typeof deleteOrgSchema>;
  }
) {
  const res = await fetch(key, {
    method: "DELETE",
    body: JSON.stringify(params.arg),
  });

  return await handleResponse(res);
}

export type DeleteOrgOnSuccessParams = [
  params: Parameters<typeof deleteOrg>,
  res: Awaited<ReturnType<typeof deleteOrg>>
];

export function useDeleteOrg(
  opts: IUseMutationHandlerOpts<typeof deleteOrg> & { orgId: string }
) {
  const mutationHandler = useMutationHandler(deleteOrg, {
    ...opts,
    invalidate: [
      // Use only the first key to invalidate the cache
      first(kOrgSWRKeys.getOrgs({})),
      kOrgSWRKeys.getOrg(opts.orgId),
      ...convertToArray(opts.invalidate || []),
    ],
  });

  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    kOrgSWRKeys.deleteOrg(opts.orgId),
    mutationHandler
  );

  return { trigger, data, error, isMutating, reset };
}

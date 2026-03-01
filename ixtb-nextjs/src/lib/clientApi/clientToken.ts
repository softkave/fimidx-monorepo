import {
  AddClientTokenEndpointResponse,
  addClientTokenSchema,
  deleteClientTokensSchema,
  EncodeClientTokenJWTEndpointResponse,
  encodeClientTokenJWTSchema,
  GetClientTokensEndpointArgs,
  GetClientTokensEndpointResponse,
  UpdateClientTokensEndpointResponse,
  updateClientTokensSchema,
} from "fimidx-core/definitions/clientToken";
import { first } from "lodash-es";
import { convertToArray } from "softkave-js-utils";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { z } from "zod";
import { kClientTokenSWRKeys } from "./swrkeys.ts";
import {
  handleResponse,
  IUseMutationHandlerOpts,
  useMutationHandler,
} from "./utils.ts";

async function addClientToken(
  key: ReturnType<typeof kClientTokenSWRKeys.addClientToken>,
  params: {
    arg: z.infer<typeof addClientTokenSchema>;
  }
) {
  const res = await fetch(key, {
    method: "POST",
    body: JSON.stringify(params.arg),
  });

  return await handleResponse<AddClientTokenEndpointResponse>(res);
}

export type AddClientTokenOnSuccessParams = [
  params: Parameters<typeof addClientToken>,
  res: Awaited<ReturnType<typeof addClientToken>>
];

export function useAddClientToken(
  opts: IUseMutationHandlerOpts<typeof addClientToken> & {
    projectId: string;
  }
) {
  const mutationHandler = useMutationHandler(addClientToken, {
    ...opts,
    invalidate: [
      // TODO: We need to implement a partial match for the invalidate key.
      // @ts-expect-error
      first(kClientTokenSWRKeys.getClientTokens()),
      ...convertToArray(opts.invalidate || []),
    ],
  });

  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    kClientTokenSWRKeys.addClientToken(),
    mutationHandler
  );

  return { trigger, data, error, isMutating, reset };
}

export async function getClientTokens(
  key: ReturnType<typeof kClientTokenSWRKeys.getClientTokens>
) {
  const [url, opts] = key;
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(opts),
  });

  return await handleResponse<GetClientTokensEndpointResponse>(res);
}

export function useGetClientTokens(opts: GetClientTokensEndpointArgs) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    kClientTokenSWRKeys.getClientTokens(opts),
    getClientTokens
  );

  return { data, error, isLoading, isValidating, mutate };
}

async function updateClientTokens(
  key: ReturnType<typeof kClientTokenSWRKeys.updateClientTokens>,
  params: {
    arg: z.infer<typeof updateClientTokensSchema>;
  }
) {
  const res = await fetch(key, {
    method: "PATCH",
    body: JSON.stringify(params.arg),
  });

  return await handleResponse<UpdateClientTokensEndpointResponse>(res);
}

export type UpdateClientTokensOnSuccessParams = [
  params: Parameters<typeof updateClientTokens>,
  res: Awaited<ReturnType<typeof updateClientTokens>>
];

export function useUpdateClientTokens(
  opts: IUseMutationHandlerOpts<typeof updateClientTokens>
) {
  const mutationHandler = useMutationHandler(updateClientTokens, {
    ...opts,
    invalidate: [
      // TODO: We need to implement a partial match for the invalidate key.
      // @ts-expect-error
      first(kClientTokenSWRKeys.getClientTokens()),
      ...convertToArray(opts.invalidate || []),
    ],
  });

  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    kClientTokenSWRKeys.updateClientTokens(),
    mutationHandler
  );

  return { trigger, data, error, isMutating, reset };
}

async function deleteClientTokens(
  key: ReturnType<typeof kClientTokenSWRKeys.deleteClientTokens>,
  params: {
    arg: z.infer<typeof deleteClientTokensSchema>;
  }
) {
  const res = await fetch(key, {
    method: "DELETE",
    body: JSON.stringify(params.arg),
  });

  return await handleResponse(res);
}

export type DeleteClientTokensOnSuccessParams = [
  params: Parameters<typeof deleteClientTokens>,
  res: Awaited<ReturnType<typeof deleteClientTokens>>
];

export function useDeleteClientTokens(
  opts: IUseMutationHandlerOpts<typeof deleteClientTokens>
) {
  const mutationHandler = useMutationHandler(deleteClientTokens, {
    ...opts,
    invalidate: [
      // TODO: We need to implement a partial match for the invalidate key.
      // @ts-expect-error
      first(kClientTokenSWRKeys.getClientTokens()),
      ...convertToArray(opts.invalidate || []),
    ],
  });

  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    kClientTokenSWRKeys.deleteClientTokens(),
    mutationHandler
  );

  return { trigger, data, error, isMutating, reset };
}

async function encodeClientTokenJWT(
  key: ReturnType<typeof kClientTokenSWRKeys.encodeClientTokenJWT>,
  params: {
    arg: z.infer<typeof encodeClientTokenJWTSchema>;
  }
) {
  const res = await fetch(key, {
    method: "POST",
    body: JSON.stringify(params.arg),
  });

  return await handleResponse<EncodeClientTokenJWTEndpointResponse>(res);
}

export function useEncodeClientTokenJWT(opts: { clientTokenId: string }) {
  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    kClientTokenSWRKeys.encodeClientTokenJWT(opts.clientTokenId),
    encodeClientTokenJWT
  );

  return { trigger, data, error, isMutating, reset };
}

"use client";

import { convertToArray } from "softkave-js-utils";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { kApiSourceMapKeys } from "./apikeys.ts";
import {
  handleResponse,
  IUseMutationHandlerOpts,
  useMutationHandler,
} from "./utils.ts";

export interface ISymbolicationConfigData {
  config: {
    fieldsToSymbolicate: string[];
    repoIdFields: string[];
    versionFields: string[];
  } | null;
}

export interface ISourceMapUploadsData {
  uploads: Array<{
    repoIdentifier: string;
    version: string;
    repoIdentifierDisplay: string;
    versionDisplay: string;
    uploadedAt: string;
    isZip: boolean;
  }>;
}

export async function getSymbolicationConfig(
  key: string
): Promise<ISymbolicationConfigData> {
  const res = await fetch(key, { credentials: "include" });
  return await handleResponse<ISymbolicationConfigData>(res);
}

export function useGetSymbolicationConfig(projectId: string) {
  const key = kApiSourceMapKeys.getConfig(projectId);
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    getSymbolicationConfig
  );
  return { data, error, isLoading, isValidating, mutate };
}

export async function getSourceMapUploads(
  key: string
): Promise<ISourceMapUploadsData> {
  const res = await fetch(key, { credentials: "include" });
  return await handleResponse<ISourceMapUploadsData>(res);
}

export function useGetSourceMapUploads(projectId: string) {
  const key = kApiSourceMapKeys.getUploads(projectId);
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    getSourceMapUploads
  );
  return { data, error, isLoading, isValidating, mutate };
}

export interface IUpdateSymbolicationConfigArg {
  projectId: string;
  fieldsToSymbolicate: string[];
  repoIdFields: string[];
  versionFields: string[];
}

async function updateSymbolicationConfig(
  _key: ReturnType<typeof kApiSourceMapKeys.updateConfig>,
  params: { arg: IUpdateSymbolicationConfigArg }
) {
  const res = await fetch(kApiSourceMapKeys.updateConfig(), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params.arg),
  });
  return await handleResponse(res);
}

export function useUpdateSymbolicationConfig(
  opts: IUseMutationHandlerOpts<typeof updateSymbolicationConfig> & {
    projectId: string;
  }
) {
  const { projectId, ...rest } = opts;
  const mutationHandler = useMutationHandler(updateSymbolicationConfig, {
    ...rest,
    invalidate: [
      kApiSourceMapKeys.getConfig(projectId),
      ...convertToArray(rest.invalidate || []),
    ],
  });

  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    kApiSourceMapKeys.updateConfig(),
    mutationHandler
  );

  return { trigger, data, error, isMutating, reset };
}

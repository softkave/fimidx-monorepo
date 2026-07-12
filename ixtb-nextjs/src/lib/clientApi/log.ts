import {
  GetLogFieldsEndpointArgs,
  GetLogFieldsEndpointResponse,
  GetLogsEndpointArgs,
  GetLogsEndpointResponse,
} from "fimidx-core/definitions/log";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { kLogSWRKeys } from "./swrkeys";
import { handleResponse } from "./utils";

export async function getLogs(key: ReturnType<typeof kLogSWRKeys.retrieve>) {
  const [url, args] = key;
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(args),
  });

  return await handleResponse<GetLogsEndpointResponse>(res);
}

export function useGetLogs(opts: GetLogsEndpointArgs) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    kLogSWRKeys.retrieve(opts),
    getLogs,
    {
      keepPreviousData: true,
    }
  );

  return { data, error, isLoading, isValidating, mutate };
}

export type IGetLogsInfiniteQuery = GetLogsEndpointArgs["query"];

export function useGetLogsInfinite(params: {
  query: IGetLogsInfiniteQuery;
  limit?: number;
}) {
  const { query, limit = 100 } = params;

  const getKey = (
    pageIndex: number,
    previousPageData: GetLogsEndpointResponse | null
  ) => {
    if (previousPageData && !previousPageData.hasMore) {
      return null;
    }

    return kLogSWRKeys.retrieve({
      page: pageIndex + 1,
      limit,
      query,
    });
  };

  const { data, error, isLoading, isValidating, setSize, mutate } =
    useSWRInfinite(getKey, getLogs, {
      keepPreviousData: true,
    });

  const logs = data?.flatMap((page) => page?.logs ?? []) ?? [];
  const hasMore = data?.length
    ? (data[data.length - 1]?.hasMore ?? false)
    : false;

  return {
    logs,
    error,
    isLoading: isLoading && logs.length === 0,
    isLoadingMore: isValidating && logs.length > 0,
    hasMore,
    setSize,
    mutate,
  };
}

export async function getLogFields(
  key: ReturnType<typeof kLogSWRKeys.getLogFields>
) {
  const [url, args] = key;
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(args),
  });

  return await handleResponse<GetLogFieldsEndpointResponse>(res);
}

export function useGetLogFields(opts: GetLogFieldsEndpointArgs) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    kLogSWRKeys.getLogFields(opts),
    getLogFields
  );

  return { data, error, isLoading, isValidating, mutate };
}

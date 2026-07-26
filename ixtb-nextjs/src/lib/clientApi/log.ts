import {
  GetLogFieldsEndpointResponse,
  GetLogsEndpointArgs,
  GetLogsEndpointResponse,
} from "fimidx-core/definitions/log";
import { useMemo } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { kLogSWRKeys } from "./swrkeys";
import { handleResponse } from "./utils";
import { uniq } from "lodash-es";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

/** Resolve exact field paths (e.g. already-selected filter fields). */
export function useGetLogFieldsByPaths(params: {
  projectId: string;
  paths: string[];
}) {
  const { projectId, paths } = params;
  const uniquePaths = useMemo(() => {
    return uniq(paths);
  }, [paths]);

  const key =
    uniquePaths.length === 0
      ? null
      : kLogSWRKeys.getLogFields({
          page: 1,
          limit: Math.max(uniquePaths.length, 1),
          query: {
            projectId,
            path: { in: uniquePaths },
          },
        });

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    getLogFields
  );

  const fields = data?.fields;
  const stableFields = useMemo(() => fields ?? [], [fields]);

  return {
    fields: stableFields,
    error,
    isLoading: key != null && isLoading,
    isValidating,
    mutate,
  };
}

export function useGetLogFieldsInfinite(params: {
  projectId: string;
  path?: string;
  limit?: number;
}) {
  const { projectId, path, limit = 50 } = params;
  const trimmedPath = path?.trim() || undefined;

  const getKey = (
    pageIndex: number,
    previousPageData: GetLogFieldsEndpointResponse | null
  ) => {
    if (previousPageData && !previousPageData.hasMore) {
      return null;
    }

    return kLogSWRKeys.getLogFields({
      page: pageIndex + 1,
      limit,
      query: {
        projectId,
        ...(trimmedPath ? { path: { like: escapeRegex(trimmedPath) } } : {}),
      },
    });
  };

  const { data, error, isLoading, isValidating, setSize, mutate } =
    useSWRInfinite(getKey, getLogFields, {
      // Avoid showing the previous (unfiltered) page while a new search loads.
      keepPreviousData: false,
      revalidateFirstPage: true,
    });

  const fields = useMemo(() => {
    const pages = data ?? [];
    const byPath = new Map<string, (typeof pages)[number]["fields"][number]>();
    for (const page of pages) {
      for (const field of page?.fields ?? []) {
        if (!byPath.has(field.path)) {
          byPath.set(field.path, field);
        }
      }
    }
    return Array.from(byPath.values());
  }, [data]);

  const hasMore = data?.length
    ? (data[data.length - 1]?.hasMore ?? false)
    : false;

  return {
    fields,
    error,
    isLoading: isLoading && fields.length === 0,
    isLoadingMore: isValidating && fields.length > 0,
    hasMore,
    setSize,
    mutate,
  };
}

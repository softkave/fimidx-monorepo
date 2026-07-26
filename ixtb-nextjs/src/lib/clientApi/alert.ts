import {
  GetAlertsEndpointArgs,
  IAcknowledgeAlertEndpointResponse,
  IGetAlertEndpointResponse,
  IGetAlertsEndpointResponse,
} from "fimidx-core/definitions/alert";
import { GetLogsEndpointResponse } from "fimidx-core/definitions/log";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { kAlertSWRKeys } from "./swrkeys";
import { handleResponse } from "./utils";

export async function getAlerts(
  key: ReturnType<typeof kAlertSWRKeys.getAlerts>
) {
  const [url, args] = key;
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(args),
  });
  return await handleResponse<IGetAlertsEndpointResponse>(res);
}

export function useGetAlerts(opts: GetAlertsEndpointArgs) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    kAlertSWRKeys.getAlerts(opts),
    getAlerts,
    { keepPreviousData: true }
  );
  return { data, error, isLoading, isValidating, mutate };
}

export async function getAlert(alertId: string) {
  const res = await fetch(kAlertSWRKeys.getAlert(alertId), {
    method: "GET",
  });
  return await handleResponse<IGetAlertEndpointResponse>(res);
}

export function useGetAlert(alertId: string | undefined) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    alertId ? kAlertSWRKeys.getAlert(alertId) : null,
    () => getAlert(alertId!)
  );
  return { data, error, isLoading, isValidating, mutate };
}

export async function acknowledgeAlert(
  alertId: string,
  acknowledged: boolean = true
) {
  const res = await fetch(kAlertSWRKeys.acknowledgeAlert(alertId), {
    method: "POST",
    body: JSON.stringify({ alertId, acknowledged }),
  });
  return await handleResponse<IAcknowledgeAlertEndpointResponse>(res);
}

export async function getAlertLogs(key: ReturnType<
  typeof kAlertSWRKeys.getAlertLogs
>) {
  const [url, args] = key;
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(args),
  });
  return await handleResponse<GetLogsEndpointResponse>(res);
}

export function useGetAlertLogsInfinite(params: {
  alertId: string;
  limit?: number;
}) {
  const { alertId, limit = 50 } = params;

  const getKey = (
    pageIndex: number,
    previousPageData: GetLogsEndpointResponse | null
  ) => {
    if (previousPageData && !previousPageData.hasMore) {
      return null;
    }
    return kAlertSWRKeys.getAlertLogs({
      alertId,
      page: pageIndex + 1,
      limit,
    });
  };

  const { data, error, isLoading, isValidating, setSize, mutate } =
    useSWRInfinite(getKey, getAlertLogs, { keepPreviousData: true });

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

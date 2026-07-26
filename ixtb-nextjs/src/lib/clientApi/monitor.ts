import {
  AddMonitorEndpointArgs,
  DeleteMonitorsEndpointArgs,
  GetMonitorsEndpointArgs,
  IAddMonitorEndpointResponse,
  IGetMonitorsEndpointResponse,
  IUpdateMonitorsEndpointResponse,
  UpdateMonitorsEndpointArgs,
} from "fimidx-core/definitions/monitor";
import useSWR from "swr";
import { kMonitorSWRKeys } from "./swrkeys";
import { handleResponse } from "./utils";

export type IRunMonitorClientResult = {
  skipped: boolean;
  suppressedReason?: string | null;
  matchCount: number;
  alertCreated: boolean;
  alertId?: string | null;
  monitorRunId?: string | null;
  error?: string | null;
  durationMs: number;
};

export async function getMonitors(
  key: ReturnType<typeof kMonitorSWRKeys.getMonitors>
) {
  const [url, args] = key;
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(args),
  });
  return await handleResponse<IGetMonitorsEndpointResponse>(res);
}

export function useGetMonitors(opts: GetMonitorsEndpointArgs) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    kMonitorSWRKeys.getMonitors(opts),
    getMonitors,
    { keepPreviousData: true }
  );
  return { data, error, isLoading, isValidating, mutate };
}

export async function addMonitor(args: AddMonitorEndpointArgs) {
  const res = await fetch(kMonitorSWRKeys.addMonitor(), {
    method: "POST",
    body: JSON.stringify(args),
  });
  return await handleResponse<IAddMonitorEndpointResponse>(res);
}

export async function updateMonitors(
  monitorId: string,
  args: UpdateMonitorsEndpointArgs
) {
  const res = await fetch(kMonitorSWRKeys.updateMonitor(monitorId), {
    method: "PATCH",
    body: JSON.stringify(args),
  });
  return await handleResponse<IUpdateMonitorsEndpointResponse>(res);
}

export async function deleteMonitors(args: DeleteMonitorsEndpointArgs) {
  const res = await fetch(kMonitorSWRKeys.deleteMonitor(), {
    method: "DELETE",
    body: JSON.stringify(args),
  });
  return await handleResponse<{ success?: boolean }>(res);
}

export async function runMonitorNow(monitorId: string) {
  const res = await fetch(kMonitorSWRKeys.runMonitor(monitorId), {
    method: "POST",
    body: JSON.stringify({ monitorId }),
  });
  return await handleResponse<IRunMonitorClientResult>(res);
}

export async function previewMonitor(monitorId: string) {
  const res = await fetch(kMonitorSWRKeys.previewMonitor(monitorId), {
    method: "POST",
    body: JSON.stringify({ monitorId }),
  });
  return await handleResponse(res);
}

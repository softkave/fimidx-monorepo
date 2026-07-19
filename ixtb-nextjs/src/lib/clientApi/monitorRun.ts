import {
  GetMonitorRunsEndpointArgs,
  IGetMonitorRunsEndpointResponse,
} from "fimidx-core/definitions/monitorRun";
import useSWR from "swr";
import { kMonitorRunSWRKeys } from "./swrkeys";
import { handleResponse } from "./utils";

export async function getMonitorRuns(
  key: ReturnType<typeof kMonitorRunSWRKeys.getMonitorRuns>
) {
  const [url, args] = key;
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(args),
  });
  return await handleResponse<IGetMonitorRunsEndpointResponse>(res);
}

export function useGetMonitorRuns(opts: GetMonitorRunsEndpointArgs) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    kMonitorRunSWRKeys.getMonitorRuns(opts),
    getMonitorRuns,
    { keepPreviousData: true }
  );
  return { data, error, isLoading, isValidating, mutate };
}

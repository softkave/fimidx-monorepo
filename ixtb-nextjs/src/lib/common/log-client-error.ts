import { ixtbConsoleLogger } from "./ixtb-loggers";

export interface ILogClientErrorParams {
  error: unknown;
  /** Where the error surfaced, e.g. "RootErrorBoundary". */
  source: string;
  componentStack?: string | null;
  /** Next.js error digest, present on errors thrown during SSR. */
  digest?: string;
}

/**
 * Single reporting path for UI errors so route boundaries (`error.tsx`,
 * `global-error.tsx`) and the `ErrorBoundary` component produce identical logs.
 */
export function logClientError(params: ILogClientErrorParams): void {
  const { error, source, componentStack, digest } = params;

  ixtbConsoleLogger.error(error);
  ixtbConsoleLogger.error({
    source,
    ...(digest ? { digest } : {}),
    ...(componentStack ? { componentStack } : {}),
  });
}

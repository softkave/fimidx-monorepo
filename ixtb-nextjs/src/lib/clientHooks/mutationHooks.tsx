import { isString } from "lodash-es";
import { useCallback } from "react";
import { toast } from "sonner";
import { ixtbConsoleLogger } from "../common/ixtb-loggers";

export function useMutationFnWithRetry<
  TFn extends (...args: unknown[]) => unknown
>(fn: TFn) {
  const wrapper = useCallback(
    async (...args: Parameters<TFn>) => {
      try {
        return await fn(...args);
      } catch (error) {
        ixtbConsoleLogger.error({
          message: "Error in mutation function",
          error: JSON.stringify(error),
        });
        toast.error("Error", {
          description: isString((error as Error | undefined)?.message)
            ? (error as Error).message
            : "An error occurred",
          action: {
            label: "Retry",
            onClick: () => wrapper(...args),
          },
        });
      }
    },
    [fn]
  );

  return wrapper;
}

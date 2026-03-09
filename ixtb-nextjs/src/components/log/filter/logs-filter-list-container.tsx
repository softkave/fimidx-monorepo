"use client";

import { useGetLogFields } from "@/src/lib/clientApi/log.ts";
import { cn } from "@/src/lib/utils.ts";
import { ComponentListMessage } from "../../internal/component-list/component-list-message";
import { WrapLoader } from "../../internal/wrap-loader";
import { ILogsFilterListProps, LogsFilterList } from "./logs-filter-list";

export interface ILogsFilterListContainerProps
  extends Pick<
    ILogsFilterListProps,
    | "orgId"
    | "projectId"
    | "onChange"
    | "filters"
    | "applyButtonText"
    | "applyButtonClassName"
    | "applyButtonVariant"
    | "applyButtonType"
    | "disabled"
    | "applyButtonDisabled"
    | "hijackApplyButtonOnClick"
    | "applyButtonLoading"
  > {
  className?: string;
}

export function LogsFilterListContainer({
  className,
  orgId,
  projectId,
  onChange,
  filters,
  applyButtonText,
  disabled,
  applyButtonDisabled,
  hijackApplyButtonOnClick,
  applyButtonLoading,
}: ILogsFilterListContainerProps) {
  const getLogFieldsHook = useGetLogFields({ query: { projectId } });

  return (
    <div className={cn("flex flex-col items-center w-full", className)}>
      <WrapLoader
        isLoading={getLogFieldsHook.isLoading}
        error={getLogFieldsHook.error}
        data={getLogFieldsHook.data}
        render={(data) =>
          data.fields.length === 0 ? (
            <ComponentListMessage
              title="No log fields"
              message="Ingest logs to get started"
              className="flex flex-col max-w-lg mx-auto"
            />
          ) : (
            <LogsFilterList
              fields={data.fields}
              orgId={orgId}
              projectId={projectId}
              onChange={onChange}
              filters={filters}
              applyButtonText={applyButtonText}
              disabled={disabled}
              applyButtonDisabled={applyButtonDisabled}
              hijackApplyButtonOnClick={hijackApplyButtonOnClick}
              applyButtonLoading={applyButtonLoading}
            />
          )
        }
      />
    </div>
  );
}

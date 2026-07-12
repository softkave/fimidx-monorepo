"use client";

import { cn } from "@/src/lib/utils.ts";
import { LogFieldsListContainer } from "../log-fields-list-container";
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
  return (
    <div className={cn("flex flex-col items-center w-full", className)}>
      <LogFieldsListContainer projectId={projectId} className="w-full">
        {({ fields }) => (
          <LogsFilterList
            fields={fields}
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
        )}
      </LogFieldsListContainer>
    </div>
  );
}

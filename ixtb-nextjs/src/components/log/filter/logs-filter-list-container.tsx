"use client";

import { cn } from "@/src/lib/utils.ts";
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
    | "autoApply"
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
  autoApply,
}: ILogsFilterListContainerProps) {
  return (
    <div className={cn("flex flex-col items-center w-full", className)}>
      <LogsFilterList
        orgId={orgId}
        projectId={projectId}
        onChange={onChange}
        filters={filters}
        applyButtonText={applyButtonText}
        disabled={disabled}
        applyButtonDisabled={applyButtonDisabled}
        hijackApplyButtonOnClick={hijackApplyButtonOnClick}
        applyButtonLoading={applyButtonLoading}
        autoApply={autoApply}
      />
    </div>
  );
}

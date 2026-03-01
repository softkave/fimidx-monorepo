"use client";

import { ComponentListHeader } from "../internal/component-list/component-list-header";
import { LogsHeaderMenu } from "./logs-header-menu";

export function LogsHeader(props: {
  className?: string;
  orgId: string;
  projectId: string;
  onShowFiltersAndSort: (showFiltersAndSort: boolean) => void;
  showFiltersAndSort: boolean;
}) {
  return (
    <ComponentListHeader
      title="Logs"
      description="View and manage logs"
      button={
        <LogsHeaderMenu
          onShowFiltersAndSort={props.onShowFiltersAndSort}
          showFiltersAndSort={props.showFiltersAndSort}
        />
      }
      className={props.className}
    />
  );
}

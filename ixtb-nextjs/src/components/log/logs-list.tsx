import { ILog } from "fimidx-core/definitions/log";
import { IObjRecordQueryList } from "fimidx-core/definitions/obj";
import { useMemo } from "react";
import { ComponentListMessage } from "../internal/component-list/component-list-message.tsx";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion.tsx";
import { LogsFilterListContainer } from "./filter/logs-filter-list-container.tsx";
import { LogsTable } from "./logs-table.tsx";

export interface ILogsProps {
  logs: ILog[];
  filters?: IObjRecordQueryList;
  onFiltersChange?: (filters: IObjRecordQueryList) => void;
  showFiltersAndSort?: boolean;
  orgId: string;
  projectId: string;
}

export function LogItemsEmpty(props: { title?: string; message?: string }) {
  const { title = "No logs found", message = "Ingest logs to get started" } =
    props;

  return (
    <ComponentListMessage
      title={title}
      message={message}
      className="w-full max-w-lg pt-0 mx-auto"
    />
  );
}

export function Logs(props: ILogsProps) {
  const hasFilters = useMemo(() => {
    return !!props.filters?.length;
  }, [props.filters]);

  const filtersCount = useMemo(() => {
    return props.filters?.length ?? 0;
  }, [props.filters]);

  let mainNode: React.ReactNode = null;
  let beforeNode: React.ReactNode = null;

  if (props.showFiltersAndSort && props.onFiltersChange) {
    beforeNode = (
      <Accordion type="single" collapsible defaultValue={"filters"}>
        <AccordionItem value="filters">
          <AccordionTrigger>Filters</AccordionTrigger>
          <AccordionContent className="w-full">
            <LogsFilterListContainer
              onChange={props.onFiltersChange}
              filters={props.filters}
              orgId={props.orgId}
              projectId={props.projectId}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  } else if (hasFilters) {
    const filtersNode = hasFilters ? (
      <span className="text-sm text-muted-foreground">
        {filtersCount} filter{filtersCount === 1 ? "" : "s"} applied
      </span>
    ) : null;

    beforeNode = <p className="text-sm text-muted-foreground">{filtersNode}</p>;
  }

  if (props.logs.length === 0) {
    const emptyTitle = hasFilters ? "No logs found" : undefined;
    const emptyMessage = hasFilters
      ? "No logs found with the current filters"
      : undefined;
    mainNode = <LogItemsEmpty title={emptyTitle} message={emptyMessage} />;
  } else {
    mainNode = (
      <div className="w-full">
        <LogsTable logs={props.logs} />
      </div>
    );
  }

  if (beforeNode) {
    beforeNode = <div className="w-full px-4">{beforeNode}</div>;
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {beforeNode}
      {mainNode}
    </div>
  );
}

import { IMonitor } from "fimidx-core/definitions/monitor";
import { ComponentListMessage } from "../internal/component-list/component-list-message.tsx";
import { ComponentList } from "../internal/component-list/component-list.tsx";
import { MonitorItem, MonitorItemSkeleton } from "./monitor-item.tsx";

export interface IMonitorsListProps {
  monitors: IMonitor[];
  orgId: string;
  emptyTitle?: string;
  emptyMessage?: string;
}

export function MonitorItemEmpty(props: {
  title?: string;
  message?: string;
}) {
  return (
    <ComponentListMessage
      title={props.title ?? "No monitors found"}
      message={props.message ?? "Create a monitor to get started"}
    />
  );
}

export function MonitorsList(props: IMonitorsListProps) {
  if (props.monitors.length === 0) {
    return (
      <MonitorItemEmpty
        title={props.emptyTitle}
        message={props.emptyMessage}
      />
    );
  }

  return (
    <ComponentList
      count={props.monitors.length}
      renderItem={(index) => (
        <MonitorItem
          key={props.monitors[index].id}
          item={props.monitors[index]}
          orgId={props.orgId}
        />
      )}
    />
  );
}

export function MonitorsListSkeleton() {
  return (
    <ComponentList
      count={3}
      renderItem={(index) => <MonitorItemSkeleton key={index} />}
    />
  );
}

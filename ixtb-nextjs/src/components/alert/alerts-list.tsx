import { IAlert } from "fimidx-core/definitions/alert";
import { ComponentListMessage } from "../internal/component-list/component-list-message.tsx";
import { ComponentList } from "../internal/component-list/component-list.tsx";
import { AlertItem, AlertItemSkeleton } from "./alert-item.tsx";

export interface IAlertsListProps {
  alerts: IAlert[];
  orgId: string;
  emptyTitle?: string;
  emptyMessage?: string;
}

export function AlertItemEmpty(props: {
  title?: string;
  message?: string;
}) {
  return (
    <ComponentListMessage
      title={props.title ?? "No alerts found"}
      message={props.message ?? "Alerts appear when a monitor matches"}
    />
  );
}

export function AlertsList(props: IAlertsListProps) {
  if (props.alerts.length === 0) {
    return (
      <AlertItemEmpty title={props.emptyTitle} message={props.emptyMessage} />
    );
  }

  return (
    <ComponentList
      count={props.alerts.length}
      renderItem={(index) => (
        <AlertItem
          key={props.alerts[index].id}
          item={props.alerts[index]}
          orgId={props.orgId}
        />
      )}
    />
  );
}

export function AlertsListSkeleton() {
  return (
    <ComponentList
      count={3}
      renderItem={(index) => <AlertItemSkeleton key={index} />}
    />
  );
}

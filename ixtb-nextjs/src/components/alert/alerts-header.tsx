"use client";

import { ComponentListHeader } from "../internal/component-list/component-list-header";

export function AlertsHeader(props: {
  className?: string;
}) {
  return (
    <ComponentListHeader
      title="Alerts"
      description="Alerts fired by your project monitors."
      className={props.className}
    />
  );
}

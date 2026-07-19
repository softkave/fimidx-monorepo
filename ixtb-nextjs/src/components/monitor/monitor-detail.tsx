"use client";

import { IMonitor } from "fimidx-core/definitions/monitor";
import { MonitorForm } from "./monitor-form";
import { MonitorItemMenu } from "./monitor-item-menu";
import { MonitorRunsList } from "./monitor-runs-list";

export interface IMonitorDetailProps {
  monitor: IMonitor;
  orgId: string;
  projectId: string;
}

export function MonitorDetail(props: IMonitorDetailProps) {
  const { monitor, orgId, projectId } = props;

  return (
    <div className="flex flex-col gap-8 p-4 pt-0">
      <div className="flex justify-between items-start gap-2">
        <div>
          <h1 className="text-2xl font-bold break-all">{monitor.name}</h1>
          {monitor.description ? (
            <p className="text-muted-foreground mt-1">{monitor.description}</p>
          ) : null}
        </div>
        <MonitorItemMenu
          monitor={monitor}
          orgId={orgId}
          projectId={projectId}
        />
      </div>

      <MonitorForm
        key={monitor.id}
        orgId={orgId}
        projectId={projectId}
        monitor={monitor}
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Run history</h2>
        <MonitorRunsList
          projectId={projectId}
          monitorId={monitor.id}
          orgId={orgId}
        />
      </div>
    </div>
  );
}

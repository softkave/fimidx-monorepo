"use client";

import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { IMonitor } from "fimidx-core/definitions/monitor";
import { useRouter } from "@/src/lib/clientHooks/useRouter";
import { useCallback } from "react";
import { AlertsListContainer } from "../alert/alerts-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { MonitorDetailsSummary } from "./monitor-details-summary";
import { MonitorForm } from "./monitor-form";
import { MonitorItemMenu } from "./monitor-item-menu";
import { MonitorRunsList } from "./monitor-runs-list";
import { kMonitorTabs, type MonitorTab } from "./monitor-tabs";

export interface IMonitorDetailProps {
  monitor: IMonitor;
  orgId: string;
  projectId: string;
  tab: MonitorTab;
}

export function MonitorDetail(props: IMonitorDetailProps) {
  const { monitor, orgId, projectId, tab } = props;
  const router = useRouter();

  const pathForTab = useCallback(
    (nextTab: MonitorTab) =>
      kClientPaths.app.org.project.monitors.tab(
        orgId,
        projectId,
        monitor.id,
        nextTab
      ),
    [monitor.id, orgId, projectId]
  );

  const handleTabChange = useCallback(
    (value: string) => {
      router.push(pathForTab(value as MonitorTab));
    },
    [pathForTab, router]
  );

  const handleEditComplete = useCallback(() => {
    router.push(pathForTab(kMonitorTabs.details));
  }, [pathForTab, router]);

  return (
    <div className="flex flex-col gap-6 p-4 pt-0">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
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

      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full flex-wrap h-auto justify-start">
          <TabsTrigger value={kMonitorTabs.details}>Details</TabsTrigger>
          <TabsTrigger value={kMonitorTabs.alerts}>Alerts</TabsTrigger>
          <TabsTrigger value={kMonitorTabs.runs}>Run history</TabsTrigger>
          <TabsTrigger value={kMonitorTabs.edit}>Edit</TabsTrigger>
        </TabsList>

        <TabsContent value={kMonitorTabs.details} className="pt-4">
          <MonitorDetailsSummary monitor={monitor} orgId={orgId} />
        </TabsContent>

        <TabsContent value={kMonitorTabs.alerts} className="pt-4">
          <AlertsListContainer
            projectId={projectId}
            orgId={orgId}
            monitorId={monitor.id}
            emptyTitle="No alerts for this monitor"
            emptyMessage="Alerts appear when this monitor matches."
          />
        </TabsContent>

        <TabsContent value={kMonitorTabs.runs} className="pt-4">
          <MonitorRunsList
            projectId={projectId}
            monitorId={monitor.id}
            orgId={orgId}
          />
        </TabsContent>

        <TabsContent value={kMonitorTabs.edit} className="pt-4">
          <MonitorForm
            key={`${monitor.id}-${String(monitor.updatedAt)}`}
            orgId={orgId}
            projectId={projectId}
            monitor={monitor}
            onSubmitComplete={handleEditComplete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

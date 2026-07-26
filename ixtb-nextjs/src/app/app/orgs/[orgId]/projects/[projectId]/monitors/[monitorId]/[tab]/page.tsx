import { auth } from "@/auth";
import { isMonitorTab } from "@/src/components/monitor/monitor-tabs";
import { MonitorPage } from "@/src/components/monitor/monitor-page";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { JSX } from "react";

export const metadata: Metadata = {
  title: kAppConstants.name,
  description: kAppConstants.description,
};

type MonitorTabPageProps = {
  params: Promise<{
    orgId: string;
    projectId: string;
    monitorId: string;
    tab: string;
  }>;
};

export default async function Page(
  props: MonitorTabPageProps
): Promise<JSX.Element> {
  const { orgId, projectId, monitorId, tab } = await props.params;
  const session = await auth();
  if (!session) {
    return redirect(
      kClientPaths.withURL(
        kClientPaths.signinWithRedirect(
          kClientPaths.app.org.project.monitors.tab(
            orgId,
            projectId,
            monitorId,
            tab
          )
        )
      )
    );
  }

  if (!isMonitorTab(tab)) {
    return redirect(
      kClientPaths.app.org.project.monitors.details(orgId, projectId, monitorId)
    );
  }

  return (
    <MonitorPage
      projectId={projectId}
      monitorId={monitorId}
      orgId={orgId}
      tab={tab}
    />
  );
}

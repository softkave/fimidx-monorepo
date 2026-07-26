import { auth } from "@/auth";
import { NewMonitorPage } from "@/src/components/monitor/new-monitor-page";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import type { IObjRecordQueryList } from "fimidx-core/definitions/obj";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { JSX } from "react";

export const metadata: Metadata = {
  title: kAppConstants.name,
  description: kAppConstants.description,
};

type NewMonitorRoutePageProps = {
  params: Promise<{
    orgId: string;
    projectId: string;
  }>;
  searchParams: Promise<{
    filters?: string;
  }>;
};

function parseFilters(raw: string | undefined): IObjRecordQueryList | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IObjRecordQueryList) : undefined;
  } catch {
    return undefined;
  }
}

export default async function Page(
  props: NewMonitorRoutePageProps
): Promise<JSX.Element> {
  const { orgId, projectId } = await props.params;
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session) {
    return redirect(
      kClientPaths.withURL(
        kClientPaths.signinWithRedirect(
          kClientPaths.app.org.project.monitors.new(orgId, projectId)
        )
      )
    );
  }

  return (
    <NewMonitorPage
      projectId={projectId}
      orgId={orgId}
      initialFilters={parseFilters(searchParams.filters)}
    />
  );
}

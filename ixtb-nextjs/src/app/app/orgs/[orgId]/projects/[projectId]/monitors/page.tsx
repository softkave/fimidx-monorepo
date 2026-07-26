import { auth } from "@/auth";
import { MonitorsPage } from "@/src/components/monitor/monitors-page";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { JSX } from "react";

export const metadata: Metadata = {
  title: kAppConstants.name,
  description: kAppConstants.description,
};

type MonitorsRoutePageProps = {
  params: Promise<{
    orgId: string;
    projectId: string;
  }>;
};

export default async function Page(
  props: MonitorsRoutePageProps
): Promise<JSX.Element> {
  const { orgId, projectId } = await props.params;
  const session = await auth();
  if (!session) {
    return redirect(
      kClientPaths.withURL(
        kClientPaths.signinWithRedirect(
          kClientPaths.app.org.project.monitors.index(orgId, projectId)
        )
      )
    );
  }

  return <MonitorsPage projectId={projectId} orgId={orgId} />;
}

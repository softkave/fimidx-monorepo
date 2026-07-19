import { auth } from "@/auth";
import { AlertsPage } from "@/src/components/alert/alerts-page";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { JSX } from "react";

export const metadata: Metadata = {
  title: kAppConstants.name,
  description: kAppConstants.description,
};

type AlertsRoutePageProps = {
  params: Promise<{
    orgId: string;
    projectId: string;
  }>;
};

export default async function Page(
  props: AlertsRoutePageProps
): Promise<JSX.Element> {
  const { orgId, projectId } = await props.params;
  const session = await auth();
  if (!session) {
    return redirect(
      kClientPaths.withURL(
        kClientPaths.signinWithRedirect(
          kClientPaths.app.org.project.alerts.index(orgId, projectId)
        )
      )
    );
  }

  return <AlertsPage projectId={projectId} orgId={orgId} />;
}

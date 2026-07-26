import { auth } from "@/auth";
import { AlertPage } from "@/src/components/alert/alert-page";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { JSX } from "react";

export const metadata: Metadata = {
  title: kAppConstants.name,
  description: kAppConstants.description,
};

type AlertIdPageProps = {
  params: Promise<{
    orgId: string;
    projectId: string;
    alertId: string;
  }>;
};

export default async function Page(
  props: AlertIdPageProps
): Promise<JSX.Element> {
  const { orgId, projectId, alertId } = await props.params;
  const session = await auth();
  if (!session) {
    return redirect(
      kClientPaths.withURL(
        kClientPaths.signinWithRedirect(
          kClientPaths.app.org.project.alerts.single(orgId, projectId, alertId)
        )
      )
    );
  }

  return (
    <AlertPage projectId={projectId} alertId={alertId} orgId={orgId} />
  );
}

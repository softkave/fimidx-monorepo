import { auth } from "@/auth";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: kAppConstants.name,
  description: kAppConstants.description,
};

type MonitorIdPageProps = {
  params: Promise<{
    orgId: string;
    projectId: string;
    monitorId: string;
  }>;
};

export default async function Page(props: MonitorIdPageProps) {
  const { orgId, projectId, monitorId } = await props.params;
  const session = await auth();
  const detailsPath = kClientPaths.app.org.project.monitors.details(
    orgId,
    projectId,
    monitorId
  );

  if (!session) {
    return redirect(
      kClientPaths.withURL(kClientPaths.signinWithRedirect(detailsPath))
    );
  }

  return redirect(detailsPath);
}

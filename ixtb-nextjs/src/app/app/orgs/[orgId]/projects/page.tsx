import { auth } from "@/auth";
import { kOrgTabs } from "@/src/components/org/org";
import { OrgPage } from "@/src/components/org/org-page";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { JSX } from "react";

export const metadata: Metadata = {
  title: kAppConstants.name,
  description: kAppConstants.description,
};

type orgIdProjectsPageProps = {
  params: Promise<{
    orgId: string;
  }>;
};

export default async function Page(
  props: orgIdProjectsPageProps
): Promise<JSX.Element> {
  const { orgId } = await props.params;
  const session = await auth();
  if (!session) {
    return redirect(
      kClientPaths.withURL(
        kClientPaths.signinWithRedirect(
          kClientPaths.app.org.project.index(orgId)
        )
      )
    );
  }

  return <OrgPage orgId={orgId} defaultTab={kOrgTabs.projects} />;
}

import { auth } from "@/auth";
import { kProjectTabs } from "@/src/components/project/project";
import { ProjectPage } from "@/src/components/project/project-page";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { JSX } from "react";

export const metadata: Metadata = {
  title: kAppConstants.name,
  description: kAppConstants.description,
};

type ProjectTokensPageProps = {
  params: Promise<{
    orgId: string;
    projectId: string;
  }>;
};

export default async function Page(
  props: ProjectTokensPageProps
): Promise<JSX.Element> {
  const { orgId, projectId } = await props.params;
  const session = await auth();
  if (!session) {
    return redirect(
      kClientPaths.withURL(
        kClientPaths.signinWithRedirect(
          kClientPaths.project.org.project.clientToken.index(orgId, projectId)
        )
      )
    );
  }

  return (
    <ProjectPage projectId={projectId} defaultTab={kProjectTabs.clientTokens} />
  );
}

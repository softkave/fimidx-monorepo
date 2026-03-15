import { auth } from "@/auth";
import { SourceMapsPageContent } from "@/src/components/source-maps/source-maps-page-content";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { JSX } from "react";

export const metadata: Metadata = {
  title: kAppConstants.name,
  description: kAppConstants.description,
};

type SourceMapsPageProps = {
  params: Promise<{
    orgId: string;
    projectId: string;
  }>;
};

export default async function Page(
  props: SourceMapsPageProps
): Promise<JSX.Element> {
  const { orgId, projectId } = await props.params;
  const session = await auth();
  if (!session) {
    return redirect(
      kClientPaths.withURL(
        kClientPaths.signinWithRedirect(
          kClientPaths.app.org.project.sourceMaps.index(orgId, projectId)
        )
      )
    );
  }

  return <SourceMapsPageContent projectId={projectId} orgId={orgId} />;
}

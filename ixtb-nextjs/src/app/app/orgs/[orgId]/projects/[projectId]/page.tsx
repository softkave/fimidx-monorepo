import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { JSX } from "react";

export const metadata: Metadata = {
  title: kAppConstants.name,
  description: kAppConstants.description,
};

type orgIdProjectIdPageProps = {
  params: Promise<{
    orgId: string;
    projectId: string;
  }>;
};

export default async function Page(
  props: orgIdProjectIdPageProps
): Promise<JSX.Element> {
  const { orgId, projectId } = await props.params;

  return redirect(
    kClientPaths.withURL(
      kClientPaths.project.org.project.log.index(orgId, projectId)
    )
  );
}

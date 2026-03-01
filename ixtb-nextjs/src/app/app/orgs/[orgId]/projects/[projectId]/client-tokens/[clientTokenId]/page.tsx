import { auth } from "@/auth";
import { ClientTokenPage } from "@/src/components/client-token/client-token-page";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { JSX } from "react";

export const metadata: Metadata = {
  title: kAppConstants.name,
  description: kAppConstants.description,
};

type ClientTokenIdPageProps = {
  params: Promise<{
    orgId: string;
    projectId: string;
    clientTokenId: string;
  }>;
};

export default async function Page(
  props: ClientTokenIdPageProps
): Promise<JSX.Element> {
  const { orgId, projectId, clientTokenId } = await props.params;
  const session = await auth();
  if (!session) {
    return redirect(
      kClientPaths.withURL(
        kClientPaths.signinWithRedirect(
          kClientPaths.project.org.project.clientToken.single(
            orgId,
            projectId,
            clientTokenId
          )
        )
      )
    );
  }

  return (
    <ClientTokenPage projectId={projectId} clientTokenId={clientTokenId} />
  );
}

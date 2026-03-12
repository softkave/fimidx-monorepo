import { auth } from "@/auth";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { redirect } from "next/navigation";
import { JSX } from "react";

export async function RedirectToOrgs(): Promise<JSX.Element> {
  const session = await auth();
  if (!session) {
    return redirect(
      kClientPaths.withURL(
        kClientPaths.signinWithRedirect(kClientPaths.app.org.index)
      )
    );
  }

  return redirect(kClientPaths.withURL(kClientPaths.app.org.index));
}

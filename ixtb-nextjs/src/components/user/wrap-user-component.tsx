"use client";

import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths.ts";
import { useAppSession } from "@/src/lib/clientHooks/userHooks.ts";
import assert from "assert";
import { IUser } from "fimidx-core/definitions/user";
import { redirect, usePathname } from "next/navigation";
import { useEffect } from "react";
import { PageError } from "../internal/error.tsx";
import { PageLoading } from "../internal/loading.tsx";

interface IWrapUserComponentProps {
  render?: React.ReactNode | ((user: IUser) => React.ReactNode);
  children?: React.ReactNode;
}

export function WrapUserComponent({
  render,
  children,
}: IWrapUserComponentProps) {
  const { status, user } = useAppSession();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect(kClientPaths.withURL(kClientPaths.signinWithRedirect(pathname)));
    }
  }, [status, pathname]);

  if (status === "loading") {
    return <PageLoading />;
  } else if (status === "unauthenticated") {
    return <PageError error={new Error("Unauthorized. Redirecting...")} />;
  }

  assert.ok(user, "User is not authenticated");

  const content =
    children || (typeof render === "function" ? render(user) : render);
  return <>{content}</>;
}

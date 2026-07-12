"use client";

import { authClient } from "@/src/lib/auth-client";
import { IUser } from "fimidx-core/definitions/user";

export function useProjectSession() {
  const { data, error, isPending } = authClient.useSession();

  const user = data?.user as unknown as IUser | null;
  const userId = user?.id;
  const expires = data?.session?.expiresAt;
  const status = isPending
    ? "loading"
    : data && !error
      ? "authenticated"
      : "unauthenticated";

  return { userId, expires, user, status };
}

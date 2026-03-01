"use client";

import { IUser } from "fimidx-core/definitions/user";
import { useSession } from "next-auth/react";

export function useProjectSession() {
  const data = useSession();

  const user = data.data?.user as IUser | null;
  const userId = user?.id;
  const expires = data.data?.expires;

  return { userId, expires, user, status: data.status };
}

"use client";

import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

function getBetterAuthBaseURL() {
  if (process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
    return process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  }

  const publicUrl = process.env.NEXT_PUBLIC_URL;
  if (publicUrl) {
    return new URL("/api/auth", publicUrl).toString();
  }

  return "/api/auth";
}

export const authClient = createAuthClient({
  baseURL: getBetterAuthBaseURL(),
  plugins: [magicLinkClient()],
});

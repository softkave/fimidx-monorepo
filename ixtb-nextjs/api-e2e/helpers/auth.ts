import { getBaseUrl } from "../config.js";

/**
 * Signs in the e2e test user via Credentials provider and returns the session
 * cookie string. Requires E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD to be
 * set. Returns null if env is not configured or sign-in fails.
 */
export async function createTestUserSession(): Promise<string | null> {
  const email = process.env.E2E_TEST_USER_EMAIL;
  const password = process.env.E2E_TEST_USER_PASSWORD;
  if (!email || !password) return null;

  const base = getBaseUrl();

  const csrfRes = await fetch(`${base}/api/auth/csrf`);
  if (!csrfRes.ok) return null;
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  if (!csrfToken) return null;

  const params = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: base + "/",
    json: "true",
  });

  const signInRes = await fetch(`${base}/api/auth/callback/credentials-e2e`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    redirect: "manual",
    credentials: "include",
  });

  const setCookie = signInRes.headers.get("set-cookie");
  if (!setCookie) return null;

  return setCookie;
}

/**
 * Attach Bearer token to headers for client-token-authenticated requests.
 */
export function bearerHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

import { getBaseUrl } from "../config.js";

/** First `name=value` segment of each Set-Cookie line, joined for a Cookie header. */
function setCookieLinesToCookieHeader(setCookieLines: string[]): string {
  return setCookieLines
    .map(line => line.split(";")[0]?.trim())
    .filter((pair): pair is string => Boolean(pair))
    .join("; ");
}

function getSetCookieLines(res: Response): string[] {
  const h = res.headers;
  if (typeof h.getSetCookie === "function") {
    return h.getSetCookie();
  }
  const single = h.get("set-cookie");
  return single ? [single] : [];
}

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

  // Auth.js ties CSRF to cookies from the CSRF response. Node fetch does not
  // persist cookies across requests, so we must forward them on the callback POST.
  const csrfCookieHeader = setCookieLinesToCookieHeader(
    getSetCookieLines(csrfRes)
  );

  const params = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: base + "/",
    json: "true",
  });

  const signInRes = await fetch(`${base}/api/auth/callback/credentials-e2e`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: base,
      Referer: `${base}/`,
      ...(csrfCookieHeader ? { Cookie: csrfCookieHeader } : {}),
    },
    body: params.toString(),
    redirect: "manual",
    credentials: "include",
  });

  const sessionCookieHeader = setCookieLinesToCookieHeader(
    getSetCookieLines(signInRes)
  );
  if (!sessionCookieHeader) return null;

  return sessionCookieHeader;
}

/**
 * Attach Bearer token to headers for client-token-authenticated requests.
 */
export function bearerHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

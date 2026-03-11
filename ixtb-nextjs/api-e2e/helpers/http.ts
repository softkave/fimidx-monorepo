import { getBaseUrl } from "../config.js";

export interface ApiFetchOptions {
  method?: string;
  body?: string | object;
  headers?: Record<string, string>;
  /** Optional cookie string to send (e.g. from createTestUserSession). */
  cookie?: string;
}

/**
 * Fetch helper for api-e2e. Sends credentials (cookies) by default.
 */
export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const { method = "GET", body, headers = {}, cookie } = options;
  const url = getBaseUrl() + path;
  const isJson =
    typeof body === "object" ||
    (headers["Content-Type"] === "application/json" && body !== undefined);

  const reqHeaders: Record<string, string> = {
    ...headers,
  };
  if (cookie) {
    reqHeaders["Cookie"] = cookie;
  }
  if (isJson && typeof body === "object" && body !== null) {
    reqHeaders["Content-Type"] = "application/json";
  }

  return fetch(url, {
    method,
    headers: reqHeaders,
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
        ? body
        : JSON.stringify(body),
    credentials: "include",
  });
}

/**
 * Base URL for api-e2e tests. Uses API_E2E_BASE_URL env, default
 * http://localhost:3000.
 */
export function getBaseUrl(): string {
  return process.env.API_E2E_BASE_URL ?? "http://localhost:3000";
}

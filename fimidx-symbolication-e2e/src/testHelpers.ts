import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const pExecFile = promisify(execFile);

export function getEnvOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export async function poll<T>(params: {
  name: string;
  timeoutMs: number;
  intervalMs: number;
  fn: () => Promise<T | null>;
}): Promise<T> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const v = await params.fn();
    if (v != null) return v;
    if (Date.now() - start > params.timeoutMs) {
      throw new Error(`Timed out waiting for ${params.name}`);
    }
    await sleep(params.intervalMs);
  }
}

export async function postInternalCallback(url: string, internalKey: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-access-key": internalKey,
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Callback POST failed: ${url} (${res.status}) ${text}`);
  }
}

import { createLock, IoredisAdapter, type Lock } from "redlock-universal";
import { getRedis } from "./redis.js";

const locks: Record<string, Lock> = {};

export function getRedlock(key: string, ttl: number) {
  if (!locks[key]) {
    locks[key] = createLock({
      adapter: new IoredisAdapter(getRedis()),
      key: key,
      ttl: ttl,
    });
  }
  return locks[key];
}

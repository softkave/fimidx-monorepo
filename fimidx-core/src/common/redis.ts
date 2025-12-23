import Redis from "ioredis";
import { getCoreConfig } from "./getCoreConfig.js";

let redis: Redis.Redis | null = null;

export function getRedis(): Redis.Redis {
  if (!redis) {
    const { redis: redisConfig } = getCoreConfig();
    redis = new Redis.default(redisConfig.url);
  }
  return redis;
}

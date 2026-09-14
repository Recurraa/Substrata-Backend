import IORedis from "ioredis";
import { config } from "../config";

let client: IORedis | null = null;

export function getRedis(): IORedis {
  if (!client) {
    client = new IORedis(config.redis.url, {
      maxRetriesPerRequest: null, // required by BullMQ
      lazyConnect: false,
    });
  }
  return client;
}

/** @deprecated Prefer getRedis() for testability */
export const redis = getRedis();

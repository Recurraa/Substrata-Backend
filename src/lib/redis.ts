import IORedis from "ioredis";
import { config } from "../config";

export const redis = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null, // required by BullMQ
});

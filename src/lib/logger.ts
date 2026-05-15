import pino from "pino";
import { config } from "../config";

export const logger = pino({
  level: config.logLevel,
  transport:
    config.env !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

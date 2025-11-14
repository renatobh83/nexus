import { Redis } from "ioredis";
/**
 *  Instancia uma conexao com o Redis
 *
 *
 */
export const redisClient = new Redis({
  port: Number(process.env.IO_REDIS_PORT),
  host: process.env.IO_REDIS_SERVER,
  db: Number(process.env.IO_REDIS_DB_SESSION) || 8,
  password: process.env.IO_REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

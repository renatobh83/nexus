import {  PrismaClient } from "@prisma/client";
import "dotenv/config";
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
/**
 * Instancia o cliente Prisma
 */
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  // Habilita os logs
  adapter: adapter,
  log:
    process.env.NODE_ENV === "development"
      ? [
          { level: "query", emit: "event" },
          { level: "info", emit: "event" },
          { level: "warn", emit: "event" },
          { level: "error", emit: "event" },
        ]
      : ["error"],
});
// prisma.$on("query", (e) => {
//   console.log("Query: " + e.query);
//   console.log("Params: " + e.params);
//   console.log("Duration: " + e.duration + "ms");
// });

export { prisma };

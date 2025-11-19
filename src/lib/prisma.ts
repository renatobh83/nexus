import { PrismaClient } from "@prisma/client";
import "dotenv/config";
/**
 * Instancia o cliente Prisma
 */

const prisma = new PrismaClient({
  // Habilita os logs
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

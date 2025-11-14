import { PrismaClient } from "../../generated/prisma-client";

/**
 * Instancia o cliente Prisma
 */
const prisma = new PrismaClient({
  // Habilita os logs
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

export { prisma };

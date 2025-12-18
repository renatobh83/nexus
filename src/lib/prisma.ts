import { Prisma, PrismaClient } from "@prisma/client";
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { decrypt } from "./crypto";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
/**
 * Instancia o cliente Prisma
 */
const adapter = new PrismaPg(pool);

const prismaBase = new PrismaClient({
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
// Função auxiliar para descriptografar um array de mensagens
function decryptMessageArray(messages: any[]) {
  if (!messages) return [];
  return messages.map(msg => ({
    ...msg,
    body: decrypt(msg.body),
    // Descriptografa recursivamente se houver quotedMsg
    quotedMsg: msg.quotedMsg ? {
      ...msg.quotedMsg,
      body: decrypt(msg.quotedMsg.body)
    } : null,
  }));
}
const prisma = prismaBase.$extends({
  model: {
    ticket: {
      // Cria um novo método: prisma.ticket.findAndDecrypt()
      async findAndDecrypt(args: Prisma.TicketFindUniqueArgs) {
        // 1. Executa a busca original usando o cliente base
        const ticket = await prismaBase.ticket.findMany(args);

        // 2. Se encontrou o ticket e ele tem mensagens, descriptografa
        if (ticket && (ticket as any).messages) {
          (ticket as any).messages = decryptMessageArray((ticket as any).messages);
        }

        return ticket;
      },
      async findManyAndDecrypt(args?: Prisma.TicketFindManyArgs) {
        const tickets = await prismaBase.ticket.findMany(args);
        for (const ticket of tickets) {
          if ((ticket as any).messages) {
            (ticket as any).messages = decryptMessageArray((ticket as any).messages);
          }
        }
        return tickets;
      }
    }
  }
})
export { prisma };

import { Prisma, PrismaClient } from "@prisma/client";
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { decrypt, encrypt } from "./crypto";
import { getFullMediaUrl } from "../ultis/getFullMediaUrl";

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
function decryptMessage(msg: any) {
  if (!msg) return msg;

  if (msg.body) {
    msg.body = decrypt(msg.body);
  }

  if (msg.quotedMsg) {
    msg.quotedMsg = 
    {
              ...msg.quotedMsg,
              body: decrypt(msg.quotedMsg.body),
              mediaUrl: msg.quotedMsg.mediaUrl
                ? getFullMediaUrl(msg.quotedMsg.mediaUrl)
                : null,
            }
    
    // decryptMessage(msg.quotedMsg);
  }
  if (msg.ticket?.messages) {
    const messages = msg.ticket.messages.map((m: { mediaUrl: string | null; body: string }) => {
      let fullMediaUrl: string | null = null;
      if (m.mediaUrl) {
        const { MEDIA_URL, PROXY_PORT } = process.env;
        fullMediaUrl =
          process.env.NODE_ENV === "development" && PROXY_PORT
            ? `${MEDIA_URL}:${PROXY_PORT}/public/${m.mediaUrl}`
            : `${MEDIA_URL}/public/${m.mediaUrl}`;
      }
      m.mediaUrl = fullMediaUrl;
      m.body = decrypt(m.body);
      return m;
    })
    msg.ticket.messages = messages;
  }

  return msg;
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
    },
    message: {
      async create(args: Prisma.MessageCreateArgs) {

        if (args.data.body) {
          args.data.body = encrypt(args.data.body);
        }

        const result = await prismaBase.message.create(args);

        return decryptMessage(result);
      },
      async update(args: Prisma.MessageUpdateArgs) {

        if (args.data.body && typeof args.data.body === "string") {
          args.data.body = encrypt(args.data.body);
        }

        const result = await prismaBase.message.update(args);

        return decryptMessage(result);
      },

    },


  }
})
export { prisma };

import { Telegraf } from "telegraf";
import { getIO } from "./socket";
import { Whatsapp } from "@prisma/client";
import { logger } from "../ultis/logger";
import { WhatsappService } from "../core/whatsapp/whatsapp.service";

export interface Session extends Telegraf {
  id: number;
  tenantId: number
}

let processHandlersRegistered = false;
const TelegramSessions: Session[] = [];

export const initTbot = async (connection: Whatsapp, whatsappService: WhatsappService): Promise<Session> => {
  return new Promise(async (resolve, reject) => {
    try {
      const io = getIO();
      const sessionName = connection.name;
      const { tenantId } = connection;
      const tbot = new Telegraf(connection.tokenTelegram!, {}) as Session;

      tbot.id = connection.id;
      tbot.tenantId = connection.tenantId
      tbot.catch((err: any, ctx: any) => {
        logger.error(
          `Erro no bot ${sessionName} | ctx: ${ctx?.updateType} | err: ${err}`
        );
      });

      const sessionIndex = TelegramSessions.findIndex(
        (s) => s.id === connection.id
      );
      if (sessionIndex === -1) TelegramSessions.push(tbot);
      else TelegramSessions[sessionIndex] = tbot;

      tbot.launch({
        allowedUpdates: [
          "message",
          "message_reaction",
          "callback_query",
          "inline_query",
          "shipping_query",
        ],
      });
      //    await whatsappService.handleConnected(
      //   connection.id,
      //   connection.tenantId,
      //   profileSession,
      //   whatsappSession.name
      // );
      // await connection.update({
      //   status: "CONNECTED",
      //   qrcode: "",
      //   retries: 0,
      // });

      // io.emit(`${tenantId}:whatsappSession`, {
      //   action: "update",
      //   session: connection,
      // });

      logger.info(`Session TELEGRAM: ${sessionName} - READY `);

      registerProcessHandlers();
      resolve(tbot);
    } catch (error) {
      // se falhar ao lançar, remover a sessão guardada (cleanup)
      const idx = TelegramSessions.findIndex((s) => s.id === connection.id);
      if (idx !== -1) TelegramSessions.splice(idx, 1);

      // await connection.update({
      //   status: "DISCONNECTED",
      //   qrcode: "",
      //   retries: 0,
      // });
      logger.error(`initTbot error | ${error}`);
      reject(new Error("Error starting telegram session."));
    }
  });
};

export const getTbot = (whatsappId: number, checkState = true): Session => {
  logger.info(`whatsappId: ${whatsappId} | checkState: ${checkState}`);
  const sessionIndex = TelegramSessions.findIndex((s) => s.id === whatsappId);

  return TelegramSessions[sessionIndex];
};

export const requireTbot = (whatsappId: number): Session => {
  const tbot = getTbot(whatsappId);
  if (!tbot)
    throw new Error(`Telegram bot da sessão ${whatsappId} não encontrado`);
  return tbot;
};
export const removeTbot = (whatsappId: number): void => {
  try {
    const sessionIndex = TelegramSessions.findIndex((s) => s.id === whatsappId);
    const sessionSet: any = TelegramSessions[sessionIndex];
    if (sessionIndex !== -1) {
      // Enable graceful stop
      process.once("SIGINT", () => sessionSet.stop("SIGINT"));
      process.once("SIGTERM", () => sessionSet.stop("SIGTERM"));
      TelegramSessions.splice(sessionIndex, 1);
    }
  } catch (err) {
    logger.error(`removeTbot | Error: ${err}`);
  }
};

function registerProcessHandlers() {
  if (processHandlersRegistered) return;
  processHandlersRegistered = true;

  const shutdown = (signal: string) => {
    logger.warn(`⚠️ Recebido sinal ${signal}, encerrando sessões Telegram...`);
    TelegramSessions.forEach((bot) => {
      try {
        bot.stop(signal);
      } catch (e) {
        logger.warn(`failed stop bot: ${e}`);
      }
    });
    process.exit(0);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
  });
  process.on("uncaughtException", (err) => {
    logger.error(`Uncaught Exception: ${err}`);
  });
}

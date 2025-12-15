import { existsSync } from "fs";
import { promisify } from "util";
import fs from "node:fs";
import { Ticket } from "@prisma/client";
import { getWbot } from "../../../lib/wbot";
import { Message } from "wbotconnect";
import { AppError } from "../../../errors/errors.helper";
import { logger } from "../../../ultis/logger";
import { getFastifyApp } from "../..";

interface Request {
  media: any;
  ticket: Ticket | any;
  userId: number;
}

const delay = promisify(setTimeout);

async function verificarArquivo(
  mediaPath: fs.PathLike,
  intervalo = 1000,
  tentativas = 30
) {
  for (let i = 0; i < tentativas; i++) {
    if (existsSync(mediaPath)) {
      const stats = fs.statSync(mediaPath);
      if (stats.size > 0) {
        // Garante que o arquivo não está vazio
        return true;
      }
    }
    await delay(intervalo);
  }
  return false;
}

const SendWhatsAppMedia = async ({
  media,
  ticket,
  userId,
}: Request): Promise<void> => {
  try {
    const wbot = getWbot(ticket.whatsappId!);
    let messageSent: any;
    let mimetype = media.mimetype;

    const fileData = `data:${mimetype};base64,${media.buffer.toString(
      "base64"
    )}`;

    if (
      [
        "image/gif",
        "image/png",
        "image/jpg",
        "image/jpeg",
        "image/webp",
      ].includes(mimetype)
    ) {
      messageSent = (await wbot.sendImageFromBase64(
        ticket.contact.serializednumber!,
        fileData,
        media.filename
      )) as unknown as Message;
    } else {
      messageSent = (await wbot.sendFile(
        ticket.contact.serializednumber!,
        fileData,
        media.filename
      )) as unknown as Message;
    }
    await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
      lastMessage: media.filename,
      lastMessageAt: new Date().getTime(),
    });

    try {
      if (userId) {
        // TODO create Log user
        // await UserMessagesLog.create({
        //   messageId: messageSent.id,
        //   userId,
        //   ticketId: ticket.id,
        // } as UserMessagesLog);
      }
    } catch (error) {
      logger.error(`Error criar log mensagem ${error}`);
    }
    return messageSent;
  } catch (err) {
    logger.error(`SendWhatsAppMedia | Error: ${JSON.stringify(err)}`);
    throw new AppError("ERR_SENDING_WAPP_MSG", 501);
  }
};

export default SendWhatsAppMedia;

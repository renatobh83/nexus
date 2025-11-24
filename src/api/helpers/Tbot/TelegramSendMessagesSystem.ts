import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { promisify } from "util";
import { Telegraf } from "telegraf";
import { Ticket } from "@prisma/client";
import { logger } from "../../../ultis/logger";
import { AppError } from "../../../errors/errors.helper";
import { getFastifyApp } from "../..";
import SetTicketMessagesAsRead from "../../../ultis/SetTicketMessagesAsRead";
import socketEmit from "../socketEmit";
import { encrypt } from "../../../lib/crypto";

interface Session extends Telegraf {
  id: number;
}
const delay = promisify(setTimeout);
interface TicketContato extends Ticket {
  contact: {
    id: number;
    name: string;
    email: string;
    number: string;
    telegramId: string;
  };
}
const TelegramSendMessagesSystem = async (
  tbot: Session,
  ticket: TicketContato,
  message: any
): Promise<void> => {
  let sendedMessage: any;
  const app = getFastifyApp().services.ticketService;
  const chatId = ticket.contact.telegramId as string;

  const extraInfo: any = {};

  if (message.quotedMsg) {
    extraInfo.reply_to_message_id = message.quotedMsg.messageId;
  }
  if (message.hasButtons) {
    extraInfo.reply_markup = message.reply_markup;
  }
  extraInfo.parse_mode = "Markdown";

  try {
    if (!["chat", "text"].includes(message.mediaType) && message.mediaName) {
      const customPath = join(__dirname, "..", "..", "..", "public");
      const mediaPath = join(customPath, message.mediaName);

      if (message.mediaType === "audio" || message.mediaType === "ptt") {
        sendedMessage = await tbot.telegram.sendVoice(
          chatId,
          {
            source: mediaPath,
          },
          extraInfo
        );
      } else if (message.mediaType === "image") {
        sendedMessage = await tbot.telegram.sendPhoto(
          chatId,
          {
            source: mediaPath,
          },
          extraInfo
        );
        await app.updateTicket(ticket.id, {
          lastMessage: message.media.filename,
          lastMessageAt: new Date().getTime(),
        });
      } else if (message.mediaType === "video") {
        sendedMessage = await tbot.telegram.sendVideo(
          chatId,
          {
            source: mediaPath,
          },
          extraInfo
        );
      } else {
        sendedMessage = await tbot.telegram.sendDocument(
          chatId,
          {
            source: mediaPath,
          },
          extraInfo
        );
        await app.updateTicket(ticket.id, {
          lastMessage: message.media.filename,
          lastMessageAt: new Date().getTime(),
        });
      }

      logger.info("sendMessage media");
    } else {
      sendedMessage = await tbot.telegram.sendMessage(
        chatId,
        message.body,
        extraInfo
      );
      await app.updateTicket(ticket.id, {
        lastMessage:
          message.body.length > 255
            ? message.body.slice(0, 252) + "..."
            : message.body,
        lastMessageAt: new Date().getTime(),
      });
      logger.info("sendMessage text");
    }

    // enviar old_id para substituir no front a mensagem corretamente
    const messageToUpdate = {
      ...message,
      id: sendedMessage.message_id,
      timestamp: sendedMessage.date * 1000, // compatibilizar JS
      messageId: sendedMessage.message_id,
      status: "sended",
      ack: 1,
      sendType: "chat",
    };

    const messageToSocket = {
      ...messageToUpdate,
      body: encrypt(messageToUpdate.body),
      ticket: { id: messageToUpdate.ticketId },
      contact: ticket.contact!.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    socketEmit({
      tenantId: ticket.tenantId,
      type: "chat:create",
      payload: messageToSocket,
    });
    logger.info("Message Update ok");
    return messageToUpdate;
  } catch (error: any) {
    const idMessage = message.id;
    logger.error(`Error send message (id: ${idMessage}):: ${error}`);

    if (error instanceof AppError) {
      throw error;
    }
    console.log(error);
    throw new AppError("ERR", 500);
  }
};

export default TelegramSendMessagesSystem;

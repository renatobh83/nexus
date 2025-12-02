import { Chat, Message } from "wbotconnect";
import { Contact } from "@prisma/client";
import { getFastifyApp } from "../..";
import { REDIS_KEYS } from "../../../ultis/redisCache";
import { findOrCreateTicketSafe } from "../CreateTicketSafe";
import { verifyContactWbot } from "./verifycontactWbot";
import { Session } from "../../../lib/wbot";
import VerifyMediaMessage from "./VerifyMediaMessage";
import VerifyMessage from "./VerifyMessage";

export const HandleMessage = async (
  message: Message,
  wbot: Session
): Promise<void> => {
  const app = getFastifyApp().services;

  const chat = await wbot.getChatById(message.chatId);
  const contact = await verifyContactWbot(message, app, wbot);
  let authorGrupMessage: any = "";

  if (message.isGroupMsg && !message.fromMe) {
    const numberContato = await wbot.getContactLid(message.author);
    const contato = await app.contatoService.findContato({
      serializednumber: numberContato,
    });
    authorGrupMessage = contato;
  }

  const { ticket, isNew } = await findOrCreateTicketSafe({
    contact,
    whatsappId: wbot.id,
    unreadMessages: message.fromMe ? 0 : chat.unreadCount,
    groupContact: chat.isGroup,
    tenantId: wbot.tenantId,
    msg: message,
    channel: "whatsapp",
  });

  // if (ticket.isFarewellMessage) return;

  //TODO Colocar a integracao externa
  if (message.filehash) {
    await VerifyMediaMessage(message, ticket, contact, wbot, authorGrupMessage);
  } else {
    await VerifyMessage(message, ticket, contact, authorGrupMessage);
  }
};

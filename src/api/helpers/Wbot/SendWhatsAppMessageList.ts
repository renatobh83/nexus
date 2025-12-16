import { enum_Messages_sendType, Ticket } from "@prisma/client";
import type { Chat, Message as WbotMessage } from "wbotconnect";
import { getWbot } from "../../../lib/wbot";
import { AppError } from "../../../errors/errors.helper";
import { logger } from "../../../ultis/logger";
import VerifyMessage from "./VerifyMessage";
import { MessageStatus } from "../../../core/messages/message.type";

interface Request {
  options: any;
  ticket: Ticket | any;
}
export const SendWhatsMessageList = async ({
  options,
  ticket,
}: Request): Promise<WbotMessage> => {
  const wbot = getWbot(ticket.whatsappId!);

  try {
    const sendedMessage = await wbot.sendListMessage(
      ticket.contact.serializednumber!,
      options
    );

    // const chat: Chat = await wbot.getChatById(sendedMessage.to);
    // const contact = await VerifyContact(chat, ticket.tenantId);
    await VerifyMessage(sendedMessage, ticket, ticket.contact);

    const messageReturn: any = {
      id: sendedMessage.id,
      messageId: sendedMessage.id,
      ticketId: ticket.id,
      contactId: ticket.contactId,
      ack: sendedMessage.ack,
      fromMe: sendedMessage.fromMe,
      timestamp: sendedMessage.timestamp,
      body: sendedMessage.body,
      read: sendedMessage.fromMe,
      status: sendedMessage.fromMe
        ? ("sended" as MessageStatus)
        : ("received" as MessageStatus),
      tenantId: ticket.tenantId,
      sendType: "chat" as enum_Messages_sendType,
    };

    return messageReturn;
  } catch (err: any) {
    logger.error(`SendWhatsMessageList | Error: ${err}`);
    // await StartWhatsAppSessionVerify(ticket.whatsappId, err);
    throw new AppError("ERR_SENDING_WAPP_MSG", 501);
  }
};

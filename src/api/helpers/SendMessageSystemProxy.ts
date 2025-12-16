import type { Message as WbotMessage } from "wbotconnect";
import TelegramSendMessagesSystem from "./Tbot/TelegramSendMessagesSystem";
import { requireTbot } from "../../lib/tbot";
import { SendMessageChatClient } from "./WebChat/SendMessageChatClient";
import { SendMessageMediaChatClient } from "./WebChat/SendMessageMediaChatClient";
import { enum_Messages_sendType, Message, MessageStatus } from "@prisma/client";
import SendWhatsAppMessage from "./Wbot/SendWhatsAppMessage";
import SendWhatsAppMedia from "./Wbot/SendWhatsAppMedia";
import { transformFile } from "../../ultis/transformFile";
import { waitForMessageSaved } from "../../core/messages/message.utils";
import { MessageDTO } from "../../core/messages/message.type";

type Payload = {
  ticket: any;
  messageData: any;
  media?: any;
  userId?: any;
};

interface CustomMessage extends WbotMessage {
  messageId?: string;
}

const SendMessageSystemProxy = async ({
  ticket,
  messageData,
  media,
  userId,
}: Payload): Promise<Message> => {
  // TODO VER OS TIPOS DE MEDIA TYPE
  const hasMedia = Boolean(messageData.mediaType !== "chat" && media);
  let message: any | null = null;

  switch (ticket.channel) {
    case "telegram":
      message = await TelegramSendMessagesSystem(
        requireTbot(ticket.whatsappId),
        ticket,
        hasMedia ? { ...messageData, media } : messageData
      );
      break;

    case "whatsapp":
      if (hasMedia) {
        const mediaTransforme = await transformFile(media);
        message = await SendWhatsAppMedia({
          media: mediaTransforme,
          ticket,
          userId,
        });
      } else {
        message = await SendWhatsAppMessage({
          body: messageData.body,
          ticket,
          quotedMsg: messageData?.quotedMsg,
        });
      }
      break;

    default:
      message = hasMedia
        ? await SendMessageMediaChatClient(media, ticket)
        : await SendMessageChatClient(messageData, ticket);
  }

  const messageReturn: MessageDTO | any = {
    id: message.id,
    messageId: message.id,
    ticketId: ticket.id,
    contactId: messageData.contactId!,
    ack: message.ack,
    fromMe: messageData.fromMe,
    timestamp: messageData.timestamp,
    body: messageData.body,
    mediaType: messageData.mediaType,
    mediaUrl: messageData.mediaUrl,
    read: messageData.fromMe,
    status: messageData.fromMe
      ? ("sended" as MessageStatus)
      : ("received" as MessageStatus),
    tenantId: ticket.tenantId,
    sendType: messageData.sendType,
  };

  return messageReturn as Message;
};

export default SendMessageSystemProxy;

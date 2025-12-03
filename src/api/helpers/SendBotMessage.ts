import { enum_Messages_sendType, Ticket } from "@prisma/client";
import { MessageData } from "../../core/Tickets/tickets.type";
import { getFastifyApp } from "..";
import SendMessageSystemProxy from "./SendMessageSystemProxy";
import { v4 as uuidV4 } from "uuid";
import { MessageDTO, MessageStatus } from "../../core/messages/message.type";
import { encrypt } from "../../lib/crypto";
import { buildMessageBody } from "../../core/messages/message.utils";

// TODO codigo ainda incompleto
export const sendBotMessage = async (
  tenantId: number,
  ticket: Ticket,
  messageBody: string | any
) => {
  let messageSent;

  if (typeof messageBody === "object") {
    messageSent = await SendMessageSystemProxy({
      ticket,
      media: null,
      userId: null,
      messageData: {
        ...messageBody,
        body: buildMessageBody(messageBody.body, ticket),
        mediaType: "chat",
        fromMe: true,
        sendType: "bot",
        read: true,
      },
    });
  } else {
    const messageData: MessageData = {
      body: buildMessageBody(messageBody, ticket),
      fromMe: true,
      read: true,
      mediaType: "chat",
      sendType: "bot",
    };
    messageSent = await SendMessageSystemProxy({
      ticket,
      media: null,
      userId: null,
      messageData,
    });
  }
  const body = buildMessageBody(messageSent.body, ticket);
  const messageData: MessageDTO = {
    id: String(messageSent.id),
    messageId: String(messageSent.id),
    body: encrypt(body),
    mediaType: "chat",
    sendType: "bot" as enum_Messages_sendType,
    fromMe: true,
    ack: 2,
    read: true,
    contactId: ticket.contactId,
    status: "sended" as MessageStatus,
    ticketId: ticket.id,
    timestamp: messageSent.timestamp,
    idFront: uuidV4(),
    buffer: undefined,
    tenantId,
  };

  await getFastifyApp().services.messageService.createMessage(messageData);
};

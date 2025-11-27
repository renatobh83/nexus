import { Ticket } from "@prisma/client";
import { v4 as uuidV4 } from "uuid";
import { getFastifyApp } from "../..";
import {
  MessageSendType,
  MessageStatus,
} from "../../../core/messages/message.type";
import { AppError } from "../../../errors/errors.helper";

export const VerifyMessageChatClient = async (msg: any, ticket: Ticket) => {
  try {
    const messageData = {
      id: Date.now() + Math.random().toString(),
      messageId: Date.now() + Math.random().toString(),
      ticketId: ticket.id,
      contactId: ticket.contactId,
      body: msg,
      fromMe: false,
      read: true,
      idFront: Date.now() + Math.random().toString(),
      timestamp: new Date().getTime(),
      status: "received" as MessageStatus,
      mediaType: "chat",
      sendType: "chat" as MessageSendType,
      ack: 2,
      tenantId: ticket.tenantId,
    };

    await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
      lastMessage: msg.length > 255 ? msg.slice(0, 252) + "..." : msg,
      lastMessageAt: new Date().getTime(),
      answered: false,
    });

    await getFastifyApp().services.messageService.createMessage(messageData);
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("ERR_VERIFY_MESSAGE_CHAT_CLIENT_SERVICE", 502);
  }
};

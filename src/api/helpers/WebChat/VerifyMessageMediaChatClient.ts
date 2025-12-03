import { enum_Messages_sendType, Ticket } from "@prisma/client";
import { v4 as uuidV4 } from "uuid";
import { AppError } from "../../../errors/errors.helper";
import { getFastifyApp } from "../..";
import { MessageDTO, MessageStatus } from "../../../core/messages/message.type";

export const VerifyMessageMediaChatClient = async (
  mediaUrl: any,
  ticket: Ticket
) => {
  try {
    const relativePath = new URL(mediaUrl.trim()).pathname;

    const messageData: MessageDTO = {
      id: Date.now() + Math.random().toString(),
      idFront: Date.now() + Math.random().toString(),
      messageId: Date.now() + Math.random().toString(),
      ticketId: ticket.id,
      mediaUrl: relativePath.replace(/\\/g, "/").split("/")[2],
      contactId: ticket.contactId,
      body: "Imagem Recebida", // aqui vai a URL da imagem
      mediaType: "image",
      fromMe: false,
      read: true,
      timestamp: new Date().getTime(),
      ack: 2,
      status: "received" as MessageStatus,
      sendType: "chat" as enum_Messages_sendType,
      tenantId: ticket.tenantId,
    };

    await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
      lastMessage: "imagem",
      lastMessageAt: new Date().getTime(),
      answered: false,
    });

    await getFastifyApp().services.messageService.createMessage(messageData);
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("ERR_VERIFY_MESSAGE_MEDIA_CHAT_CLIENT_SERVICE", 500);
  }
};

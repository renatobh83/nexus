import { Ticket } from "@prisma/client";
import { MessageData } from "../../core/Tickets/tickets.type";
import { getFastifyApp } from "..";

export const SendBotMessage = async (
  tenantId: number,
  ticket: Ticket,
  messageBody: string
) => {
  const messageData: MessageData = {
    body: messageBody,
    fromMe: true,
    read: true,
    sendType: "bot",
  };

  await getFastifyApp().services.messageService.createMessageSystem({
    message: messageData,
    tenantId: tenantId,
    ticket,
    status: "pending",
  });
};

import { Ticket } from "@prisma/client";
import { logger } from "./logger";
import { getFastifyApp } from "../api";
import { getWbot } from "../lib/wbot";
import socketEmit from "../api/helpers/socketEmit";
export interface TicketContato extends Ticket {
  contact: {
    id: number;
    name: string;
    email: string;
    number: string;
    telegramId: string;
    serializednumber: string;
  };
}
const SetTicketMessagesAsRead = async (
  ticket: TicketContato
): Promise<void> => {
  const appService = getFastifyApp().services;

  const ticketUpdate = await appService.ticketService.updateTicket(ticket.id, {
    unreadMessages: 0,
  });

  try {
    if (
      ticket.channel === "whatsapp" &&
      !ticket.isGroup &&
      ticket.contact?.number !== "0"
    ) {
      const wbot = getWbot(ticket.whatsappId!);
      wbot
        .sendSeen(ticket.contact.serializednumber)
        .catch((e: any) =>
          console.error("não foi possível marcar como lido", e)
        );
    }
  } catch (err) {
    logger.warn(
      `Could not mark messages as read. Maybe whatsapp session disconnected? Err: ${err}`
    );
  }

  // const ticketReload = await ShowTicketService({
  //   id: ticket.id,
  //   tenantId: ticket.tenantId,
  // });

  socketEmit({
    tenantId: ticket.tenantId,
    type: "ticket:update",
    payload: ticketUpdate,
  });
};

export default SetTicketMessagesAsRead;

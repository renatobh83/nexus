import { Ticket } from "@prisma/client";
import { logger } from "./logger";
import { getFastifyApp } from "../api";
interface TicketContato extends Ticket {
  contact: {
    id: number;
    name: string;
    email: string;
    number: string;
    telegramId: string;
  };
}
const SetTicketMessagesAsRead = async (
  ticket: TicketContato,
  messageId: string
): Promise<void> => {
  const appService = getFastifyApp().services;
  console.log(messageId);
  console.log(typeof messageId);
  // await appService.messageService.updateMessageById(messageId, {
  //   read: true,
  // });
  // await appService.messageService..update(
  //   { read: true },
  //   {
  //     where: {
  //       ticketId: ticket.id,
  //       read: false,
  //     },
  //   }
  // );
  await appService.ticketService.updateTicket(ticket.id, { unreadMessages: 0 });

  try {
    if (
      ticket.channel === "whatsapp" &&
      !ticket.isGroup &&
      ticket.contact.number !== "0"
    ) {
      // const wbot = await GetTicketWbot(ticket);
      // wbot
      //   .sendSeen(ticket.contact.serializednumber!)
      //   .catch((e: any) =>
      //     console.error("não foi possível marcar como lido", e)
      //   );
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

  // socketEmit({
  //   tenantId: ticket.tenantId,
  //   type: "ticket:update",
  //   payload: ticketReload,
  // });
};

export default SetTicketMessagesAsRead;

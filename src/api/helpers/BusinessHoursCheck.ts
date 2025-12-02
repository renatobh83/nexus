import { Ticket } from "@prisma/client";
import VerifyBusinessHoursFlow from "./VerifyBusinessHoursFlow";
import { getFastifyApp } from "..";

export const handleBusinessHoursCheck = async (
  ticket: Ticket
): Promise<boolean> => {
  const isBusinessHours = await VerifyBusinessHoursFlow(ticket);

  if (!isBusinessHours) {
    await getFastifyApp().services.ticketService.updateTicketAndEmit(ticket, {
      status: "closed",
      lastMessage: "Fora do horario de atendimento",
      closedAt: new Date().getTime(),
      botRetries: 0,
      lastInteractionBot: new Date(),
    });
    return false;
  }
  return true;
};

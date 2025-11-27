import { getFastifyApp } from "../..";
import { AppError } from "../../../errors/errors.helper";
import { getWbot } from "../../../lib/wbot";
import { setTyping } from "./typingManager";

export const startTypingWbot = async (ticketId: number) => {
  const ticket = await getFastifyApp().services.ticketService.findTicketBy({
    id: ticketId,
  });
  if (!ticket) {
    throw new AppError("ERRO_TICKET_NO_FOUND", 404);
  }
  if (ticket.channel !== "whatsapp") return;
  // 🔒 Evita chamadas repetidas
  const canSend = setTyping(String(ticketId), 3000); // 3s bloqueio
  if (!canSend) {
    return; // já está digitando, não envia de novo
  }
  console.log(ticket);
  // const wbot = getWbot(ticket.whatsappId!);

  // wbot.startTyping(ticket.contact.serializednumber!);
};

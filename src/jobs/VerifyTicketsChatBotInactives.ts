import { getFastifyApp } from "../api";
import { logger } from "../ultis/logger";


export default {
  key: "VerifyTicketsChatBotInactives",
  options: {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: 5,
  },
  async handle() {
    try {

      const ticketService = getFastifyApp().services.ticketService;
      await ticketService.findAndUpdateTicketChatBotInactives(1)

      return { success: true, message: "Ticket Closed" };
    } catch (error: unknown) {

      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      logger.error({
        message: `Erro catastrófico durante a execução do job . O job continuará agendado.`,
        errorDetails: errorMessage,
        originalError: error,
      });
    }
  },
};

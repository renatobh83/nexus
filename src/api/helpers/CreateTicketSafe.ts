import { getFastifyApp } from "..";
import { redisClient } from "../../lib/redis";
import { logger } from "../../ultis/logger";
import { REDIS_KEYS } from "../../ultis/redisCache";

// const commonIncludes = [
//   { model: Contact, as: "contact" },
//   { model: User, as: "user", attributes: ["id", "name"] },
//   { association: "whatsapp", attributes: ["id", "name"] },
// ];

export const findOrCreateTicketSafe = async (params: {
  contact: any;
  whatsappId: number;
  unreadMessages: number;
  msg: any;
  tenantId: number;
  channel: string;
  groupContact: boolean;
}): Promise<{ ticket: any; isNew: boolean }> => {
  const Ticket = getFastifyApp().services.ticketService;
  const { contact, whatsappId } = params;
  const lockKey = REDIS_KEYS.ticketLock(whatsappId, contact.id);

  // Tenta adquirir o lock distribuído
  const lockAcquired = await redisClient.set(lockKey, "locked", "EX", 10, "NX");

  if (lockAcquired) {
    // === LOCK ADQUIRIDO: Somos o primeiro processo ===
    logger.info(
      `[Channel-${whatsappId}] Lock adquirido para ${lockKey}. Procedendo com a criação.`
    );
    try {
      // Verifica se um ticket aberto já existe (pode ter sido criado em uma interação anterior)
      const existingTicket = await Ticket.findTicketBy({
        contactId: contact.id,
        whatsappId,
      });
      if (existingTicket) {
        logger.info(
          `[Channel-${whatsappId}] Ticket ${existingTicket.id} já existia. Usando-o.`
        );
        return { ticket: existingTicket, isNew: false };
      }
      // Se não existe, cria o novo ticket
      const newTicket = await Ticket.createTicket(params);
      logger.info(
        `[Channel-${whatsappId}] Novo ticket ${newTicket.id} criado.`
      );
      return { ticket: newTicket, isNew: true };
    } catch (error) {
      logger.error(
        `[Channel-${whatsappId}] Erro durante a criação do ticket (com lock): ${error}`
      );
      return { ticket: null, isNew: false };
    } finally {
      // Libera o lock para futuras operações
      await redisClient.del(lockKey);
      logger.info(`[Channel-${whatsappId}] Lock liberado para ${lockKey}.`);
    }
  } else {
    // === LOCK NÃO ADQUIRIDO: Somos um processo seguidor ===
    logger.info(
      `[Channel-${whatsappId}] Lock para ${lockKey} já existe. Aguardando ticket...`
    );
    // Espera um pouco para dar tempo ao primeiro processo de criar o ticket
    await new Promise((resolve) => setTimeout(resolve, 500)); // Delay de 500ms

    // Busca o ticket que o outro processo DEVE ter criado
    const ticket = await Ticket.findTicketBy({
      contactId: contact.id,
      whatsappId,
      status: "pending",
    });

    if (ticket) {
      logger.info(
        `[Channel-${whatsappId}] Ticket ${ticket.id} encontrado após aguardar.`
      );
      return { ticket, isNew: false };
    } else {
      logger.error(
        `[Channel-${whatsappId}] Aguardou pelo lock, mas o ticket não foi encontrado. Isso pode indicar uma falha na criação pelo processo líder.`
      );
      return { ticket: null, isNew: false };
    }
  }
};

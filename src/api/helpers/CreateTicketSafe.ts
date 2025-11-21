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
  tenantId: number;
  msg: any;
  channel: string;
  groupContact: boolean;
}): Promise<any> => {
  const { contact, whatsappId } = params;
  const lockKey = REDIS_KEYS.ticketLock(whatsappId, contact.id);

  // Tenta adquirir o lock distribuído
  const lockAcquired = await redisClient.set(
    lockKey,
    "locked",
    "EX",
    10,
    "NX"
  );
  console.log(lockAcquired)

  if (lockAcquired) {
//     try {
//       // Verifica se um ticket aberto já existe (pode ter sido criado em uma interação anterior)
//       const existingTicket = await Ticket.findOne({
//         where: { contactId: contact.id, whatsappId, status: "pending" },
//         include: commonIncludes,
//       });
//       if (existingTicket) {
//         logger.info(
//           `[whatsapp] Ticket ${existingTicket.id} já existia. Usando-o.`
//         );
//         return { ticket: existingTicket, isNew: false };
//       }
//       // Se não existe, cria o novo ticket
//       const newTicket = await FindOrCreateTicketService(params);
//       logger.info(`[whatsapp] Novo ticket ${newTicket.id} criado.`);
//       return { ticket: newTicket, isNew: true };
//     } catch (error) {
//       logger.error(
//         `[whatsapp] Erro durante a criação do ticket (com lock): ${error}`
//       );
//       return { ticket: null, isNew: false };
//     } finally {
//       // Libera o lock para futuras operações
//       await redisClient.del(lockKey);
//       logger.info(`[whatsapp] Lock liberado para ${lockKey}.`);
//     }
//   } else {
//     // === LOCK NÃO ADQUIRIDO: Somos um processo seguidor ===
//     logger.info(
//       `[whatsapp] Lock para ${lockKey} já existe. Aguardando ticket...`
//     );
//     // Espera um pouco para dar tempo ao primeiro processo de criar o ticket

//     // Busca o ticket que o outro processo DEVE ter criado
//     const ticket = await Ticket.findOne({
//       where: { contactId: contact.id, whatsappId, status: "pending" },
//       order: [["createdAt", "DESC"]], // Pega o mais recente para garantir
//       include: commonIncludes,
//     });
//     if (ticket) {
//       logger.info(`[whatsapp] Ticket ${ticket.id} encontrado após aguardar.`);
//       return { ticket, isNew: false };
//     } else {
//       logger.error(
//         `[whatsapp] Aguardou pelo lock, mas o ticket não foi encontrado. Isso pode indicar uma falha na criação pelo processo líder.`
//       );
//       return { ticket: null, isNew: false };
//     }
  }
}
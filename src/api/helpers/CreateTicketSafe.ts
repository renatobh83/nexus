import { Ticket } from "@prisma/client";
import { getFastifyApp } from "..";
import { redisClient } from "../../lib/redis";
import { logger } from "../../ultis/logger";
import { REDIS_KEYS } from "../../ultis/redisCache";
import socketEmit from "./socketEmit";

// Função auxiliar para esperar um determinado tempo
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const findOrCreateTicketSafe = async (params: {
  contact: any;
  whatsappId: number;
  unreadMessages: number;
  msg?: any;
  tenantId: number;
  channel: string;
  groupContact: boolean;
  empresaId?: number;
  socketId?: number;
  chatClient?: boolean;
}): Promise<{ ticket: any; isNew: boolean }> => {
  const TicketService = getFastifyApp().services.ticketService;
  
  const ChatFlow = getFastifyApp().services.chatFlowService;
  
  const { contact, whatsappId, msg } = params;

  const lockKey = REDIS_KEYS.ticketLock(whatsappId, contact.id);
  const LOCK_TIMEOUT = 30;
  const lockId = `${process.pid}-${Date.now()}`;
  // Tenta adquirir o lock distribuído
  const lockAcquired = await redisClient.set(
    lockKey,
    lockId,
    "EX",
    LOCK_TIMEOUT,
    "NX"
  );

  if (lockAcquired) {
    // === LOCK ADQUIRIDO: Somos o primeiro processo ===
    logger.info(
      `[Channel-${whatsappId}] Lock adquirido para ${lockKey}. Procedendo com a criação.`
    );
    try {
      // Verifica se um ticket aberto já existe (pode ter sido criado em uma interação anterior)
      const existingTicket = await TicketService.findTicketBy({
        contactId: contact.id,
        whatsappId,
        status: {
          in: ["pending", "open"],
        },
      });

      if (existingTicket) {
        logger.info(
          `[Channel-${whatsappId}] Ticket ${existingTicket.id} já existia. Usando-o.`
        );
        return { ticket: existingTicket, isNew: false };
      }

      // Se não existe, cria o novo ticket
      let newTicket: Ticket = await TicketService.createTicket(params);
      logger.info(
        `[Channel-${whatsappId}] Novo ticket ${newTicket.id} criado.`
      );

      if ((msg && !msg.fromMe) || (!newTicket.userId && !msg.author)) {
        const ticket = await ChatFlow.CheckChatBotFlowWelcome(newTicket);
        newTicket = ticket ? ticket : newTicket;
      }

      socketEmit({
        tenantId: newTicket.tenantId,
        type: "ticket:update",
        payload: newTicket,
      });
      getFastifyApp().services.logTicketService.createLogTicket({
        ticketId: newTicket.id,
        tenantId: newTicket.tenantId,
        type: "create",
        chamadoId: null,
        queueId: null,
        userId: null,
      });
      return { ticket: newTicket, isNew: true };
    } catch (error) {
      logger.error(
        `[Channel-${whatsappId}] Erro durante a criação do ticket (com lock): ${error}`
      );
      return { ticket: null, isNew: false };
    } finally {
      // Libera o lock para futuras operações
      const currentLockValue = await redisClient.get(lockKey);
      if (currentLockValue === lockId) {
        await redisClient.del(lockKey);
      }
      logger.info(`[Channel-${whatsappId}] Lock liberado para ${lockKey}.`);
    }
  } else {
    // === LOCK NÃO ADQUIRIDO: Somos um processo seguidor ===
    logger.info(
      `[Channel-${whatsappId}] Lock para ${lockKey} já existe. Aguardando ticket...`
    );
    const MAX_WAIT_TIME_MS = 5000; // Tempo máximo de espera (5 segundos)
    const POLLING_INTERVAL_MS = 200; // Intervalo de checagem (200ms)
    const startTime = Date.now();
    let ticket: Awaited<ReturnType<typeof TicketService.findTicketBy>> = null;

    // Loop de polling
    while (Date.now() - startTime < MAX_WAIT_TIME_MS) {
      // 1. Tenta encontrar o ticket que o processo líder deve estar criando/usando
      ticket = await TicketService.findTicketBy({
        contactId: contact.id,
        whatsappId,
        // Busca por 'pending' ou 'open' para ser consistente com o líder
        status: {
          in: ["pending", "open"],
        },
      });

      if (ticket) {
        logger.info(
          `[Channel-${whatsappId}] Ticket ${ticket.id} encontrado após ${
            Date.now() - startTime
          }ms de espera.`
        );
        return { ticket, isNew: false };
      }

      // 2. Espera o intervalo antes da próxima checagem
      await sleep(POLLING_INTERVAL_MS);
    }

    // Se o loop terminar sem encontrar o ticket
    logger.error(
      `[Channel-${whatsappId}] Aguardou pelo lock por ${MAX_WAIT_TIME_MS}ms, mas o ticket não foi encontrado. Isso indica falha na criação pelo processo líder ou tempo de espera insuficiente.`
    );
    return { ticket: null, isNew: false };
  }
};

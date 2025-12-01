import { logger } from "../../../ultis/logger";
import { verifyContactTbot } from "./verifycontactTbot";
import { getFastifyApp } from "../..";
import { findOrCreateTicketSafe } from "../CreateTicketSafe";
import { Session } from "../../../lib/tbot";
import { VerifyMessageTbot } from "./VerifyMessageTbot";
import VerifyMediaMessageTbot from "./VerifyMediaMessageTbot";
import { isValidFlowAnswer } from "../isValidFlowAnswer";
import { isRetriesLimit } from "../../../core/Tickets/tickets.utils";
import { SendBotMessage } from "../SendBotMessage";

// // Constantes para chaves Redis e TTLs
// const REDIS_KEYS = {
//   channel: (id: number) => `cache:tbot:channel:${id}`,
//   botInstance: (id: number) => `cache:bot:${id}`,
//   contact: (whatsappId: number, userId: number) =>
//     `cache:tbot:contact:${whatsappId}:${userId}`,
//   ticketLock: (whatsappId: number, contactId: number) =>
//     `lock:tbot:ticket:${whatsappId}:${contactId}`,
// };
// const TTL = {
//   CACHE: 5 * 60, // 5 minutos para caches gerais
//   LOCK: 10, // 15 segundos para um lock de criação de ticket
// };

// const commonIncludes = [
//   { model: Contact, as: "contact" },
//   { model: User, as: "user", attributes: ["id", "name"] },
//   { association: "whatsapp", attributes: ["id", "name"] },
// ];

// ========================================================================
// FUNÇÕES DE CACHE REESCRITAS COM REDIS
// ========================================================================

// const getCachedChannel = async (whatsappId: number): Promise<Whatsapp> => {
//   const key = REDIS_KEYS.channel(whatsappId);
//   const cached = await redisClient.get(key);
//   if (cached) {
//     return JSON.parse(cached);
//   }

//   const channel = await ShowWhatsAppService({ id: whatsappId });
//   if (channel) {
//     await redisClient.set(key, JSON.stringify(channel), "EX", TTL.CACHE);
//   }
//   return channel;
// };

// export const getCachedBotInstance = async (ctx: any): Promise<any> => {
//   const botId = ctx?.botInfo?.id || ctx?.me?.id;
//   if (!botId) return ctx.telegram.getMe();

//   const key = REDIS_KEYS.botInstance(botId);
//   const cached = await redisClient.get(key);
//   if (cached) {
//     return JSON.parse(cached);
//   }

//   const botInstance = await ctx.telegram.getMe();
//   if (botInstance) {
//     await redisClient.set(key, JSON.stringify(botInstance), "EX", TTL.CACHE);
//   }
//   return botInstance;
// };

// const getCachedContact = async (
//   ctx: any,
//   tenantId: number,
//   whatsappId: number
// ): Promise<any> => {
//   const userId =
//     ctx.message?.from?.id ||
//     ctx.update?.callback_query?.from?.id ||
//     ctx.update?.edited_message?.from?.id;
//   if (!userId) return VerifyContact(ctx, tenantId);

//   const key = REDIS_KEYS.contact(whatsappId, userId);
//   const cached = await redisClient.get(key);
//   if (cached) {
//     return JSON.parse(cached);
//   }

//   const contact = await VerifyContact(ctx, tenantId);
//   if (contact) {
//     await redisClient.set(key, JSON.stringify(contact), "EX", TTL.CACHE);
//   }
//   return contact;
// };

// ========================================================================
// HANDLEMESSAGE PRINCIPAL (AGORA MAIS LIMPO)
// ========================================================================

const HandleMessage = async (ctx: any, tbot: Session): Promise<void> => {
  const app = getFastifyApp().services;
  try {
    let message = ctx?.message || ctx.update.callback_query?.message;

    if (!message && ctx.update) {
      message = ctx.update.edited_message;
    }
    if (!message) {
      logger.warn(
        "[Telegram] Não foi possível extrair a mensagem do contexto.",
        ctx
      );
      return;
    }

    const chat = message.chat;

    const me = await ctx.telegram.getMe();
    const fromMe =
      me.id ===
      (ctx.message?.from?.id ||
        ctx.update?.callback_query?.from?.id ||
        ctx.update?.edited_message?.from?.id);

    const contact = await verifyContactTbot(ctx, app, tbot);
    const messageData = { ...message, timestamp: +message.date * 1000 };

    const { ticket, isNew } = await findOrCreateTicketSafe({
      contact,
      whatsappId: tbot.id,
      unreadMessages: fromMe ? 0 : 1,
      groupContact: false,
      tenantId: tbot.tenantId,
      msg: { ...messageData, fromMe },
      channel: "telegram",
    });
    if (!ticket) {
      logger.error("[Telegram] Falha crítica ao criar ou obter ticket.");
      return;
    }
    if (ticket.isFarewellMessage) return;

    if (!messageData.text && chat?.id) {
      await VerifyMediaMessageTbot(ctx, fromMe, ticket, contact, app);
    } else {
      await VerifyMessageTbot(ctx, fromMe, ticket, contact, app);
    }
    const body = message.reply_markup
      ? ctx.update.callback_query?.data
      : message.text;
    if (isNew) {
      // Se o ticket foi criado AGORA, executa o flow. Apenas UM processo receberá isNew = true.
      logger.info(
        `[Telegram] Ticket ${ticket.id} é novo. Iniciando ChatFlow de boas-vindas.`
      );
      await app.ticketService.VerifyStepsChatFlowTicket(
        { fromMe, body, type: "reply_markup" },
        ticket,
        isNew
      );
      await app.ticketService.updateTicket(ticket.id, {
        chatFlowStatus: "waiting_answer",
      });
    } else if (ticket.chatFlowStatus === "waiting_answer") {
      logger.info(
        `[Telegram] Ticket ${ticket.id} está aguardando resposta. Processando...`
      );
      const chatFlow = await getFastifyApp().services.chatFlowService.findOne(
        ticket.chaflowId
      );
      const step = (chatFlow?.flow as any).nodeList.find(
        (node: any) => node.id === ticket.stepChatFlow
      );
console.log(step)
      if (step) {
        if (isValidFlowAnswer({ fromMe, body, type: "reply_markup" }, step)) {
          logger.info(
            `[Telegram] Ticket ${ticket.id}: Resposta inicial válida. Processando passo.`
          );
          await app.ticketService.VerifyStepsChatFlowTicket(
            { fromMe, body, type: "reply_markup" },
            ticket
          );

          await app.ticketService.updateTicket(ticket.id, {
            chatFlowStatus: "in_progress",
          });
        } else {
          logger.warn(
            `[Telegram] Ticket ${ticket.id}: Resposta inválida recebida no estado 'waiting_answer'. Ignorando e notificando.`
          );
          const flowConfig = (chatFlow!.flow as any).nodeList.find(
            (node: any) => node.type === "configurations"
          );
          if (await isRetriesLimit(ticket, flowConfig)) return;
          const defaultMessage =
            "Por favor, escolha uma das opções do menu para continuar.";
          const messageBody =
            flowConfig?.data?.notOptionsSelectMessage?.message ||
            defaultMessage;
          await SendBotMessage(ticket.tenantId, ticket, messageBody);
          await app.ticketService.updateTicket(ticket.id, {
            botRetries: ticket.botRetries + 1,
          });
        }
      }
    } else if (ticket.chatFlowStatus === "in_progress") {
      logger.info(
        `[Telegram] Ticket ${ticket.id} em atendimento normal. Verificando passos.`
      );
      await app.ticketService.VerifyStepsChatFlowTicket(
        { fromMe, body, type: "reply_markup" },
        ticket
      );
    }
  } catch (error) {
    logger.error("Erro fatal no HandleMessage:", error);
  }
};

export default HandleMessage;

import { Chat, Message, Whatsapp as wbot } from "wbotconnect";

import { isValidMsg } from "./isValidMsg";
import { getFastifyApp } from "../..";
import { verifyContactWbot } from "./verifycontactWbot";
import { Session } from "../../../lib/wbot";
import { findOrCreateTicketSafe } from "../CreateTicketSafe";
import { logger } from "../../../ultis/logger";
import VerifyMediaMessage from "./VerifyMediaMessage";
import VerifyMessage from "./VerifyMessage";
import { isValidFlowAnswer } from "../isValidFlowAnswer";
import { isRetriesLimit } from "../../../core/Tickets/tickets.utils";
import { sendBotMessage } from "../SendBotMessage";

export const HandleMessageReceived = async (
  message: Message,
  wbot: Session
): Promise<void> => {
  if (!isValidMsg(message)) {
    return;
  }
  try {
    const app = getFastifyApp().services;
    const chat = await wbot.getChatById(message.chatId);
    const contact = await verifyContactWbot(message, app, wbot);

    let authorGrupMessage: any = "";

    if (message.isGroupMsg && !message.fromMe) {
      const numberContato = await wbot.getContactLid(message.author);
      const contato = await app.contatoService.findContato({
        serializednumber: numberContato,
      });
      authorGrupMessage = contato;
    }

    const { ticket, isNew } = await findOrCreateTicketSafe({
      contact,
      whatsappId: wbot.id,
      unreadMessages: message.fromMe ? 0 : chat.unreadCount,
      groupContact: chat.isGroup,
      tenantId: wbot.tenantId,
      msg: message,
      channel: "whatsapp",
    });

    if (!ticket) {
      logger.error("[whatsapp] Falha crítica ao criar ou obter ticket.");
      return;
    }

    if (message.filehash) {
      await VerifyMediaMessage(
        message,
        ticket,
        contact,
        wbot,
        authorGrupMessage
      );
    } else {
      await VerifyMessage(message, ticket, contact, authorGrupMessage);
    }

    if (isNew) {
      // Se o ticket foi criado AGORA, executa o flow. Apenas UM processo receberá isNew = true.
      logger.info(
        `[whatsapp] Ticket ${ticket.id} é novo. Iniciando ChatFlow de boas-vindas.`
      );
      await app.ticketService.VerifyStepsChatFlowTicket(message, ticket, isNew);

      const a = await app.ticketService.updateTicket(ticket.id, {
        chatFlowStatus: "waiting_answer",
      });
    } else if (ticket.chatFlowStatus === "waiting_answer") {
      logger.info(
        `[WhatsApp] Ticket ${ticket.id} está aguardando resposta. Processando...`
      );
      const chatFlow = await getFastifyApp().services.chatFlowService.findOne(
        ticket.chaflowId
      );
      const step = (chatFlow?.flow as any).nodeList.find(
        (node: any) => node.id === ticket.stepChatFlow
      );

      if (step) {
        if (isValidFlowAnswer(message, step)) {
          // A RESPOSTA É VÁLIDA! Agora sim, processamos o fluxo.
          logger.info(
            `[whatsapp] Ticket ${ticket.id}: Resposta inicial válida. Processando passo.`
          );
          await app.ticketService.VerifyStepsChatFlowTicket(message, ticket);
          // E finalmente, mudamos o estado para o fluxo normal.
          await app.ticketService.updateTicket(ticket.id, {
            chatFlowStatus: "in_progress",
          });
        } else {
          logger.warn(
            `[whatsapp] Ticket ${ticket.id}: Resposta inválida recebida no estado 'waiting_answer'. Ignorando e notificando.`
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
          await sendBotMessage(ticket.tenantId, ticket, messageBody);
          await app.ticketService.updateTicket(ticket.id, {
            botRetries: ticket.botRetries + 1,
          });
        }
      }
    } else if (ticket.chatFlowStatus === "in_progress") {
      logger.info(
        `[Telegram] Ticket ${ticket.id} em atendimento normal. Verificando passos.`
      );

      await app.ticketService.VerifyStepsChatFlowTicket(message, ticket);
    }
    // TODO WEBHOOK
    // const apiConfig: any = ticket.apiConfig || {};

    // if (
    //   !msg.fromMe &&
    //   !ticket.isGroup &&
    //   !ticket.answered &&
    //   apiConfig?.externalKey &&
    //   apiConfig?.urlMessageStatus
    // ) {
    //   const payload = {
    //     timestamp: Date.now(),
    //     msg,
    //     messageId: msg.id,
    //     ticketId: ticket.id,
    //     externalKey: apiConfig?.externalKey,
    //     authToken: apiConfig?.authToken,
    //     type: "hookMessage",
    //   };
    // addJob("WebHooksAPI", {
    //     url: apiConfig.urlMessageStatus,
    //     type: payload.type,
    //     payload,
    // });
  } catch (error) {
    logger.error("Erro fatal no HandleMessage:", error);
  }
};

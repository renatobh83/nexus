import { Chat, Message } from "wbotconnect";
import { Contact } from "@prisma/client";
import { getFastifyApp } from "../..";
import { REDIS_KEYS } from "../../../ultis/redisCache";
import { findOrCreateTicketSafe } from "../CreateTicketSafe";
import { verifyContactWbot } from "./verifycontactWbot";
import { Session } from "../../../lib/wbot";
import VerifyMediaMessage from "./VerifyMediaMessage";
import VerifyMessage from "./VerifyMessage";
import VerifyBusinessHoursFlow from "../VerifyBusinessHoursFlow";
import { logger } from "../../../ultis/logger";
import { isValidFlowAnswer } from "../isValidFlowAnswer";
import { isRetriesLimit } from "../../../core/Tickets/tickets.utils";
import { sendBotMessage } from "../SendBotMessage";

export const HandleMessage = async (
  message: Message,
  wbot: Session
): Promise<void> => {
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

  // if (ticket.isFarewellMessage) return;

  //TODO Colocar a integracao externa
  if (message.filehash) {
    await VerifyMediaMessage(message, ticket, contact, wbot, authorGrupMessage);
  } else {
    await VerifyMessage(message, ticket, contact, authorGrupMessage);
  }
  console.log(ticket.chatFlowStatus);
  if (isNew) {
    // Se o ticket foi criado AGORA, executa o flow. Apenas UM processo receberá isNew = true.
    logger.info(
      `[Whatsapp] Ticket ${ticket.id} é novo. Iniciando ChatFlow de boas-vindas.`
    );
    await app.ticketService.VerifyStepsChatFlowTicket(message, ticket, isNew);

    await app.ticketService.updateTicket(ticket.id, {
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
        logger.info(
          `[WhatsApp] Ticket ${ticket.id}: Resposta inicial válida. Processando passo.`
        );
        await app.ticketService.VerifyStepsChatFlowTicket(message, ticket);
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
          flowConfig?.data?.notOptionsSelectMessage?.message || defaultMessage;
        await sendBotMessage(ticket.tenantId, ticket, messageBody);
        await app.ticketService.updateTicket(ticket.id, {
          botRetries: ticket.botRetries + 1,
        });
      }
    } else if (ticket.chatFlowStatus === "in_progress") {
      logger.info(
        `[whatsapp] Ticket ${ticket.id} em atendimento normal. Verificando passos.`
      );
      await app.ticketService.VerifyStepsChatFlowTicket(message, ticket);
    }
  }
};

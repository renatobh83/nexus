import { getFullMediaUrl } from "../../ultis/getFullMediaUrl";
import { v4 as uuidV4 } from "uuid";
import type { Message as WbotMessage } from "wbotconnect";
import {
  TicketWithStandardIncludes,
  TicketWithMessages,
  StepCondition,
  ConditionType,
  FlowConfig,
  RetryDestinyType,
  ChatFlowAction,
  Step,
} from "./tickets.type";
import { ChatFlow, Ticket } from "@prisma/client";

import { getFastifyApp } from "../../api";
import { sendBotMessage } from "../../api/helpers/SendBotMessage";
import BuildSendMessageService, {
  MessageType,
} from "../../api/helpers/BuildSendMessage";
import { handleBusinessHoursCheck } from "../../api/helpers/BusinessHoursCheck";

type TicketInput = TicketWithStandardIncludes | TicketWithStandardIncludes[];
type TicketOutput = TicketWithMessages | TicketWithMessages[];

function _transformSingleTicket(
  ticket: TicketWithStandardIncludes
): TicketWithMessages {
  // if (!ticket || !ticket.messages) {
  //   return ticket as TicketWithMessages;
  // }

  const MessageForResponse = ticket.messages.map((message) => {
    const newQuot = message.quotedMsg
      ? {
          ...message.quotedMsg,
          mediaUrl: message.quotedMsg.mediaUrl
            ? getFullMediaUrl(message.quotedMsg.mediaUrl)
            : null,
        }
      : null;

    return {
      ...message,
      mediaUrl: getFullMediaUrl(message.mediaUrl),
      quotedMsg: newQuot,
      isGroup: ticket.isGroup,
      channel: ticket.channel,
    };
  });

  return {
    ...ticket,
    messages: MessageForResponse,
    username: ticket.user?.name,
    contactId: ticket.contactId,
    empresanome: ticket.empresa?.name,
    name: ticket.contact.name,
    profilePicUrl: ticket.contact.profilePicUrl,
  } as TicketWithMessages;
}

// Função principal flexível
export function transformTickets(tickets: TicketInput): TicketOutput {
  // Verifica se a entrada é um array
  if (Array.isArray(tickets)) {
    // Se for um array, mapeia e aplica a transformação em cada item
    return tickets.map(_transformSingleTicket);
  }

  // Se for um objeto único, aplica a transformação diretamente
  return _transformSingleTicket(tickets);
}

export const findStepCondition = (
  conditions: StepCondition[],
  msg: any
): StepCondition | undefined => {
  const message = getMessageBody(msg);

  return conditions.find((condition) => {
    if (
      condition.type === ConditionType.UserSelection ||
      condition.type === ConditionType.Automatic
    ) {
      return true; // Condições 'US' e 'A' sempre retornam true para serem tratadas como fallback ou ação automática
    }
    return condition.condition?.some((c) =>
      message.startsWith(String(c).toLowerCase().trim())
    );
  });
};

const getMessageBody = (msg: WbotMessage | any): string => {
  if (msg.type === "reply_markup") {
    return msg.body.toLowerCase().trim();
  }
  if (msg.type === "list_response") {
    return String(msg.listResponse.singleSelectReply.selectedRowId)
      .toLowerCase()
      .trim();
  }
  return String(msg.body).toLowerCase().trim();
};

export const sendCloseMessage = async (
  ticket: Ticket,
  flowConfig: FlowConfig
): Promise<void> => {
  if (flowConfig?.data?.notResponseMessage?.message) {
    const messageBody = flowConfig.data.notResponseMessage.message;
    await sendBotMessage(ticket.tenantId, ticket, messageBody);
  }
};
export const sendWelcomeMessage = async (
  ticket: Ticket,
  flowConfig: FlowConfig
): Promise<void> => {
  if (flowConfig?.data?.welcomeMessage?.message) {
    const messageBody = flowConfig.data.welcomeMessage.message;

    await sendBotMessage(ticket.tenantId, ticket, messageBody);
  }
};

export const isRetriesLimit = async (
  ticket: Ticket,
  flowConfig: FlowConfig
): Promise<boolean> => {
  const maxRetryNumber = flowConfig?.data?.maxRetryBotMessage?.number;
  // const sessao = await getCache(REDIS_KEYS.sessao(ticket.id)); // carrega ou cria a sessão no Redis
  if (
    flowConfig?.data?.maxRetryBotMessage &&
    maxRetryNumber &&
    ticket.botRetries! >= maxRetryNumber - 1
    // || sessao.errosResponse >= maxRetryNumber - 1
  ) {
    const destinyType = flowConfig.data.maxRetryBotMessage.type;
    const { destiny } = flowConfig.data.maxRetryBotMessage;

    const updatedValues: Partial<Ticket> = {
      botRetries: 0,
      lastInteractionBot: new Date(),
    };
    const logsRetry: any = {
      ticketId: ticket.id,
      tenantId: ticket.tenantId,
    };

    if (destinyType === RetryDestinyType.Close) {
      updatedValues.status = "closed";
      updatedValues.closedAt = BigInt(new Date().getTime());
      await sendCloseMessage(ticket, flowConfig);
      logsRetry.type = "retriesLimitClose";
    } else if (destinyType === RetryDestinyType.Queue && destiny) {
      updatedValues.queueId = Number(destiny);
      logsRetry.type = "retriesLimitQueue";
      logsRetry.queueId = destiny;
    } else if (destinyType === RetryDestinyType.User && destiny) {
      updatedValues.userId = Number(destiny);
      logsRetry.type = "retriesLimitUserDefine";
      logsRetry.userId = destiny;
    }

    await getFastifyApp().services.ticketService.updateTicketAndEmit(
      ticket,
      updatedValues,
      "ticket:update_chatflow"
    );
    await getFastifyApp().services.logTicketService.createLogTicket(logsRetry);
    // enviar mensagem de boas vindas à fila ou usuário
    if (destinyType !== RetryDestinyType.Close) {
      await sendWelcomeMessage(ticket, flowConfig);
    }
    return true;
  }
  return false;
};

export const handleNextStep = async (
  ticket: Ticket,
  chatFlow: ChatFlow,
  stepCondition: StepCondition,
  msg: WbotMessage | any
): Promise<void> => {
  if (stepCondition.action === ChatFlowAction.NextStep) {
    await getFastifyApp().services.ticketService.updateTicketAndEmit(ticket, {
      stepChatFlow: stepCondition.nextStepId,
      botRetries: 0,
      lastInteractionBot: new Date(),
    });

    const nodesList = [...(chatFlow.flow as any).nodeList];

    const nextStep = nodesList.find(
      (n) => n.id === stepCondition.nextStepId
    ) as Step;

    if (!nextStep) return;

    for (const interaction of nextStep.data.interactions) {
      await BuildSendMessageService({
        msg: { ...interaction, msg },
        tenantId: ticket.tenantId,
        ticket,
      });
    }
  }
};

export const handleQueueAssignment = async (
  ticket: Ticket,
  flowConfig: any,
  stepCondition: any
): Promise<void> => {
  try {
    if (stepCondition.action === ChatFlowAction.QueueDefine) {
      if (!(await handleBusinessHoursCheck(ticket))) return;

      const ticketUpdate =
        await getFastifyApp().services.ticketService.updateTicketAndEmit(
          ticket,
          {
            queueId: stepCondition.queueId,
            chatFlowId: null,
            stepChatFlow: null,
            botRetries: 0,
            lastInteractionBot: new Date(),
          },
          "ticket:update_chatflow"
        );

      await getFastifyApp().services.logTicketService.createLogTicket({
        chamadoId: null,
        userId: null,
        ticketId: ticket.id,
        type: "queue",
        queueId: stepCondition.queueId,
        tenantId: ticket.tenantId,
      });

      if (flowConfig?.data?.autoDistributeTickets) {
        // TODO criar regra de autodistribuicao na fila
        // await DefinedUserBotService(
        //   ticket,
        //   stepCondition.queueId,
        //   ticket.tenantId,
        //   flowConfig.data.autoDistributeTickets
        // );
        // await ticket.reload();
      }
      return ticketUpdate;
    }
  } catch (error) {
    console.log(error);
  }
};

export const handleUserAssignment = async (
  ticket: Ticket,
  stepCondition: StepCondition
): Promise<void> => {
  if (stepCondition.action === ChatFlowAction.UserDefine) {
    if (!(await handleBusinessHoursCheck(ticket))) return;

    await getFastifyApp().services.ticketService.updateTicketAndEmit(ticket, {
      userId: stepCondition.userIdDestination,
      chatFlowId: null,
      stepChatFlow: null,
      botRetries: 0,
      lastInteractionBot: new Date(),
    });

    await getFastifyApp().services.logTicketService.createLogTicket({
      chamadoId: null,
      queueId: null,
      userId: stepCondition.userIdDestination as unknown as number,
      ticketId: ticket.id,
      type: "userDefine",
      tenantId: ticket.tenantId,
    });
  }
};
export const handleCloseTicket = async (
  ticket: Ticket,
  actionDetails: StepCondition
): Promise<void> => {
  if (actionDetails.action === ChatFlowAction.CloseTicket) {
    const closeTicketMessage = {
      message:
        actionDetails.closeTicket ||
        "🤖 Estamos finalizando o seu atendimento.",
    };

    const messageField = {
      data: closeTicketMessage,
      id: uuidV4(),
      type: "MessageField" as MessageType,
    };

    await BuildSendMessageService({
      msg: messageField,
      tenantId: ticket.tenantId,
      ticket: ticket,
    });

    await getFastifyApp().services.ticketService.updateTicketAndEmit(ticket, {
      status: "closed",
      closedAt: new Date().getTime(),
      botRetries: 0,
      lastInteractionBot: new Date(),
    });
  }
};

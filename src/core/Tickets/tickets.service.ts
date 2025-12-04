import type { Message as WbotMessage } from "wbotconnect";
import { Prisma, Ticket } from "@prisma/client";
import { AppError } from "../../errors/errors.helper";
import { SettingsService } from "../Settings/settings.service";
import { TicketRepository } from "./tickets.repository";
import {
  ChatFlowAction,
  FlowConfig,
  Step,
  TicketWithMessages,
} from "./tickets.type";
import { getFastifyApp } from "../../api";
import { getIO } from "../../lib/socket";
import socketEmit from "../../api/helpers/socketEmit";
import { logger } from "../../ultis/logger";
import {
  findStepCondition,
  handleCloseTicket,
  handleNextStep,
  handleQueueAssignment,
  handleUserAssignment,
  isRetriesLimit,
  sendWelcomeMessage,
} from "./tickets.utils";
import BuildSendMessageService from "../../api/helpers/BuildSendMessage";
import { sendBotMessage } from "../../api/helpers/SendBotMessage";
import {
  ListMessageWelcome,
  ListMessageWelcomeTelegram,
} from "../../api/helpers/Templates/optionsListMessagens";
import VerifyBusinessHoursFlow from "../../api/helpers/VerifyBusinessHoursFlow";
import { SendWhatsMessageList } from "../../api/helpers/Wbot/SendWhatsAppMessageList";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string[];
  date?: string;
  showAll?: string;
  userId: string;
  withUnreadMessages?: string;
  isNotAssignedUser?: string;
  queuesIds?: string[];
  includeNotQueueDefined?: string;
  tenantId: string | number;
  profile: string;
}
export class TicketService {
  private ticketRepository: TicketRepository;

  constructor() {
    this.ticketRepository = new TicketRepository();
  }

  async findTicketId(id: number): Promise<TicketWithMessages | null> {
    const ticket = await this.ticketRepository.findById(id);

    if (!ticket) return null;

    return ticket;
  }
  async findTicketBy(
    where: Prisma.TicketWhereInput
  ): Promise<TicketWithMessages | null> {
    const ticket = await this.ticketRepository.findOne(where);

    if (!ticket) return null;
    return ticket;
  }
  async findOrCreateTicketForward(
    contatoId: number,
    data: any
  ): Promise<Ticket | null> {
    return this.ticketRepository.findTicketForward(contatoId, data);
  }

  async findAll(
    {
      searchParam = "",
      pageNumber = "1",
      status,
      showAll,
      userId: userIdStr,
      withUnreadMessages,
      queuesIds,
      isNotAssignedUser,
      includeNotQueueDefined,
      tenantId: tenantIdStr,
      profile,
    }: Request,
    settingsService: SettingsService
  ) {
    const tenantId = +tenantIdStr;
    const userId = +userIdStr;
    const limit = 50;
    const offset = limit * (+pageNumber - 1);

    // 1. Lógica de tratamento de parâmetros
    const isAdminShowAll = showAll == "true" && profile === "admin";
    const isUnread: boolean = withUnreadMessages === "true";
    const isNotAssigned: boolean = isNotAssignedUser === "true";
    const NotQueueDefinedTicket: boolean = includeNotQueueDefined === "true";
    const isSearchParam: boolean = !!searchParam;

    // // 2. Tratamento das configurações do sistema (ListSettingsService)
    const settings = await settingsService.findAllSettings();

    const isNotViewAssignedTicketsEnabled = () => {
      const setting = settings.find((s) => s.key === "NotViewAssignedTickets");
      return setting ? setting.value === "enabled" : false;
    };

    // 3. Validação de Status
    let finalStatus = status;
    if (!finalStatus && !isAdminShowAll) {
      throw new AppError("ERR_NO_STATUS_SELECTED", 404);
    }

    if (isAdminShowAll) {
      finalStatus = ["open", "pending", "closed"];
    }

    // 4. Lógica de Filas (Queues)
    const queueCount = await this.ticketRepository.countQueuesByTenant(
      tenantId
    );
    const isExistsQueueTenant = queueCount > 0;

    const userQueues = await this.ticketRepository.findUserQueues(userId);
    let queuesIdsUser = userQueues.map((q) => q.queueId);

    // Aplica filtro de filas se houver
    if (queuesIds) {
      const newArray: number[] = [];
      const userQueueIdsSet = new Set(queuesIdsUser);

      queuesIds.forEach((i) => {
        const queueId = +i;
        // Verifica se a fila solicitada está entre as filas do usuário
        if (userQueueIdsSet.has(queueId)) {
          newArray.push(queueId);
        }
      });
      queuesIdsUser = newArray;
    }

    // Se não houver filas para o usuário, mantém o array vazio.
    // A lógica de filtro será tratada no Repository.
    if (!queuesIdsUser.length) {
      queuesIdsUser = [];
    }

    // 5. Chamada ao Repository
    const { tickets, count } = (await this.ticketRepository.findTickets({
      tenantId,
      status: finalStatus!,
      queuesIdsUser,
      userId,
      isUnread,
      isNotAssigned,
      isNotViewAssignedTickets: isNotViewAssignedTicketsEnabled(),
      isSearchParam,
      searchParam,
      limit,
      offset,
      profile,
      isExistsQueueTenant,
      NotQueueDefinedTicket,
    })) as any;

    // 6. Lógica de Paginação
    const ticketsLength = tickets.length;
    const hasMore = count > offset + ticketsLength;

    return {
      tickets: tickets || [],
      count,
      hasMore,
    };
  }
  async createTicket(data: any): Promise<Ticket> {
    const {
      contact,
      whatsappId,
      chatFlowId,
      empresaId,
      groupContact,
      tenantId,
      msg,
      userId,
      ...restData
    } = data;

    const dataForPrisma = {
      ...restData,
    };
    // 2. Adiciona as conexões (connects) de forma condicional
    if (contact?.id) {
      dataForPrisma.contact = {
        connect: { id: contact.id },
      };
    }

    if (whatsappId) {
      dataForPrisma.whatsapp = {
        connect: { id: whatsappId },
      };
    }

    if (tenantId) {
      dataForPrisma.tenant = {
        connect: { id: tenantId },
      };
    }

    if (chatFlowId) {
      dataForPrisma.chatFlow = {
        connect: { id: chatFlowId },
      };
    }
    if (empresaId) {
      dataForPrisma.empresa = {
        connect: { id: empresaId },
      };
    }
    if (userId) {
      dataForPrisma.user = {
        connect: { id: userId },
      };
    }

    dataForPrisma.isGroup = groupContact;
    dataForPrisma.chatFlowStatus = "not_started";

    const ticket = await this.ticketRepository.create(dataForPrisma);
    return ticket;
  }

  async updateTicket(
    ticketId: number,
    data: Prisma.TicketUpdateInput
  ): Promise<TicketWithMessages> {
    const tickdtUpdated = await this.ticketRepository.update(ticketId, data);

    return tickdtUpdated;
  }

  async createTicketRoute({
    userId,
    tenantId,
    contactId,
    status,
    channelId,
    channel,
    isTransference,
  }) {
    try {
      const findTicketForContatc = await this.ticketRepository.findOne({
        contactId: parseInt(contactId, 10),
        status: {
          in: ["open", "pending"],
        },
      });
      if (findTicketForContatc) {
        return {
          existingTicketId: findTicketForContatc,
          message:
            "Já existe um ticket aberto para este contato. Deseja abri-lo?",
        };
      }
      const contactService = getFastifyApp().services.contatoService;
      const contact = await contactService.findContato({
        id: parseInt(contactId, 10),
      });
      const dataForCreateTicket = {
        contact,
        status,
        isGroup: contact?.isGroup,
        userId,
        isActiveDemand: true,
        channel,
        tenantId,
        whatsappId: channelId,
      };
      const ticket = await this.createTicket(dataForCreateTicket);

      await getFastifyApp().services.logTicketService.createLogTicket({
        userId,
        queueId: null,
        chamadoId: null,
        ticketId: ticket.id,
        type: "open",
        tenantId: ticket.tenantId,
      });

      return ticket;
    } catch (error) {
      console.log(error);
    }
  }
  async updateStatusTicket({
    userId,
    queueId,
    status,
    isTransference,
    userIdRequest,
    ticketId,
    tenantId,
    chaflowId,
  }): Promise<any> {
    let ticket: Ticket;
    const logService = getFastifyApp().services.logTicketService;
    ticket = await this.ticketRepository.findOne({
      id: parseInt(ticketId),
    });
    if (!ticket) {
      throw new AppError("ERR_NO_TICKET_FOUND", 404);
    }
    const toPending = ticket.status !== "pending" && status === "pending";

    const oldStatus = ticket.status;
    const statusData = status === "close" ? "closed" : status;

    let data: any = {
      status: statusData,
    };

    if (queueId) {
      data.queue = {
        connect: { id: parseInt(queueId) },
      };
    }

    if (userId) {
      data.user = {
        connect: { id: parseInt(userId) },
      };
    }

    if (statusData === "closed") {
      data.closedAt = new Date().getTime();
      if (ticket.channel === "chatClient") {
        const io = getIO();
        const socket = io.sockets.sockets.get(ticket.socketId!);
        if (socket && socket.connected) {
          socket.emit("chat:closedTicket", "Seu ticket foi fechado. Obrigado!");
        }
      }
    }
    // se iniciar atendimento, retirar o bot e informar a data
    if (oldStatus === "pending" && statusData === "open") {
      if (ticket.chatFlowId) {
        data.chatFlow = {
          disconnect: true,
        };
      }
      data.chatFlowStatus = "not_started";
      data.startedAttendanceAt = new Date().getTime();
    }

    ticket = await this.ticketRepository.update(ticket.id, data);

    if (oldStatus === "pending" && statusData === "open") {
      await logService.createLogTicket({
        userId: userIdRequest,
        chamadoId: null,
        queueId: null,
        ticketId,
        type: "open",
        tenantId: ticket.tenantId,
      });
    }
    if (statusData === "closed") {
      await logService.createLogTicket({
        userId: userIdRequest,
        ticketId,
        type: "closed",
        tenantId: ticket.tenantId,
        chamadoId: null,
        queueId: null,
      });
    }
    if (oldStatus === "open" && statusData === "pending") {
      await logService.createLogTicket({
        userId: userIdRequest,
        ticketId,
        chamadoId: null,
        queueId: null,
        type: "pending",
        tenantId: ticket.tenantId,
      });
    }
    if (oldStatus === "closed" && statusData === "open") {
      await logService.createLogTicket({
        userId: userIdRequest,
        chamadoId: null,
        queueId: null,
        ticketId,
        type: "open",
        tenantId: ticket.tenantId,
      });
    }
    if (isTransference) {
      // tranferiu o atendimento
      await logService.createLogTicket({
        userId: userIdRequest,
        ticketId,
        chamadoId: null,
        queueId: null,
        type: "transfered",
        tenantId: ticket.tenantId,
      });
      // recebeu o atendimento tansferido
      if (userId) {
        await logService.createLogTicket({
          userId,
          ticketId,
          chamadoId: null,
          queueId: null,
          type: "receivedTransfer",
          tenantId: ticket.tenantId,
        });
      }
    }
    if (isTransference) {
      await this.ticketRepository.update(ticket.id, { isTransference: true });
    }
    if (toPending) {
      socketEmit({
        tenantId,
        type: "notification:new",
        payload: ticket,
      });
    }
    socketEmit({
      tenantId,
      type: "ticket:update",
      payload: ticket,
    });
    return ticket;
  }
  // TODO codigo incompleto
  async VerifyStepsChatFlowTicket(
    message: WbotMessage | any,
    ticket: Ticket,
    isNew = false
  ) {
    if (
      !ticket.chatFlowId ||
      ticket.status !== "pending" ||
      message.fromMe ||
      ticket.isGroup
    ) {
      return false;
    }

    const chatFlow = await getFastifyApp().services.chatFlowService.findOne(
      ticket.chatFlowId
    );

    if (!chatFlow) {
      logger.warn(`ChatFlow não encontrado para o ticket ${ticket.id}`);
      return false;
    }
    const step = (chatFlow.flow! as any).nodeList.find(
      (node: { id: any }) => node.id === ticket.stepChatFlow
    ) as Step;

    if (!step) {
      logger.warn(
        `Passo do ChatFlow não encontrado para o ticket ${ticket.id} e stepChatFlow ${ticket.stepChatFlow}`
      );
      return false;
    }
    const flowConfig = (chatFlow.flow as any).nodeList.find(
      (node: { type: string }) => node.type === "configurations"
    ) as FlowConfig;

    const stepCondition = findStepCondition(step.data.conditions, message);

    // TODO Verificar se a mensagem é para fechar o ticket automaticamente
    // if (
    //   !isNew
    //   //(await isAnswerCloseTicket(flowConfig, ticket, getMessageBody(msg)))
    // ) {
    //   return false;
    // }

    if (stepCondition && !isNew) {
      if (await isRetriesLimit(ticket, flowConfig)) return false;

      await handleNextStep(ticket, chatFlow, stepCondition, message);
      await handleQueueAssignment(ticket, flowConfig, stepCondition);
      await handleUserAssignment(ticket, stepCondition);
      await handleCloseTicket(ticket, stepCondition);
      const ticketSocket =
        await getFastifyApp().services.ticketService.findTicketId(ticket.id);
      socketEmit({
        tenantId: ticketSocket!.tenantId,
        type: "ticket:update",
        payload: ticketSocket!,
      });
      // Enviar mensagem de boas-vindas se o ticket foi atribuído a fila/usuário
      if (
        stepCondition.action === ChatFlowAction.QueueDefine ||
        stepCondition.action === ChatFlowAction.UserDefine
      ) {
        const isBusinessHours = await VerifyBusinessHoursFlow(ticketSocket!);

        if (isBusinessHours) {
          await sendWelcomeMessage(ticketSocket!, flowConfig);
        }
      }
      // Se chegamos aqui, a resposta foi válida e o fluxo avançou.
      logger.info(
        `[whatsapp] Ticket ${ticket.id}: Resposta válida encontrada. Fluxo avançou.`
      );
      return true; // <--- RETORNO DE SUCESSO
    } else {
      if (!isNew) {
        if (await isRetriesLimit(ticket, flowConfig)) return false;
        const defaultMessage =
          "Desculpe! Não entendi sua resposta. Vamos tentar novamente! Escolha uma opção válida.";
        const messageBody =
          flowConfig.data.notOptionsSelectMessage?.message || defaultMessage;
        await sendBotMessage(ticket.tenantId, ticket, messageBody);
      }
      for (const interaction of step.data.interactions) {
        await BuildSendMessageService({
          msg: interaction,
          tenantId: ticket.tenantId,
          ticket,
        });
        if (step.type === "boasVindas") {
          try {
            logger.info(
              `Tentando enviar mensagem de boas-vindas para o ticket ${ticket.id}`
            );
            if (ticket.channel === "telegram") {
              await sendBotMessage(
                ticket.tenantId,
                ticket,
                ListMessageWelcomeTelegram()
              );
            } else {
              await SendWhatsMessageList({
                ticket,
                options: ListMessageWelcome(),
              });
            }

            logger.info(
              `Mensagem de boas-vindas enviada com sucesso para o ticket ${ticket.id} e estado atualizado.`
            );
          } catch (error) {
            logger.error(
              `Falha ao enviar mensagem de boas-vindas ou atualizar ticket ${ticket.id}:`,
              error
            );
          }
        }
        return false;
      }
    }
  }

  async updateTicketAndEmit(
    ticket: Ticket,
    data: Partial<any>,
    socketType: "ticket:update" | "ticket:update_chatflow" = "ticket:update"
  ): Promise<void> {
    await this.ticketRepository.update(ticket.id, data);
    socketEmit({
      tenantId: ticket.tenantId,
      type: socketType,
      payload: ticket,
    });
  }
}

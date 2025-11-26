import { Prisma, Ticket } from "@prisma/client";
import { AppError } from "../../errors/errors.helper";
import { SettingsService } from "../Settings/settings.service";
import { TicketRepository } from "./tickets.repository";
import { TicketWithMessages } from "./tickets.type";
import { getFastifyApp } from "../../api";
import { getIO } from "../../lib/socket";
import socketEmit from "../../api/helpers/socketEmit";
import { connect } from "http2";

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
    const message = ticket.messages.map((message) => {
      return {
        ...message,
        mediaUrl: this.getFullMediaUrl(message.mediaUrl),
      };
    });
    return {
      ...ticket,
      messages: message,
    };
  }
  async findTicketBy(
    where: Prisma.TicketWhereInput
  ): Promise<TicketWithMessages | null> {
    const ticket = await this.ticketRepository.findOne(where);
    if (!ticket) return null;
    const message = ticket.messages.map((message) => {
      return {
        ...message,
        mediaUrl: this.getFullMediaUrl(message.mediaUrl),
      };
    });
    return {
      ...ticket,
      messages: message,
    };
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

    const ticketsRetorno = tickets.map((ticket: { messages: any[] }) => {
      const message = ticket.messages.map((message) => {
        return {
          ...message,
          mediaUrl: this.getFullMediaUrl(message.mediaUrl),
        };
      });
      return {
        ...ticket,
        messages: message,
      };
    });

    return {
      tickets: ticketsRetorno || [],
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
    const messageTransformaded = tickdtUpdated.messages.map((message) => {
      return {
        ...message,
        mediaUrl: this.getFullMediaUrl(message.mediaUrl),
      };
    });
    return {
      ...tickdtUpdated,
      messages: messageTransformaded,
    };
  }
  // Função para construir a URL completa da mídia
  private getFullMediaUrl(filename: string | null): string | null {
    if (!filename) {
      return null;
    }

    const { MEDIA_URL, NODE_ENV, PROXY_PORT } = process.env;

    // Garante que a URL base existe
    if (!MEDIA_URL) {
      console.error("Variável de ambiente BACKEND_URL não definida!");
      return null; // Ou lança um erro
    }

    // Lógica idêntica à do seu getter no Sequelize
    if (NODE_ENV === "development" && PROXY_PORT) {
      return `${MEDIA_URL}:${PROXY_PORT}/public/${filename}`;
    } else {
      return `${MEDIA_URL}/public/${filename}`;
    }
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
    const oldUserId = ticket.userId;
    const statusData = status === "close" ? "closed" : status;
    const queueConnect = queueId ? { connect: { id: queueId } } : undefined;
    const data: any = {
      status: statusData,
      queue: queueConnect,
      user: {
        connect: { id: ticket.isGroup ? null : userId },
      },
    };

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
      data.autoReplyId = null;
      data.chatFlowId = null;
      data.stepAutoReplyId = null;
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
}

import { Prisma, Ticket } from "@prisma/client";
import { ChatFlowRepository } from "./chatFlow.repository";
import { AppError } from "../../errors/errors.helper";
import { getFastifyApp } from "../../api";
import { REDIS_KEYS, setCache } from "../../ultis/redisCache";

import { flows } from "./chatFlow.utils";

export class ChatFlowService {
  private chatFlowRepository: ChatFlowRepository;

  constructor() {
    this.chatFlowRepository = new ChatFlowRepository();
  }
  async findOne(id: number) {
    return await this.chatFlowRepository.findOne(id);
  }
  async listaAllChatFlow(where?: Prisma.ChatFlowWhereInput) {
    return await this.chatFlowRepository.findAll(where);
  }
  async createChatFlow(data: any) {
    const { tenantId, userId, ...restData } = data;
    const dataForPrisma: any = {
      ...restData,
    };
    dataForPrisma.tenant = {
      connect: { id: tenantId },
    };
    dataForPrisma.user = {
      connect: { id: userId },
    };
    const chatFlow = await this.chatFlowRepository.create(dataForPrisma);
    return chatFlow;
  }

  async updateChatFlow(id: number, data: Prisma.ChatFlowUpdateInput) {
    return await this.chatFlowRepository.update(id, data);
  }
  async exportChatFlow(id: number) {
    const chatFlow = await this.chatFlowRepository.findOne(id);
    if (!chatFlow) {
      throw new AppError("ERR_NO_CHAT_FLOW_FOUND", 404);
    }
    const jsonContent = JSON.stringify(chatFlow, null, 2);
    return jsonContent;
  }
  async importChatFlow(chatFlowId: number, chatFlowData: any) {
    let chatFlow = await this.chatFlowRepository.findOne(chatFlowId);
    if (!chatFlow) {
      throw new AppError("ERR_NO_CHAT_FLOW_FOUND", 404);
    }

    chatFlow = await this.chatFlowRepository.update(chatFlow.id, {
      flow: chatFlowData,
    });

    return chatFlow;
  }

  async CheckChatBotFlowWelcome(ticket: any): Promise<Ticket> {
    if (ticket.userId || ticket.isGroup) {
      throw new AppError("ERR_TICKE_USER_OR_GROUP", 403);
    }
    const setting =
      await getFastifyApp().services.settingsService.findBySettings({
        key: "botTicketActive",
      });
    const chatFlow = await this.chatFlowRepository.findBy(ticket.whatsappId!);

    if (!chatFlow) {
      throw new AppError("ERR_NO_FOUND_CHAT_FLOW", 403);
    }

    const chatFlowId = chatFlow.id || setting?.value;
    if (!chatFlowId) {
      throw new AppError("ERR_NO_FOUND_CHAT_FLOW", 403);
    }

    if (
      ticket.contact.number.indexOf(chatFlow?.celularTeste?.substring(1)) === -1
    ) {
      throw new AppError("ERR_IS_CELULAR_TESTING", 403);
    }

    const lineFlow = (chatFlow.flow! as any).lineList.find(
      (line: any) => line.source === "start"
    );

    const ticketUpdate =
      await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
        chatFlow: {
          connect: { id: chatFlow.id },
        },
        stepChatFlow: lineFlow.target,
        lastInteractionBot: new Date(),
      });

    getFastifyApp().services.logTicketService.createLogTicket({
      chamadoId: null,
      queueId: null,
      userId: null,
      ticketId: ticket.id,
      tenantId: ticket.tenantId,
      type: "chatBot",
    });

    return ticketUpdate;
  }

  async actionsFlow(message: any, ticket: Ticket) {
    const action = message.data.webhook?.acao;
    await setCache(REDIS_KEYS.previousStepId(ticket.id), ticket.stepChatFlow!);
    const options = await flows(action, ticket, message);
    return options;
  }
}

import { Prisma } from "@prisma/client";
import { ChatFlowRepository } from "./chatFlow.repository";
import { AppError } from "../../errors/errors.helper";
import { compareSync } from "bcryptjs";

export class ChatFlowService {
  private chatFlowRepository: ChatFlowRepository;

  constructor() {
    this.chatFlowRepository = new ChatFlowRepository();
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
}

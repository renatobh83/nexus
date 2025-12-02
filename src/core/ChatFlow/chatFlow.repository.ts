import { ChatFlow, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class ChatFlowRepository {
  findOne(where?: Prisma.ChatFlowWhereInput): Promise<ChatFlow | null> {
    return prisma.chatFlow.findFirst({ where });
  }
  async findBy(id: number) {
    return prisma.chatFlow.findFirst({
      where: {
        whatsappDefaults: {
          some: {
            id: id,
          },
        },
      },
    });
  }
  async findAll(where?: Prisma.ChatFlowWhereInput): Promise<ChatFlow[]> {
    return await prisma.chatFlow.findMany({ where });
  }
  async create(data: Prisma.ChatFlowCreateInput): Promise<ChatFlow> {
    return await prisma.chatFlow.create({ data });
  }
  async update(
    id: number,
    data: Prisma.ChatFlowUpdateInput
  ): Promise<ChatFlow> {
    return await prisma.chatFlow.update({
      where: {
        id: id,
      },
      data,
    });
  }
}

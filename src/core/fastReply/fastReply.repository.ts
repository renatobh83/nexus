import { prisma } from "../../lib/prisma";
import { FastReply, Prisma } from "@prisma/client";

export class FastReplyRepository {
  findByWhere(where: Prisma.FastReplyWhereInput): Promise<FastReply | null> {
    return prisma.fastReply.findFirst({ where });
  }
  findAll(where?: Prisma.FastReplyWhereInput): Promise<FastReply[]> {
    return prisma.fastReply.findMany({ where });
  }
  create(data: any): Promise<FastReply> {
    const { tenant, user, ...restDto } = data;
    const dataForPrisma = {
      ...restDto,
    };

    dataForPrisma.tenant = {
      connect: { id: tenant },
    };
    dataForPrisma.user = {
      connect: { id: user },
    };

    return prisma.fastReply.create({ data: dataForPrisma });
  }
  update(id: number, data: Prisma.FastReplyUpdateInput): Promise<FastReply> {
    return prisma.fastReply.update({ where: { id: id }, data });
  }
  async delete(id: number): Promise<void> {
    await prisma.fastReply.delete({ where: { id } });
  }
}

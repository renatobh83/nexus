import { Prisma, Queue } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class QueueRepository {
  findById(where: Prisma.QueueWhereInput): Promise<Queue | null> {
    return prisma.queue.findFirst({ where });
  }
  findAll(): Promise<Queue[]> {
    return prisma.queue.findMany();
  }
  async create(data: Prisma.QueueCreateInput): Promise<Queue> {
    return await prisma.queue.create({ data });
  }
  async update(id: number, data: Prisma.QueueUpdateInput): Promise<Queue> {
    return await prisma.queue.update({
      where: {
        id,
      },
      data,
    });
  }
  async delete(id: number): Promise<void> {
    await prisma.queue.delete({ where: { id } });
  }
}

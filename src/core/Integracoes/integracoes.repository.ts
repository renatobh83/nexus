import { Integracoes, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class IntegracoesRepository {
  async findOne(
    where: Prisma.IntegracoesWhereInput
  ): Promise<Integracoes | null> {
    return await prisma.integracoes.findFirst({ where });
  }
  async findAll(): Promise<Integracoes[]> {
    return await prisma.integracoes.findMany();
  }
  async create(data: Prisma.IntegracoesCreateInput): Promise<Integracoes> {
    return await prisma.integracoes.create({ data: data });
  }
  async update(
    id: number,
    data: Prisma.IntegracoesUpdateInput
  ): Promise<Integracoes> {
    return await prisma.integracoes.update({
      where: {
        id: id,
      },
      data,
    });
  }
  async delete(id: number): Promise<void> {
    await prisma.integracoes.delete({ where: { id: id } });
  }
}

import { IGConfirmacao, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class IGenesisRepository {
  async findOne(
    where?: Prisma.IGConfirmacaoWhereInput
  ): Promise<IGConfirmacao | null> {
    return await prisma.iGConfirmacao.findFirst({ where });
  }
  async findIntegracao(id: string) {
    return await prisma.apiConfig.findFirst({ where: { id: id } });
  }
  async findChannel(sessionId: any) {
    return await prisma.whatsapp.findFirst({
      where: {
        id: sessionId,
        status: "CONNECTED",
      },
    });
  }
  //   findAll(): Promise<MinhaEntidade[]>;
  create(data: Prisma.IGConfirmacaoCreateInput): Promise<IGConfirmacao> {
    return prisma.iGConfirmacao.create({
      data: data,
    });
  }
  update(
    id: string,
    data: Prisma.IGConfirmacaoUpdateInput
  ): Promise<IGConfirmacao> {
    return prisma.iGConfirmacao.update({ where: { id: id }, data });
  }
  //   delete(id: string): Promise<void>;
}

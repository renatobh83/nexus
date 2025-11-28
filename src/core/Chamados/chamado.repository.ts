import { Chamado, Prisma, Ticket } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../errors/errors.helper";
import { CHAMADO_INCLUDE_CONFIG, CreateDTOChamado } from "./chamado.types";
import { transformChamados } from "./chamado.utils";

export class ChamadoRepository {
  private async numberChamado(ticketId: number | undefined): Promise<number> {
    let numeroChamado: number;
    let lastChamado: Chamado | null;
    if (ticketId) {
      lastChamado = await prisma.chamado.findFirst({
        where: {
          id: ticketId,
        },
        orderBy: {
          id: "desc",
        },
      });
      if (!lastChamado) {
        numeroChamado = ticketId;
      } else {
        numeroChamado = lastChamado.id + 1;
      }
    } else {
      lastChamado = await prisma.chamado.findFirst({ orderBy: { id: "desc" } });
      const ultimoNumeroRegister = lastChamado?.id || 0;
      numeroChamado = ultimoNumeroRegister + 1;
    }
    return numeroChamado;
  }
  async create(
    chamado: CreateDTOChamado,
    ticket: Ticket | undefined
  ): Promise<any> {
    const { contatoId, ...restChamado } = chamado;
    const nextNumber = await this.numberChamado(ticket?.id);

    const empresa = await prisma.empresa.findFirst({
      where: {
        id: chamado.empresaId,
        active: true,
      },
    });

    if (!empresa) {
      throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
    }
    const dataCreateChamado = {
      ...restChamado,
      id: nextNumber,
    };

    const chamadoNew = await prisma.chamado.create({
      data: dataCreateChamado,
    });
    const contatoPromises = contatoId.map((contato) =>
      prisma.chamadoContatos.create({
        data: {
          chamadoId: chamadoNew.id,
          contactId: contato,
        },
      })
    );
    await Promise.all(contatoPromises);
    // Busca o chamado completo
    const chamadoCompleto = await prisma.chamado.findUnique({
      where: { id: chamadoNew.id },
      include: CHAMADO_INCLUDE_CONFIG,
    });
    if (ticket) {
      await prisma.ticket.update({
        where: {
          id: ticket.id,
        },
        data: {
          chamadoId: chamadoNew.id,
        },
      });
    }
    return transformChamados(chamadoCompleto);
  }
  async findById(id: number): Promise<Chamado | null> {
    const chamado = await prisma.chamado.findFirst({
      where: { id: id },
      include: CHAMADO_INCLUDE_CONFIG,
    });
    if (!chamado) {
      return null;
    }

    return transformChamados(chamado);
  }
  async findOneByWhere(
    where: Prisma.ChamadoWhereInput
  ): Promise<Chamado | null> {
    const chamado = await prisma.chamado.findFirst({
      where,
      include: CHAMADO_INCLUDE_CONFIG,
    });
    if (!chamado) {
      return null;
    }

    return transformChamados(chamado);
  }
  async updateContatoChamado(contatos: number[], chamadoId: number) {
    // O Prisma $transaction garante que todas as operações abaixo sejam atômicas.
    await prisma.$transaction(async (tx) => {
      // Passo 1: Buscar os contatos atualmente associados ao chamado.
      // Usamos 'tx' em vez de 'prisma' para que esta leitura faça parte da transação.
      const contatosAtuais = await tx.chamadoContatos.findMany({
        where: { chamadoId: chamadoId },
        select: { contactId: true }, // Só precisamos dos IDs
      });

      // Extrai apenas os IDs para facilitar a comparação.
      const idsAtuais = contatosAtuais.map((c) => c.contactId);

      // Passo 2: Calcular as diferenças.
      // Contatos a serem adicionados: estão na nova lista, mas não na atual.
      const idsParaAdicionar = contatos.filter((id) => !idsAtuais.includes(id));

      // Contatos a serem removidos: estão na lista atual, mas não na nova.
      const idsParaRemover = idsAtuais.filter((id) => !contatos.includes(id));

      // Passo 3: Executar as operações de escrita (apenas se houver algo a fazer).

      // Deletar as associações que não existem mais.
      if (idsParaRemover.length > 0) {
        await tx.chamadoContatos.deleteMany({
          where: {
            chamadoId: chamadoId,
            contactId: {
              in: idsParaRemover, // Deleta todos os registros que correspondem
            },
          },
        });
      }

      // Criar as novas associações.
      if (idsParaAdicionar.length > 0) {
        await tx.chamadoContatos.createMany({
          data: idsParaAdicionar.map((contactId) => ({
            chamadoId: chamadoId,
            contactId:
              typeof contactId === "string" ? parseInt(contactId) : contactId,
          })),
          skipDuplicates: true, // Boa prática, embora nossa lógica já evite isso.
        });
      }
    });
    const chamadoCompleto = await prisma.chamado.findUnique({
      where: { id: chamadoId },
      include: CHAMADO_INCLUDE_CONFIG,
    });
    return transformChamados(chamadoCompleto);
  }
  async findAll(where?: Prisma.ChamadoWhereInput): Promise<void> {
    const chamados = await prisma.chamado.findMany({
      where,
      include: CHAMADO_INCLUDE_CONFIG,
    });

    return transformChamados(chamados);
  }
  async createPauseHistoryChamado(chamadoId: number) {
    await prisma.pauseHistory.create({
      data: {
        startTime: new Date(),
        chamadoId: chamadoId,
      },
    });
  }

  async updatePauseHistory(
    chamadoId: number,
    data: Prisma.PauseHistoryUpdateInput
  ) {
    const lastPause = await prisma.pauseHistory.findFirst({
      where: {
        chamadoId: chamadoId,
        endTime: null,
      },
      orderBy: {
        startTime: "desc",
      },
    });
    const historicoAtualizado = await prisma.pauseHistory.update({
      where: {
        id: lastPause?.id,
      },
      data: data,
    });
    return historicoAtualizado;
  }
  async update(id: number, data: Prisma.ChamadoUpdateInput): Promise<Chamado> {
    const chamado = await prisma.chamado.update({
      where: {
        id: id,
      },
      data,
      include: CHAMADO_INCLUDE_CONFIG,
    });
    return transformChamados(chamado);
  }
  //   delete(id: string): Promise<void>;
}

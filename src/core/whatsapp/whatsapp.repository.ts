import { Prisma, Whatsapp } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class WhatsappRepository {
  /**
   * Lista todos os canais no banco de dados
   * @returns retorna os canais cadastrados
   */
  async findMany(
    where?: Prisma.WhatsappWhereInput,
    include?: Prisma.WhatsappInclude
  ) {
    return prisma.whatsapp.findMany({ where, include });
  }

  /**
   * Cria uma nova conexão de WhatsApp no banco de dados.
   * @param data - Os dados já formatados no tipo Prisma.WhatsappCreateInput.
   */
  async create(data: Prisma.WhatsappCreateInput) {
    // Agora sim, está correto. 'data' já está no formato que o Prisma entende.
    return prisma.whatsapp.create({
      data: data,
    });
  }
  async update(id: number, data: Prisma.WhatsappUpdateInput) {
    return prisma.whatsapp.update({
      where: { id },
      data,
    });
  }

  /**
   * Atualiza uma conexão de WhatsApp específica, garantindo que ela pertença ao tenant correto.
   * @param id - O ID da conexão a ser atualizada.
   * @param tenantId - O ID do tenant para o escopo de segurança.
   * @param data - Os dados a serem atualizados.
   * @returns O registro completo do WhatsApp após a atualização.
   */
  async updateScoped(
    id: string,
    tenantId: number,
    data: Prisma.WhatsappUpdateInput
  ) {
    return await prisma.whatsapp.update({
      where: {
        id: parseInt(id),
        tenantId: tenantId, // Garante que só podemos atualizar um registro do nosso próprio tenant.
      },
      data,
    });
  }

  async findFirst(
    where: Prisma.WhatsappWhereInput,
    include?: Prisma.WhatsappInclude
  ) {
    return prisma.whatsapp.findFirst({ where, include });
  }

  async deleteWhasapp(wppId: number) {
    return prisma.whatsapp.delete({
      where: {
        id: wppId,
      },
    });
  }

  /**
   * Busca todas as conexões de WhatsApp ativas e prontas para uso.
   *
   * Esta consulta otimizada seleciona apenas os canais que não estão em um
   * estado 'DISCONNECTED'. Para canais do tipo 'whatsapp', ela também exclui
   * aqueles que estão aguardando a leitura de um QR Code, focando apenas
   * nos canais efetivamente operacionais.
   *
   * A cláusula `select` é utilizada para buscar apenas os campos essenciais,
   * melhorando a performance da consulta.
   *
   * @returns {Promise<Partial<Whatsapp>[]>} Uma Promise que resolve para um array
   * de objetos parciais de WhatsApp, contendo apenas os campos selecionados.
   */
  async findActiveAndReady(): Promise<Partial<Whatsapp>[]> {
    return prisma.whatsapp.findMany({
      // A cláusula 'where' combina todas as condições de filtro.
      where: {
        // Condição 1: Deve estar ativo.
        isActive: true,

        // Condição 2: O status não pode ser 'DISCONNECTED'.
        status: {
          notIn: ["DISCONNECTED"],
        },

        // Condição 3: Lógica OR complexa.
        OR: [
          // Condição 3.A: O tipo é um dos canais que não dependem de QR Code.
          {
            type: {
              in: ["instagram", "telegram", "waba", "messenger"],
            },
          },
          // Condição 3.B: OU o tipo é 'whatsapp' E seu status está pronto.
          {
            type: "whatsapp",
            status: {
              notIn: ["DISCONNECTED", "qrcode"],
            },
          },
        ],
      },
      // Cláusula 'select' para retornar apenas os campos necessários.
      select: {
        id: true,
        type: true,
        status: true,
        tokenTelegram: true,
        tenantId: true,
        name: true,
      },
    });
  }
}

import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class WhatsappRepository {
  /**
   * Lista todos os canais no banco de dados
   * @returns retorna os canais cadastrados
   */
  async findAll() {
    return prisma.whatsapp.findMany({
      where: {
        isDeleted: false
      }
    });
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
  async updateScoped(id: number, tenantId: number, data: Prisma.WhatsappUpdateInput) {
    return prisma.whatsapp.update({
      where: {
        id: id,
        tenantId: tenantId, // Garante que só podemos atualizar um registro do nosso próprio tenant.
      },
      data,
    });
  }


  // Método para buscar o primeiro registro que corresponde aos critérios
  async findFirst(where: Prisma.WhatsappWhereInput) {
    return prisma.whatsapp.findFirst({ where });
  }

  async deleteWhasapp(wppId: number){
    return prisma.whatsapp.delete({
      where: {
        id: wppId
      }
    })
  }
}

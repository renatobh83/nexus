import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class WhatsappRepository {
  /**
   * Lista todos os canais no banco de dados
   * @returns retorna os canais cadastrados
   */
  async findAll() {
    return prisma.whatsapp.findMany();
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

  // Método para buscar o primeiro registro que corresponde aos critérios
  async findFirst(where: Prisma.WhatsappWhereInput) {
    return prisma.whatsapp.findFirst({ where });
  }
}

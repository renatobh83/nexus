import { prisma } from "../../lib/prisma";

export class UsersRepository {
  /**
   * Encontra um usuario pelo seu ID.
   * @param userId - O ID do usuario.
   * @returns O usuario encontrado ou null.
   */
  async findById(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }
  /**
   * lista todos os usuarios
   *
   * @returns lista de usuarios ou null.
   */
  async findAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        profile: true,
        ativo: true,
        isOnline: true,
        tenantId: true,
        queues: true,
      },
    });
  }
async createOrUpdateUser(userData: any) { // Use um tipo/interface apropriado aqui
    const { id, queues, ...restOfUserData } = userData;

    const dataForUpdate = {
        ...restOfUserData,
        // Lógica para lidar com filas em uma atualização
        queues: queues ? { deleteMany: {}, create: queues.map(id => ({ queueId: id })) } : undefined,
    };

    const dataForCreate = {
        ...restOfUserData,
        // Lógica para lidar com filas em uma criação
        queues: queues ? { create: queues.map(id => ({ queueId: id })) } : undefined,
    };

    return prisma.user.upsert({
        // Se 'id' existir, use-o para encontrar o usuário.
        // Se não, use um valor que garante que não encontrará nada (forçando a criação).
        where: { id: id || -1 },
        create: dataForCreate,
        update: dataForUpdate,
    });
}
}

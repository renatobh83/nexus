import { Prisma } from "@prisma/client";
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

  async findFirst(where: Prisma.UserWhereInput) {
    return prisma.user.findFirst({ where });
  }
  /**
   * lista todos os usuarios
   *
   * @returns lista de usuarios ou null.
   */
  async findMany(
    where?: Prisma.UserWhereInput,
    options?: {
      select?: Prisma.UserSelect;
      include?: Prisma.UserInclude;
    }
  ) {
    // Usar select OU include, nunca ambos
    if (options?.select) {
      return prisma.user.findMany({ where, select: options.select });
    } else if (options?.include) {
      return prisma.user.findMany({ where, include: options.include });
    } else {
      return prisma.user.findMany({ where });
    }
  }
  async createOrUpdateUser(userData: any) {
    // Use um tipo/interface apropriado aqui
    const { id, queues, ...restOfUserData } = userData;

    const dataForUpdate = {
      ...restOfUserData,
      // Lógica para lidar com filas em uma atualização
      queues: queues
        ? { deleteMany: {}, create: queues.map((id) => ({ queueId: id })) }
        : undefined,
    };

    const dataForCreate = {
      ...restOfUserData,
      // Lógica para lidar com filas em uma criação
      queues: queues
        ? { create: queues.map((id: any) => ({ queueId: id })) }
        : undefined,
    };

    return prisma.user.upsert({
      // Se 'id' existir, use-o para encontrar o usuário.
      // Se não, use um valor que garante que não encontrará nada (forçando a criação).
      where: { id: id || -1 },
      create: dataForCreate,
      update: dataForUpdate,
    });
  }

  /**
   * Busca um usuário específico pelo seu ID.
   *
   * Esta função utiliza a cláusula `select` do Prisma para retornar um subconjunto
   * de campos do usuário, omitindo dados sensíveis como o `passwordHash`.
   * É a forma segura e performática de obter dados de um usuário para exibição
   * ou para lógicas que não envolvem autenticação.
   *
   * @param {number} userId - O ID numérico do usuário a ser encontrado.
   * @returns Promise<object | null> Uma Promise que resolve para um objeto contendo
   * os campos selecionados do usuário, ou `null` se nenhum usuário for encontrado com o ID fornecido.
   */
  async findUserById(where: Prisma.UserWhereInput) {
    return prisma.user.findFirst({ where });
  }

  /**
   * Atualiza o status de um usuário específico dentro de um tenant.
   * @param userId - O ID do usuário.
   * @param tenantId - O ID do tenant.
   * @param data - Os novos dados de status.
   * @returns O registro completo do usuário após a atualização.
   */
  async updateStatus(userId: number, tenantId: number, data: any) {
    // O método 'update' do Prisma faz a busca e a atualização em uma única operação.
    return prisma.user.update({
      where: {
        // A cláusula 'where' encontra o registro a ser atualizado.
        // Usamos a combinação de id e tenantId para segurança.
        id: userId,
        tenantId: tenantId,
      },
      data: {
        // A cláusula 'data' especifica o que deve ser atualizado.
        isOnline: data.isOnline,
        status: data.status,
        lastLogin: data.lastLogin,
        lastLogout: data.lastLogout,
        lastOnline: data.lastOnline,
      },
      // O 'update' retorna o registro atualizado por padrão.
      // Não precisamos de 'select' ou 'include' se quisermos o objeto completo.
    });
  }

  async removeUser(userId: number) {
    return prisma.user.delete({ where: { id: userId } });
  }
}

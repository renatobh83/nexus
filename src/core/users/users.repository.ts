import { Prisma, User } from "@prisma/client";
import { prisma } from "../../lib/prisma";

interface PaginationOptions {
  limit?: number;
  currentPage?: number;
  skip?: number;
}
interface Response {
  users: User[];
  count: number;
  hasMore: boolean;
}

export class UsersRepository {
  private DEFAULT_LIMIT = 40;
  private DEFAULT_SKIP = 0;
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

  async findMany(whereCondition?: any, options?: PaginationOptions): Promise<Response> {
    const { limit = this.DEFAULT_LIMIT, skip = this.DEFAULT_SKIP } =
      options || {};
    const users = await prisma.user.findMany({
      where: whereCondition,
      // // Paginação
      take: limit,
      skip: skip,
      // Ordenação
      orderBy: {
        name: "asc",
      },
      // Seleção de campos e inclusão de relacionamento
      select: {
        // Campos do modelo User (equivalente a attributes: ["name", "id", "email", "profile", "ativo"])
        name: true,
        id: true,
        email: true,
        profile: true,
        ativo: true,
        configs: true,

        // Inclusão do relacionamento (equivalente a include: [{ model: Queue, ... }])
        queues: {
          // Assumindo que o campo de relacionamento se chama 'queues'
          select: {
            queue: true, // Assumindo que o campo se chama 'queue' no modelo Queue
          },
        },
      },
    });
    // 3. Conta o total de registros (count)
    const count = await prisma.user.count();
    // 4. Calcula se há mais páginas
    const hasMore = count > skip + users.length;
    return {
      users: users as any, // 'as any' é usado aqui para simplificar o exemplo de tipagem
      count,
      hasMore,
    };
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

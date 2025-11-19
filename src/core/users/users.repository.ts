import { Prisma, User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { transformUserQueues } from "../../ultis/prismaQueue";

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

  async findMany(options?: PaginationOptions): Promise<Response> {
    const DEFAULT_LIMIT = 40;
    const DEFAULT_SKIP = 0;
    const { limit = DEFAULT_LIMIT, skip = DEFAULT_SKIP } = options || {};

    const users = await prisma.user.findMany({
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
          include: {
            queue: true,
          },
        },
      },
    });
    // 3. Conta o total de registros (count)
    const count = await prisma.user.count();
    // 4. Calcula se há mais páginas
    const hasMore = count > skip + users.length;
    return {
      users: users.map(transformUserQueues) as any, // 'as any' é usado aqui para simplificar o exemplo de tipagem
      count,
      hasMore,
    };
  }
  async createOrUpdateUser(userData: any) {
    const { id, queues, password, tenantId, ...restUserData } = userData; // 1. Desestruture APENAS os campos conhecidos.

    const dataForPrisma = {
      ...restUserData,
    };

    // // 3. Adicione os campos permitidos um por um, se eles existirem.

    if (password) dataForPrisma.passwordHash = password; // Adicione o hash da senha se uma nova foi fornecida

    // // Adicione a lógica do tenant (apenas para criação, geralmente não se muda o tenant)
    if (!id && tenantId) {
      dataForPrisma.tenant = {
        connect: { id: tenantId },
      };
    }

    // // 4. Lógica para as filas (queues) - esta parte já estava correta
    if (queues && Array.isArray(queues)) {
      const queueIds = queues.map((q: { id: number }) => q.id);
      if (id) {
        const deleteOperation = prisma.usersQueues.deleteMany({
          where: {
            userId: id,
          },
        });
        const createOperations = queueIds.map((queueId) =>
          prisma.usersQueues.create({
            data: {
              userId: id, // Conecta ao usuário
              queueId: queueId, // Conecta à fila
            },
          })
        );
        await prisma.$transaction([deleteOperation, ...createOperations]);
      } else {
        // Lógica de Create
        dataForPrisma.queues = {
          create: queueIds.map((queueId: number) => ({
            queue: { connect: { id: queueId } },
          })),
        };
      }
    }

    // // 5. Execute a operação
    if (id) {
      // Para update, não precisamos do tenant, então podemos removê-lo se foi adicionado
      const user = await prisma.user.update({
        where: { id: id },
        data: dataForPrisma,
        include: {
          queues: {
            include: {
              queue: true,
            },
          },
        },
      });
      return transformUserQueues(user);
    } else {
      const user = await prisma.user.create({
        data: dataForPrisma,
        include: {
          queues: {
            include: {
              queue: true,
            },
          },
        },
      });
      return transformUserQueues(user);
    }
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

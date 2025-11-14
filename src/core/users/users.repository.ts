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
  /**
   *  Cria um usuario no banco de dados.
   * @param data - Os dados para a criação do usuario.
   * @param email - Oe mail do usuario.
   * @param password - A senha do usuario.
   * @param name - O nome do usuario.
   * @param profile - O grupo do usuario.
   * @returns O usuario create ou null.
   */
  async createUser(userData: CreateUserDTO) {
    const { queues, ...restOfUserData } = userData;
    // 2. Transforma o array de IDs de filas (se existir) para o formato do Prisma.
    const queuesToConnect = queues?.map((id) => ({
      queueId: id,
    }));
    // 3. Monta o objeto 'data' final no formato que o Prisma espera.
    const userToCreate = {
      ...restOfUserData,
      queues: queuesToConnect ? { create: queuesToConnect } : undefined,
    };
    // 4. Chama o Prisma com o objeto de dados corretamente formatado.
    return prisma.user.create({
      data: userToCreate,
    });
  }
}

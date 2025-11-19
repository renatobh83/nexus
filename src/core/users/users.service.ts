import { hash } from "bcryptjs";
import { UsersRepository } from "./users.repository";
import { AppError } from "../../errors/errors.helper";
import { Prisma, User } from "@prisma/client";

export class UserService {
  private userRepository: UsersRepository;

  constructor() {
    this.userRepository = new UsersRepository();
  }
  /**
   * Orquestra a busca por todos os usuários.
   * Em um cenário real, poderia incluir lógica de paginação, filtros, etc.
   * @returns Uma Promise que resolve para a lista de todos os usuários.
   */
  async findAllUsers(optionsFind?: { pageSize: string; pageNumber: string }) {
    const DEFAULT_PAGE_SIZE = "40";
    const DEFAULT_PAGE_NUMBER = "1";
    const { pageSize = DEFAULT_PAGE_SIZE, pageNumber = DEFAULT_PAGE_NUMBER } =
      optionsFind || {};

    const limit = parseInt(pageSize, 10) || 40;
    const currentPage = parseInt(pageNumber, 10) || 1;
    const skip = limit * (currentPage - 1);

    const options = {
      limit,
      currentPage,
      skip,
    };
    const users = await this.userRepository.findMany(options);
    return users;
  }

  /**
   * Cria um novo usuário ou atualiza um existente.
   * @param userData - Os dados do usuário. Se um 'id' for fornecido, tentará atualizar.
   *                   Caso contrário, criará um novo usuário.
   * @returns O usuário criado ou atualizado.
   */
  async saveUser(userData: SaveUserDTO) {
    // Prepara os dados base do usuário, excluindo o ID por enquanto.
    const userDataPayload: any = {
      // Usar 'any' aqui é um atalho, mas podemos tipar melhor
      id: "id" in userData ? userData.id : undefined,
      name: userData.name,
      email: userData.email,
      tenantId: userData.tenantId,
      profile: userData.profile,
      queues: userData.queues,
    };

    // Adicione a senha apenas se ela foi fornecida
    if (userData.password) {
      userDataPayload.password = await hash(userData.password, 8);
    }

    const user = await this.userRepository.createOrUpdateUser(userDataPayload);

    return user;
  }

  async findUserById(id: string) {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return null;
    }
    const where: Prisma.UserWhereInput = { id: userId };
    const user = await this.userRepository.findUserById(where);

    return user;
  }
  /**
   * Atualiza o status de online e a situação de um usuário.
   * @param userId - O ID do usuário a ser atualizado.
   * @param tenantId - O ID do tenant para garantir o escopo correto.
   * @param dto - Os novos dados de status.
   * @returns O objeto do usuário completo e atualizado.
   */
  async updateUserStatus(
    userId: number,
    tenantId: number,
    dto: any
  ): Promise<User> {
    try {
      // O repositório faz tudo em uma única chamada!
      const updatedUser = await this.userRepository.updateStatus(
        userId,
        tenantId,
        dto
      );
      return updatedUser;
    } catch (error) {
      // O Prisma lança um erro específico (P2025) se o registro a ser atualizado não for encontrado.
      // Podemos capturar esse erro e transformá-lo no nosso AppError.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new AppError("ERR_NO_USER_FOUND", 404);
      }
      // Se for outro erro, apenas o relançamos.
      throw error;
    }
  }

  async removeUser(userId: number) {
    const deleted = await this.userRepository.removeUser(userId);
    return deleted;
  }
}

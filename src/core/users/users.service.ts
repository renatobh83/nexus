import { hash } from "bcryptjs";
import { UsersRepository } from "./users.repository";
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
  async findAllUsers() {
    const users = await this.userRepository.findAll();
    return users;
  }

  /**
   * Orquestra a criacao de um  usuário.
   * @returns Uma Promise que resolve a criacao de um usuario.
   */
  async createUser(userData: CreateUserDTO) {
    const hashedPassword = await hash(userData.password, 8);

    const user = await this.userRepository.createUser({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      tenantId: userData.tenantId,
      profile: userData.profile,
      queues: userData.queues,
    });
    return user;
  }
}

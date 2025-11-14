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
   * Cria um novo usuário ou atualiza um existente.
   * @param userData - Os dados do usuário. Se um 'id' for fornecido, tentará atualizar.
   *                   Caso contrário, criará um novo usuário.
   * @returns O usuário criado ou atualizado.
   */
  async saveUser(userData: SaveUserDTO ) {
    
    // Prepara os dados base do usuário, excluindo o ID por enquanto.
     const userDataPayload: any = { // Usar 'any' aqui é um atalho, mas podemos tipar melhor
        id: 'id' in userData ? userData.id : undefined,
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

    // 2. Chama o método unificado do repositório.
    // O repositório agora contém a lógica do 'upsert'.
    const user = await this.userRepository.createOrUpdateUser(userDataPayload);

    return user;
  }

}

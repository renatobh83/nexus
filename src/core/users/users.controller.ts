import { FastifyRequest, FastifyReply } from "fastify";
import { UserService } from "./users.service";
import { ERRORS } from "../../errors/errors.helper";

export class UsersController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Handler para a rota GET /users.
   * Chama o serviço para buscar todos os usuários e retorna a lista.
   * @param request - O objeto de requisição do Fastify.
   * @param reply - O objeto de resposta do Fastify.
   */
  findAll = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Chama o Service
      const users = await this.userService.findAllUsers();

      // 2. Envia a resposta de sucesso
      return reply.status(200).send(users);
    } catch (error) {
      // 3. Em caso de erro inesperado no serviço, loga e envia um erro 500
      request.log.error(error, "❌ Erro ao buscar usuários no UsersController");
      return reply
        .status(500)
        .send({ error: "Erro interno ao buscar usuários." });
    }
  };
  createUser = async (
    request: FastifyRequest<{
      Body: {
        email: string;
        password: string;
        name: string;
        profile: string;
        queues: number[];
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { tenantId, profile } = request.user as any;
      const payload = { ...request.body, tenantId };
      if (profile !== "admin") {
        return reply
          .code(ERRORS.unauthorizedAccess.statusCode)
          .send(ERRORS.unauthorizedAccess.message);
      }
      const user = await this.userService.createUser(payload);
      return reply.code(200).send(user);
    } catch (error) {
      return reply.code(404).send({ message: "Erro create user" });
    }
  };
  // Aqui você teria outros métodos do controller, como:
  // findById = async (request, reply) => { ... }
  // create = async (request, reply) => { ... }
}

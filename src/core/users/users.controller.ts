import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { ERRORS, handleServerError } from "../../errors/errors.helper";
import { getIO } from "../../lib/socket";

/**
 * Controller de Usuários (Plugin Fastify).
 * @param fastify - A instância do Fastify, que agora contém o 'userService' injetado.
 * @param opts - Opções do plugin.
 */
export async function userController(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    // O serviço é acessado via fastify.userService, que foi decorado em src/app.ts
    const userService = fastify.services.userService


    /**
     * Rota POST para criar ou atualizar um usuário (UPSERT).
     * O corpo da requisição deve ser um SaveUserDTO.
     * Se o corpo incluir um 'id', a operação será de atualização.
     */
    fastify.post('/', async (request: FastifyRequest<{
        Body: {
            email: string;
            password: string;
            name: string;
            profile: string;
            queues: number[];
        };
    }>,
        reply: FastifyReply) => {
        try {
            const { tenantId, profile } = request.user as any;
            const payload = { ...request.body, tenantId };
            if (profile !== "admin") {
                return reply
                    .code(ERRORS.unauthorizedAccess.statusCode)
                    .send(ERRORS.unauthorizedAccess.message);
            }
            const user = await userService.saveUser(payload);
            return reply.code(200).send(user);
        } catch (error) {
            return reply.code(404).send({ message: "Erro create user" });
        }
    });

    /**
     * Rota GET para buscar um usuário.
     * Exemplo de como usar o serviço injetado para outras operações.
     */
    fastify.get('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const userId = parseInt(id, 10);

        try {
            // Acessa o serviço injetado
            const user = await userService.findUserById(userId);

            if (!user) {
                return reply.code(404).send({ message: 'Usuário não encontrado.' });
            }

            return reply.send(user);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ message: 'Erro ao buscar o usuário.' });
        }
    });

    /**
      * Handler para a rota GET /users.
      * Chama o serviço para buscar todos os usuários e retorna a lista.
      * @param request - O objeto de requisição do Fastify.
      * @param reply - O objeto de resposta do Fastify.
      */
    fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {

        try {
            // 1. Chama o Service
            const users = await userService.findAllUsers();

            // 2. Envia a resposta de sucesso
            return reply.status(200).send(users);
        } catch (error) {
            // 3. Em caso de erro inesperado no serviço, loga e envia um erro 500
            request.log.error(error, "❌ Erro ao buscar usuários no UsersController");
            return reply
                .status(500)
                .send({ error: "Erro interno ao buscar usuários." });
        }
    })
    fastify.put("usersIsOnline/:id", async (request: FastifyRequest, reply: FastifyReply) => {
        const { tenantId, profile, id } = request.user as any;
        const { userId } = request.params as any;
        const payload = { userData: request.body, userId, tenantId };
        try {
            const userUpdate = await userService.updateUserStatus(userId, tenantId, payload)
            return reply.code(200).send(userUpdate);
        } catch (error) {
            return reply.code(404).send({ message: "Erro updateStatus user" });
        }
    })
    fastify.delete(":userId", async (
        request: FastifyRequest,
        reply: FastifyReply
    ) => {
        const { tenantId, profile, id } = request.user as any;
        const { userId } = request.params as any;
        try {
            if (profile !== "admin") {
                return reply
                    .code(ERRORS.unauthorizedAccess.statusCode)
                    .send(ERRORS.unauthorizedAccess.message);
            }

            const isDelete = await userService.removeUser(userId)
            const io = getIO();

            io.emit(`${tenantId}:user`, {
              action: "delete",
              userId,
            });
            return reply.code(200).send({ message: isDelete });
        } catch (error) {
            return handleServerError(reply, error);
        }
    })
}
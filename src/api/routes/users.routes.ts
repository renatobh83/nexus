import { FastifyInstance } from "fastify";
import { UsersController } from "../../core/users/users.controller";

/**
 * Plugin de rotas para o recurso de Usuários.
 * @param fastify - A instância do Fastify.
 */
export async function userRoutes(fastify: FastifyInstance) {
  // Instancia o controller que contém os handlers das rotas
  const usersController = new UsersController();

  // Define a rota GET /users e a conecta ao método 'findAll' do controller
  fastify.get("/users", usersController.findAll);
  fastify.post("/users", usersController.createOrUpdateUser);
  fastify.delete("/users/:userId", usersController.removeUser);
  
  fastify.get('/users/:id', usersController.findById);
  fastify.put("/users/usersIsOnline/:id", usersController.updateUserStatus)
}

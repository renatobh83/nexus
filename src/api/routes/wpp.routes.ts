import { FastifyInstance } from "fastify";
import { WppController } from "../../core/whatsapp/whatsapp.controller";

/**
 * Plugin de rotas para o recurso de Usuários.
 * @param fastify - A instância do Fastify.
 */
export async function wppRoutes(fastify: FastifyInstance) {
  const wppController = new WppController();

  fastify.get("/whatsapp", wppController.listaCanais);
}

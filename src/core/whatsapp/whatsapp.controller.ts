import { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginOptions } from "fastify";


/**
 * Controller de Whatsapp (Plugin Fastify).
 * @param fastify - A instância do Fastify, que agora contém o 'userService' injetado.
 * @param opts - Opções do plugin.
 */
export async function whatsappController(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    const whatsappService = fastify.services.whatsappService
    fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Chama o Service
      const wpp = await whatsappService.findAll();

      // 2. Envia a resposta de sucesso
      return reply.status(200).send(wpp);
    } catch (error) {
      // 3. Em caso de erro inesperado no serviço, loga e envia um erro 500
      request.log.error(error, "❌ Erro ao buscar wpp no WppController");
      return reply.status(500).send({ error: "Erro interno ao buscar wpp." });
    }
  })
}
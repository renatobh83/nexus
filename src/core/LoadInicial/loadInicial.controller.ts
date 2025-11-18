import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { handleServerError } from "../../errors/errors.helper";

export async function loadInicialController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const loadInicialService = fastify.services.loadInicialService;
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await loadInicialService.loadInicial(request.server);
      return reply.code(200).send(data);
    } catch (error) {
      return handleServerError(reply, error);
    }
  });
}

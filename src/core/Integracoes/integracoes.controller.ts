import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ERRORS, handleServerError } from "../../errors/errors.helper";

export async function integracoesController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const integracaoService = fastify.services.integracaoService;
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const integracoes = await integracaoService.listarIntegracoes();
      return reply.code(200).send(integracoes);
    } catch (error) {
      return handleServerError(reply, error);
    }
  });
  fastify.post(
    "/",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "config_json"],
          properties: {
            name: { type: "string" },
            config_json: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.user as any;
      const { name, config_json } = request.body as any;

      try {
        const integracao = await integracaoService.createIntegracao({
          name,
          config_json,
          tenantId,
        });
        return reply.code(200).send(integracao);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.put(
    "/:id",

    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const { name, config_json } = request.body as any;
      try {
        const integracao = await integracaoService.updateIntegracao({
          id,
          config_json,
          name,
        });
        return reply.code(200).send(integracao);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );

  fastify.delete(
    "/:integracaoId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { profile } = request.user as any;
      if (profile !== "admin") {
        return reply
          .code(ERRORS.unauthorizedAccess.statusCode)
          .send(ERRORS.unauthorizedAccess.message);
      }
      const { integracaoId } = request.params as any;

      try {
        await integracaoService.deleteIntegracao(parseInt(integracaoId));
        return reply.code(200).send({ message: "Integracao Apagada." });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}

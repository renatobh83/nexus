import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { AppError, handleServerError } from "../../errors/errors.helper";
interface FastReplyData {
  key: string;
  message: string;
  user: number;
  tenant: number;
}

export async function fastReplyController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const fastReplyService = fastify.services.fastReplyService;

  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, profile } = request.user as any

    try {
      const whereConditions = profile === "admin" ? undefined : userId



      const respostaRapida = await fastReplyService.findAll({ userId: whereConditions });
      return reply.code(200).send(respostaRapida);
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
          required: ["key", "message"],
          properties: {
            key: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: FastReplyData }>,
      reply: FastifyReply
    ) => {
      const { tenantId, userId } = request.user as any;

      const newReply: FastReplyData = {
        ...request.body,
        user: userId,
        tenant: tenantId,
      };
      try {
        const respostaRapida = await fastReplyService.createFasReply(newReply);
        return reply.code(200).send(respostaRapida);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.put(
    "/:fastReplyId",
    {
      schema: {
        body: {
          type: "object",
          required: ["key", "message"],
          properties: {
            key: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: FastReplyData }>,
      reply: FastifyReply
    ) => {
      const { tenantId, userId } = request.user as any;

      try {
        const fastReplyData: FastReplyData = {
          ...request.body,
          user: userId,
          tenant: tenantId
        };

        const { fastReplyId } = request.params as { fastReplyId: string };

        const respostaRapida = await fastReplyService.updateFastReply(parseInt(fastReplyId), fastReplyData)
        return reply.code(200).send(respostaRapida);
      } catch (error) {

        return handleServerError(reply, error);
      }
    }
  );

  fastify.delete("/:fastReplyId", async (
    request: FastifyRequest<{ Body: FastReplyData }>,
    reply: FastifyReply
  ) => {

    try {
      const { fastReplyId } = request.params as { fastReplyId: string };

      await fastReplyService.deteleFastReply(parseInt(fastReplyId))
      return reply
        .code(200)
        .send({ message: "Resposta rapida apagada." });
    } catch (error) {
      return handleServerError(reply, error);
    }
  });
}

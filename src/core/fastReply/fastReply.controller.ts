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
    try {
      const respostaRapida = await fastReplyService.findAll();
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
      const { tenantId, profile, userId } = request.user as any;
      if (profile !== "admin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
      }
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
}

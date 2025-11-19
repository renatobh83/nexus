import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { AppError, handleServerError } from "../../errors/errors.helper";

interface QueueData {
  queue: string;
  isActive: boolean;
}

export async function queueController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const queueService = fastify.services.queueService;

  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const queues = await queueService.findAllQueue();
      return reply.code(200).send(queues);
    } catch (error) {
      return handleServerError(reply, error);
    }
  });
  fastify.get(
    "/:queueId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { queueId } = request.params as any;
      try {
        const queue = await queueService.findQueueById(queueId);
        return reply.code(200).send(queue);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/",
    {
      schema: {
        body: {
          type: "object",
          required: ["queue", "isActive"],
          properties: {
            queue: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: QueueData }>,
      reply: FastifyReply
    ) => {
      const { tenantId, profile, userId } = request.user as any;
      if (profile !== "admin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
      }
      const newQueue = { ...request.body, userId, tenantId };
      try {
        const queue = await queueService.createQueue(newQueue);
        return reply.code(200).send(queue);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.put(
    "/:queueId",
    {
      schema: {
        body: {
          type: "object",
          required: ["queue", "isActive"],
          properties: {
            queue: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: QueueData }>,
      reply: FastifyReply
    ) => {
      const { tenantId, profile, userId } = request.user as any;
      const { queueId } = request.params as { queueId: string };

      const idQueue = parseInt(queueId, 10);
      if (isNaN(idQueue)) {
        return null;
      }
      if (profile !== "admin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
      }
      const updateQueue = { ...request.body, userId, tenantId };
      try {
        const queue = await queueService.updateQueue(idQueue, updateQueue);
        return reply.code(200).send(queue);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.delete(
    "/:queueId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { profile, tenantId } = request.user as any;
      const { queueId } = request.params as { queueId: string };

      if (profile !== "admin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
      }
      const idQueue = parseInt(queueId, 10);
      if (isNaN(idQueue)) {
        return null;
      }

      try {
        await queueService.deleteQueue(idQueue);
        return reply.code(200).send({ message: "Fila apagada." });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}

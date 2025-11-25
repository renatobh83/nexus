import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { handleServerError } from "../../errors/errors.helper";

export async function ticketController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const ticketService = fastify.services.ticketService;
  const settingsService = fastify.services.settingsService;
  fastify.get(
    "/",
    async (
      request: FastifyRequest<{
        Querystring: {
          searchParam: string;
          pageNumber: string;
          status: string;
          date: string;
          showAll: string;
          withUnreadMessages: string;
          queuesIds: string[];
          isNotAssignedUser: string;
          includeNotQueueDefined: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId, userId, profile } = request.user as any;
        const payload = {
          ...request.query,
          tenantId,
          userId,
          profile,
          status: request.query.status.split(","),
        };

        const tickets = await ticketService.findAll(payload, settingsService);
        return reply.code(200).send(tickets);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}

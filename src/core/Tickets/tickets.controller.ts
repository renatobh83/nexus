import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { AppError, handleServerError } from "../../errors/errors.helper";
import { pupa } from "../../ultis/pupa";

export async function ticketController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const ticketService = fastify.services.ticketService;
  const settingsService = fastify.services.settingsService;
  const whatsappService = fastify.services.whatsappService;
  const logTicketService = fastify.services.logTicketService;
  const messageService = fastify.services.messageService;
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
  fastify.get(
    "/:ticketId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { ticketId } = request.params as { ticketId: string };
        const { tenantId, userId } = request.user as any;
        const ticket = await ticketService.findTicketBy({
          id: parseInt(ticketId, 10),
        });
        if (!ticket) {
          throw new AppError("ERRO_TICKET_NO_FOUND", 404);
        }
        await logTicketService.createLogTicket({
          userId,
          queueId: null,
          chamadoId: null,
          ticketId,
          tenantId: ticket.tenantId,
          type: "access",
        });
        return reply.code(200).send(ticket);
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
          required: ["contactId", "channel"],
          properties: {
            contactId: { type: "string" },
            channel: { type: "string" },
            status: { type: "string" },
            channelId: { type: "string" },

            isTransference: { type: "boolean" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          contactId: number;
          status: string;
          channelId: string;
          isTransference: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId, userId } = request.user as any;

      try {
        const isConnected = await whatsappService.findById(
          parseInt(request.body.channelId),
          tenantId
        );
        if (!isConnected) {
          return reply.status(404).send({ message: "CHANNEL_IS_NO_FOUND" });
        }
        if (isConnected.status === "DISCONNECTED") {
          return reply.status(404).send({ message: "ERR_NO_DEF_WAPP_FOUND" });
        }
        const payload = {
          ...request.body,
          userId,
          tenantId,
          channelId: isConnected.id,
          channel: isConnected.name.toLowerCase(),
        };

        const ticket = await ticketService.createTicketRoute(payload);
        return reply.code(200).send(ticket);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.put(
    "/:ticketId",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            contactId: { type: "string" },
            channel: { type: "string" },
            status: { type: "string" },
            channelId: { type: "number" },
            isTransference: { type: "boolean" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          contactId: number;
          status: string;
          userId: number;
          isActiveDemand: boolean;
          channel: string;
          channelId?: number;
          isTransference: boolean;
          queueId: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId, userId } = request.user as any;
        const { ticketId } = request.params as { ticketId: number };
        const { isTransference } = request.body;
        const payload = {
          ...request.body,
          tenantId,
          ticketId,
          isTransference,
          userIdRequest: userId,
        };

        const ticket = await ticketService.updateStatusTicket(payload);

        if (ticket.status === "closed" && !ticket.isGroup) {
          const channel = await whatsappService.findById(
            ticket.whatsappId!,
            ticket.tenantId
          );
          if (channel?.farewellMessage) {
            const body = pupa(channel.farewellMessage || "", {
              protocol: ticket.id,
              name: ticket.contact.name,
            });
            const messageData = {
              message: { body, fromMe: true, read: true },
              tenantId,
              ticket,
              userId: userId,
              sendType: "bot",
              status: "pending",
              isTransfer: false,
              note: false,
            };
            await messageService.createMessageSystem(messageData);
            await ticketService.updateTicket(ticket.id, {
              isFarewellMessage: true,
            });
          }
        }

        return reply.code(200).send(ticket);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}

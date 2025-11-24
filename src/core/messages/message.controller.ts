import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { AppError, handleServerError } from "../../errors/errors.helper";
import { Message } from "wbotconnect";

export async function messageController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const messageService = fastify.services.messageService;
  const ticketService = fastify.services.ticketService;
  fastify.get(
    "/:ticketId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      //   const { tenantId } = request.user as any;
      const { ticketId } = request.params as any;
      const { pageNumber } = request.query as { pageNumber: string };
      const numberTicket = parseInt(ticketId);
      try {
        // const { count, messages, ticket, hasMore } = await ListMessagesService({
        //   tenantId,
        //   ticketId,
        //   pageNumber,
        // });
        const { count, messages, hasMore } =
          await messageService.findAllMessageTicket(
            {
              ticketid: numberTicket,
            },
            { skip: parseInt(pageNumber) }
          );

        // SetTicketMessagesAsRead(ticket);
        return reply.code(200).send({ count, messages, hasMore });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/:ticketId",
    async (
      request: FastifyRequest<{
        Body: {
          body: string;
          fromMe: boolean;
          read: boolean;
          sendType?: string;
          scheduleDate?: string | Date;
          quotedMsg?: Message;
          idFront?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId, id } = request.user as any;
      const { ticketId } = request.params as any;
      let filesArray: any[] = [];
      let fields: Record<string, any> = {};

      if (request.isMultipart()) {
        const parts = request.parts();

        for await (const part of parts) {
          if (part.type === "file") {
            const buffer = await part.toBuffer();
            filesArray.push({
              filename: part.filename,
              mimetype: part.mimetype,
              buffer,
            });
          } else {
            fields[part.fieldname] = part.value;
          }
        }
      } else {
        fields = request.body as any;
      }
      try {
        const ticket = await ticketService.findTicketId(parseInt(ticketId));

        if (!ticket) {
          throw new AppError("TICKET_NO_FOUND", 404);
        }

        // await SetTicketMessagesAsRead(ticket);

        const messageData = {
          message: fields,
          filesArray,
          tenantId,
          ticket,
          userId: id,
          status: "pending",
        };

        await messageService.createMessageSystem(messageData);
        return reply.code(200).send({ message: "messagem enviada" });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/reaction/:messageid",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { messageid, emoji } = request.body as any;
      try {
        await messageService.udpateMessageReaction(messageid, emoji);
        return reply.code(200).send(true);
      } catch (error) {
        return reply.code(500).send({ message: "sendReaction" });
      }
    }
  );
  fastify.post(
    "/forward-messages",
    async (
      request: FastifyRequest<{
        Body: {
          messages: any[];
          contact: any;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { contact, messages } = request.body;
      const { userId, tenantId } = request.user as any;

      try {
        for (const message of messages) {
          await messageService.createForwardMessageService({
            userId,
            tenantId: tenantId,
            message,
            contact,
            ticketIdOrigin: message.ticketId,
          });
        }

        return reply.code(200).send({ message: "messagem enviada" });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}

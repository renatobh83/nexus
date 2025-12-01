import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { handleServerError } from "../../errors/errors.helper";

export async function emailController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const emailService = fastify.services.emailService;
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.user as any;
    try {
      const email = await emailService.findOne({ tenantId });

      return reply.code(200).send(email);
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
          required: ["email", "senha", "ssl", "tsl", "smtp", "portaSMTP"],
          properties: {
            portaSMTP: { type: "number" },
            senha: { type: "string" },
            email: { type: "string", format: "email" },
            tsl: { type: "string" },
            ssl: { type: "boolean" },
            smtp: { type: "string" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          email: string;
          senha: string;
          ssl: boolean;
          tsl: string;
          smtp: string;
          portaSMTP: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId } = request.user as any;
      const payload = { ...request.body, tenantId };
      try {
        const email = await emailService.createEmail(payload);
        return reply.code(200).send(email);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/send",
    {
      schema: {
        body: {
          type: "object",
          required: ["to", "subject", "html"],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.user as any;
      const { to, subject, html, attachmentUrl } = request.body as any;

      emailService.sendEmail({
        to,
        tenantId,
        subject,
        html,
        attachmentUrl,
      });
      try {
        return reply.code(200).send({ message: "E-mail enviado" });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/send/test",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.user as any;
      const { text } = request.body as any;

      emailService.sendEmail({
        tenantId,
        to: "suporte2@exp.net.br",
        subject: "Teste envio de email",
        html: "teste",
        text,
      });
      try {
        return reply.code(200).send({ message: "E-mail enviado" });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}

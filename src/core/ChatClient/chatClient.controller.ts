import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { handleServerError } from "../../errors/errors.helper";
import { getFastifyApp } from "../../api";
import path from "path";
import { saveFile } from "../../ultis/saveFile";
import { sign } from "jsonwebtoken";

export async function chatClientController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  fastify.get(
    "/chat-widget.js",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        return reply
          .type("application/javascript")
          .header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
          .sendFile("chat-widget-core.js");
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/chatClient/token",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "email", "identifier"],
          properties: {
            name: { type: "string" },
            identifier: { type: "number" },
            email: { type: "string", format: "email" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          email: string;
          identifier: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { email, identifier, name } = request.body;
      const empresa =
        await getFastifyApp().services.empresaService.findyCompanyByid({
          identifier: identifier,
        });

      if (!empresa) {
        return reply.status(400).send({
          error: "Emrpesa nao encontrada",
          valid: false,
        });
      }
      const JWT_SECRET = process.env.CHAT_SECRET!;
      const payload = {
        name,
        email,
        tenantId: empresa.tenantId,
        empresaId: empresa.id,
        empresa: empresa.name,
        role: "guest", // se quiser diferenciar
        type: "chat-client", // útil para diferenciar tokens de painel
      };
      const token = sign(payload, JWT_SECRET, {
        expiresIn: "360m", // tempo de vida do token
      });

      try {
        return reply.code(200).send({ token });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/chatClient/upload",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const files = request.files();
        const publicFolder = path.join(process.cwd(), "public");
        let filename: string = "";
        for await (const file of files) {
          try {
            filename = await saveFile(file, publicFolder);
          } catch (error) {
            console.log(error);
          }
        }
        const fileUrl = `${process.env.BACKEND_URL}/public/${filename}`;

        return reply.code(200).send({ url: fileUrl });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );

  //   ROTAS INTEGRACAO
  fastify.post(
    "/validate-registration-token",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.body as any;
      if (!token) {
        return reply.status(400).send({
          error: "Token é obrigatório",
          valid: false,
        });
      }
      try {
        const tokenService = getFastifyApp().services.tokenService;
        const validation = await tokenService.validateToken(token);
        if (!validation.valid) {
          return reply.status(400).send({
            error: "Token inválido, expirado ou já utilizado",
            valid: false,
          });
        }
        return reply.send({
          valid: true,
          message: "Token válido para registro",
          userId: validation.data.userId,
        });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );

  fastify.post(
    "/complete-registration",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.body as any;
      if (!token) {
        return reply.status(400).send({
          error: "Token é obrigatório",
        });
      }
      try {
        const tokenService = getFastifyApp().services.tokenService;
        const tokenMarked = await tokenService.markTokenAsUsed(token);

        if (!tokenMarked) {
          return reply.status(400).send({
            error: "Token inválido, expirado ou já utilizado",
          });
        }
        // 2. Validar novamente o token para pegar os dados
        const validation = await tokenService.validateToken(token);

        if (!validation.valid || !validation.data) {
          return reply.status(400).send({
            error: "Token se tornou inválido durante o processo",
          });
        }

        await tokenService.invalidateToken(token);

        return reply.code(200).send({ success: true });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/register",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token, formData } = request.body as any;
      const tokenService = getFastifyApp().services.tokenService;
      if (!token) {
        return reply.status(400).send({
          error: "Token é obrigatório",
        });
      }
      const validation = await tokenService.validateToken(token);
      try {
        if (!validation.valid) {
          return reply.status(400).send({
            error: "Token inválido, expirado ou já utilizado",
            valid: false,
          });
        }
        //   await CadastroPaciente({ token: decode, formdata: formData });
        return reply.code(200).send({ success: true });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}

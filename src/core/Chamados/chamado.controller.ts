import path from "path";
import fs from "node:fs";

import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { handleServerError } from "../../errors/errors.helper";
import { saveFile } from "../../ultis/saveFile";

const ATTACHMENTSFOLDER = path.join(process.cwd(), "public", "attachments");
// Garantir que a pasta existe
if (!fs.existsSync(ATTACHMENTSFOLDER)) {
  fs.mkdirSync(ATTACHMENTSFOLDER, { recursive: true });
}

export async function chamadoController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const chamadoService = fastify.services.chamadoService;
  fastify.post(
    "/",
    {
      schema: {
        body: {
          type: "object",
          required: ["contatoId", "empresaId", "descricao", "assunto"],
          properties: {
            ticketId: { type: "number" },
            descricao: { type: "string" },
            empresaId: { type: "string" },
            contatoId: {
              anyOf: [
                { type: "number" }, // permite um único número
                {
                  type: "array", // ou um array de números
                  items: { type: "number" },
                  minItems: 1,
                },
              ],
            },
            assunto: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId, tenantId } = request.user as any;

      try {
        const { empresaId, assunto, descricao, contatoId, ticket } =
          request.body as any;

        const chamado = await chamadoService.createChamado(
          {
            tenantId,
            userId,
            assunto,
            empresaId: parseInt(empresaId),
            descricao,
            contatoId,
          },
          ticket
        );
        return reply.code(200).send(chamado);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    // const { pageNumber } = request.query as IListallRequest;
    try {
      // const { chamados, count, hasMore } = await ListaTodosChamadosService({
      //   pageNumber,
      // });
      const chamados = await chamadoService.findAll();

      return reply.code(200).send({
        chamados,
        count: 0,
        hasMore: false,
      });
    } catch (error) {
      return handleServerError(reply, error);
    }
  });
  fastify.put(
    "/:chamadoId",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            ticketId: { type: "number" },
            descricao: { type: "string" },
            contatoId: {
              anyOf: [
                { type: "string" }, // permite um único número
                {
                  type: "array", // ou um array de números
                  items: { type: "string" },
                  minItems: 1,
                },
              ],
            },
            assunto: { type: "string" },
            conclusao: { type: "string" },
            comentarios: {
              type: "array",
              items: {},
            },
            files: {
              type: "array",
              items: {},
            },
            status: { type: "string" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          ticketId: number;
          status: "ABERTO" | "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";
          userId: number;
          descricao: string;
          assunto: string;
          conclusao: string;
          comentarios: string[];
          contatoId: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId, userId } = request.user as any;
      const { chamadoId } = request.params as { chamadoId: string };

      const payload = {
        ...request.body,
        chamadoId: parseInt(chamadoId),
        tenantId,
        userIdUpdate: userId,
        socket: request.server.io,
      };
      try {
        // const chamado = await updateChamadoService(payload);
        const chamado = await chamadoService.updateChamado(payload);
        return reply.code(200).send(chamado);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.get(
    "/:chamadoId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { chamadoId } = request.params as { chamadoId: string };
      try {
        const detalhesChamado = await chamadoService.findById(
          parseInt(chamadoId)
        );

        return reply.code(200).send(detalhesChamado);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.get(
    "/empresa/:empresaId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { empresaId } = request.params as any;
      try {
        const chamados = await chamadoService.findAllBy({
          empresaId: parseInt(empresaId),
          closedAt: null,
        });
        return reply.code(200).send(chamados);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.put(
    "/empresa/:empresaId",
    {
      schema: {
        body: {
          type: "object",
          required: ["ticketId", "chamadoId"],
          properties: {
            ticketId: { type: "number" },
            chamadoId: { type: "number" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { ticketId: string; chamadoId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { empresaId } = request.params as { empresaId: string };
      const { ticketId, chamadoId } = request.body;
      try {
        const chamado = await chamadoService.associarTicketChamado(
          parseInt(empresaId),
          parseInt(chamadoId),
          parseInt(ticketId)
        );
        return reply.code(200).send(chamado);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.get(
    "/media/:id/arquivo",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await chamadoService.getMediaChamado(parseInt(id));

        return reply.code(200).send(data);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.delete(
    "/media/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        await chamadoService.deleteMediaChamado(parseInt(id));
        return reply.code(200).send({ message: "Sucess" });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/media/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const dataBody = request.body as any;
        await chamadoService.updateMediaFileChamado(dataBody);
        return reply.code(200).send({ message: "Sucess" });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.put(
    "/:chamadoId/anexo",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const files = request.files();
      const { chamadoId } = request.params as any;
      try {
        const uploadedFiles: { filename: string; path: string }[] = [];
        for await (const file of files) {
          try {
            const filename = await saveFile(file, ATTACHMENTSFOLDER);
            uploadedFiles.push({ filename, path: `/attachments/${filename}` });
          } catch (error) {
            console.log(error);
          }
        }
        const chamado = await chamadoService.createMediaChamado(
          parseInt(chamadoId),
          uploadedFiles
        );

        return reply.code(200).send(chamado);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/:chamadoId/sendMessage",
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      try {
        const { tenantId } = request.user as any;
        const dataBody = request.body as any;
        const payload = { ...dataBody, tenantId };

        return reply.code(200).send({ message: "Sucess" });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  //   fastify.get("/:empresaId/time", ChamadoController.listaTempoChamados);
}

import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ERRORS, handleServerError } from "../../errors/errors.helper";
import { Prisma } from "@prisma/client";

export async function empresaController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const empresaService = fastify.services.empresaService;
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const empresas = await empresaService.finalAllCompany({
        empresaContacts: {
          select: {
            contact: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        contratos: true,
      });

      return reply.code(200).send(empresas);
    } catch (error) {
      return handleServerError(reply, error);
    }
  });
  fastify.get(
    "/:param",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { param } = request.params as { param: string };
      try {
        let where: Prisma.EmpresaWhereInput = {};
        // Se for número, busca por id
        // Se tiver 14 dígitos e for BigInt/CNPJ
        if (/^\d{14}$/.test(param)) {
          where.identifier = parseInt(param, 10);
        } else if (!isNaN(Number(param))) {
          where.id = Number(param);
        } else {
          where.name = param;
        }

        const empresa = await empresaService.findyCompanyByid(where);
        return reply.code(200).send(empresa);
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
          required: ["name", "identifier"],
          properties: {
            identifier: { type: "string", pattern: "^[0-9]{14}$" },
            name: { type: "string" },
            address: { type: "object" },
            conclusao: { type: "string" },
            acessoExterno: {
              type: "array",
              items: { type: "object" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          identifier: number;
          address: object;
          acessoExterno: string[];
        };
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId, profile } = request.user as any;
      if (profile !== "admin") {
        return reply
          .code(ERRORS.unauthorizedAccess.statusCode)
          .send(ERRORS.unauthorizedAccess.message);
      }
      const payload = {
        ...request.body,
        tenant: tenantId,
      };

      try {
        const empresa = await empresaService.createCompany(payload);
        return reply.code(200).send(empresa);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.delete(
    "/:empresaId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { profile } = request.user as any;
      if (profile !== "admin") {
        return reply
          .code(ERRORS.unauthorizedAccess.statusCode)
          .send(ERRORS.unauthorizedAccess.message);
      }
      const { empresaId } = request.params as any;
      try {
        await empresaService.deleteCompany(empresaId);
        return reply.code(200).send({ message: "Empresa apagada." });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.put(
    "/:empresaId",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "identifier"],
          properties: {
            identifier: { type: "number" },
            name: { type: "string" },
            address: { type: "object" },
            conclusao: { type: "string" },
            acessoExterno: {
              type: "array",
              items: { type: "object" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { profile } = request.user as any;
      if (profile !== "admin") {
        return reply
          .code(ERRORS.unauthorizedAccess.statusCode)
          .send(ERRORS.unauthorizedAccess.message);
      }
      const { empresaId } = request.params as any;
      const payload = {
        id: empresaId,
        ...(request.body as any),
      };
      try {
        const empresa = await empresaService.updateCompany(payload);

        return reply.code(200).send(empresa);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/:empresaId/contrato",
    {
      schema: {
        body: {
          type: "object",
          required: ["totalHoras", "dataContrato"],
          properties: {
            totalHoras: { type: "string" },
            dataContrato: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { profile, tenantId } = request.user as any;
      if (profile !== "admin") {
        return reply
          .code(ERRORS.unauthorizedAccess.statusCode)
          .send(ERRORS.unauthorizedAccess.message);
      }
      const { empresaId } = request.params as any;
      const { totalHoras, dataContrato } = request.body as any;
      try {
        await empresaService.insertOrUpdateContrato({
          dataContrato,
          empresaId,
          tenantId,
          totalHoras,
        });

        return reply.code(200).send("dadosContrato");
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.get(
    "/:empresaId/contacts",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { empresaId } = request.params as { empresaId: string };

        const id = parseInt(empresaId, 10);
        if (isNaN(id)) {
          return [];
        }
        const contatos = await empresaService.contatosEmpresa(id);
        return reply.code(200).send(contatos);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.put(
    "/:empresaId/contacts",
    {
      schema: {
        body: {
          type: "object",
          required: ["contactIds"],
          properties: {
            contactIds: {
              type: "array",
              items: { type: "number" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { empresaId } = request.params as any;
      const { contactIds } = request.body as any;
      try {
        const id = parseInt(empresaId, 10);
        if (isNaN(id)) {
          return [];
        }
        const emrpesaContatos = await empresaService.updateContatoEmpresa(
          id,
          contactIds
        );

        return reply.code(200).send(emrpesaContatos);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}

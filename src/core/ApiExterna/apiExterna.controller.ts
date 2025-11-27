import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ERRORS, handleServerError } from "../../errors/errors.helper";

export interface ApiData {
  name: string;
  sessionId: number;
  urlServiceStatus?: string;
  urlMessageStatus?: string;
  authToken: string;
  isActive?: boolean;
  tenantId: number;
  userId: number;
  id: string;
}
export async function extenalApiController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const services = fastify.services;
  fastify.post(
    "/external/:apiId",
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{
        Body: {
          number: string;
          message: string;
          externalKey: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { sessionId, tenantId } = request.user as any;
      const { apiId } = request.params as any;
      try {
        const where = {
          id: apiId,
          tenantId: tenantId,
          authToken: request.body.externalKey,
          sessionId,
        };
        const payload = {
          number: request.body.number,
          message: request.body.message,
        };
        services.apiExternaService.messageApiToJob(where, payload);
        return reply.code(200).send({ message: "Add job " });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );

  fastify.post(
    "/apiConfig",

    {
      schema: {
        body: {
          type: "object",
          required: ["name", "sessionId"],
          properties: {
            name: { type: "string" },
            authToken: { type: "string" },
            urlServiceStatus: { type: "string" },
            urlMessageStatus: { type: "string" },
            sessionId: { type: "number" },
            isActive: { type: "boolean" },
            id: { type: "string" },
          },
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId, userId, profile } = request.user as any;
      const dataApi = request.body as ApiData;
      dataApi.tenantId = tenantId;
      dataApi.userId = userId;

      if (profile !== "admin") {
        return reply
          .code(ERRORS.unauthorizedAccess.statusCode)
          .send(ERRORS.unauthorizedAccess.message);
      }

      try {
        const api = await services.apiExternaService.createApiConfig(dataApi);

        return reply.code(200).send(api);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.get(
    "/apiConfig",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { profile } = request.user as any;
      if (profile !== "admin") {
        return reply
          .code(ERRORS.unauthorizedAccess.statusCode)
          .send(ERRORS.unauthorizedAccess.message);
      }
      try {
        const apiList = await services.apiExternaService.listaApis();
        return reply.code(200).send(apiList);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );

  fastify.delete(
    "/apiConfig/:apiId",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { profile } = request.user as any;
      if (profile !== "admin") {
        return reply
          .code(ERRORS.unauthorizedAccess.statusCode)
          .send(ERRORS.unauthorizedAccess.message);
      }
      const { apiId } = request.params as any;
      try {
        await services.apiExternaService.deleteApi(apiId);
        return reply.code(200).send({ message: "Api Excluida" });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );

  fastify.put(
    "/apiConfig/renew-token/:apiId",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Body: ApiData }>, reply: FastifyReply) => {
      const { tenantId, profile } = request.user as any;
      if (profile !== "admin") {
        return reply
          .code(ERRORS.unauthorizedAccess.statusCode)
          .send(ERRORS.unauthorizedAccess.message);
      }
      const { apiId } = request.params as any;
      try {
        const api = await services.apiExternaService.renewToken(apiId, {
          ...request.body,
          tenantId,
        });

        return reply.code(200).send(api);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.post(
    "/external/:apiId/:idIntegracao/:authToken",
    
    async (
      request: FastifyRequest<{
        Body: {
          contatos: object[];
        };
      }>,
      reply: FastifyReply
    ) => {
      const { apiId, idIntegracao, authToken } = request.params as any;
      const dadosConfirmacao = request.body.contatos[0] as any;
      try {
        const payload = { ...dadosConfirmacao, apiId, idIntegracao, authToken };
        // await checkBotIntegracaoService(dadosConfirmacao, payload);
        return reply.code(200).send({ message: "Add job " });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}

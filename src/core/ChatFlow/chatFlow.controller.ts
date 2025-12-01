import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { AppError, handleServerError } from "../../errors/errors.helper";
import { ChatFlowData, Flow } from "./chatFlow.types";

export async function chatFlowController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const chatFlowServices = fastify.services.chatFlowService;
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId, profile } = request.user as any;
      if (profile !== "admin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
      }
      const chatFlows = await chatFlowServices.listaAllChatFlow({ tenantId });
      return reply.code(200).send(chatFlows);
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
          required: ["name", "flow"],
          properties: {
            name: { type: "string" },
            flow: { type: "object" },
            celularTeste: { type: "string" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          flow: Flow;
          name: string;
          celularTeste: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { celularTeste, flow: flowFromBody, name } = request.body;

      try {
        const { tenantId, profile, userId } = request.user as any;
        if (profile !== "admin") {
          throw new AppError("ERR_NO_PERMISSION", 403);
        }
        const newFlow: ChatFlowData = {
          flow: Object.assign({}, flowFromBody),
          name: name,
          isActive: true,
          userId,
          tenantId,
          celularTeste: celularTeste,
        };
        const flow = await chatFlowServices.createChatFlow(newFlow);
        return reply.code(200).send(flow);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.delete(
    "/:chatFlowId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { chatFlowId } = request.params as any;
        const { tenantId, profile } = request.user as any;
        if (profile !== "admin") {
          throw new AppError("ERR_NO_PERMISSION", 403);
        }

        await chatFlowServices.updateChatFlow(parseInt(chatFlowId), {
          isActive: false,
          isDeleted: true,
        });
        return reply.code(200).send({ message: "Flow deleted" });
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.put(
    "/:chatFlowId",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "flow"],
          properties: {
            name: { type: "string" },
            flow: { type: "object" },
            celularTeste: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          flow: Flow;
          name: string;
          celularTeste: string;
          isActive: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { profile } = request.user as any;
        const { chatFlowId } = request.params as any;
        if (profile !== "admin") {
          throw new AppError("ERR_NO_PERMISSION", 403);
        }
        const { celularTeste, name, isActive } = request.body;

        const flowUpdated = await chatFlowServices.updateChatFlow(
          parseInt(chatFlowId),
          {
            celularTeste,
            name,
            isActive,
          }
        );
        return reply.code(200).send(flowUpdated);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.get(
    "/chat-flow-export/:chatFlowId",
    async (
      request: FastifyRequest<{ Body: { flow: any } }>,
      reply: FastifyReply
    ) => {
      try {
        const { chatFlowId } = request.params as any;
        const { profile } = request.user as any;

        if (profile !== "admin") {
          throw new AppError("ERR_NO_PERMISSION", 403);
        }
        const jsonFlow = (await chatFlowServices.exportChatFlow(
          parseInt(chatFlowId)
        )) as any;
        return reply
          .header(
            "Content-Disposition",
            `attachment; filename=${jsonFlow.name}.json`
          )
          .header("Content-Type", "application/json")
          .code(200)
          .send(jsonFlow);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
  fastify.put(
    "/chat-flow-import/:chatFlowId",
    async (
      request: FastifyRequest<{ Body: { flow: any } }>,
      reply: FastifyReply
    ) => {
      try {
        const { chatFlowId } = request.params as any;
        const { profile } = request.user as any;

        if (profile !== "admin") {
          throw new AppError("ERR_NO_PERMISSION", 403);
        }

        const chatFlow = await chatFlowServices.importChatFlow(
          parseInt(chatFlowId),
          request.body.flow
        );

        return reply.code(200).send(chatFlow);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}

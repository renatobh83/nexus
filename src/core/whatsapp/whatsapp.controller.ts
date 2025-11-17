import {
  FastifyRequest,
  FastifyReply,
  FastifyInstance,
  FastifyPluginOptions,
} from "fastify";
import { handleServerError } from "../../errors/errors.helper";
import { logger } from "../../ultis/logger";

/**
 * Controller de Whatsapp (Plugin Fastify).
 * @param fastify - A instância do Fastify, que agora contém o 'userService' injetado.
 * @param opts - Opções do plugin.
 */
export async function whatsappController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const whatsappService = fastify.services.whatsappService;
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Chama o Service
      const wpp = await whatsappService.findAll();

      // 2. Envia a resposta de sucesso
      return reply.status(200).send(wpp);
    } catch (error) {
      // 3. Em caso de erro inesperado no serviço, loga e envia um erro 500
      request.log.error(error, "❌ Erro ao buscar wpp no WppController");
      return reply.status(500).send({ error: "Erro interno ao buscar wpp." });
    }
  });
  fastify.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any;
      // 1. Chama o Service
      const wpp = await whatsappService.findById(id);

      // 2. Envia a resposta de sucesso
      return reply.status(200).send(wpp);
    } catch (error) {
      // 3. Em caso de erro inesperado no serviço, loga e envia um erro 500
      request.log.error(error, "❌ Erro ao buscar wpp no WppController");
      return reply.status(500).send({ error: "Erro interno ao buscar wpp." });
    }
  });
  fastify.put(
    "/:whatsappId",
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          type: "waba" | "instagram" | "telegram" | "whatsapp";
          status: string;
          isDefault: boolean;
          session: string;
          tokenTelegram: string;
          isActive: boolean;
          wppUser: string;
          wabaBSP: string;
          tokenAPI: string;
          pairingCodeEnabled: boolean;
          chatFlowId: number;
          qrcode: string;
          farewellMessage: string;
          tokenHook: string | null;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId } = request.user as any;
        const { whatsappId } = request.params as any;
        const payload = { ...request.body, tenantId, whatsappId };

        const channel = await whatsappService.update(
          whatsappId,
          tenantId,
          payload
        );

        return reply.code(200).send(channel);
      } catch (error) {
        logger.error("Error in updateCanal", error);
        return handleServerError(reply, error);
      }
    }
  );
  fastify.delete(
    "/:whatsappId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { whatsappId } = request.params as any;
        await whatsappService.apagarCanal(whatsappId);

        return reply.code(200).send({ message: "Sucess" });
      } catch (error) {
        logger.error("Error in apagarConexao", error);
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
          required: ["name", "type"],
          properties: {
            name: { type: "string" },
            type: { type: "string" },
            tokenTelegram: { type: "string" },
            instagramUser: { type: "string" },
            instagramKey: { type: "string" },
            wabaBSP: { type: "string" },
            tokenAPI: { type: "string" },
            farewellMessage: { type: "string" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          tokenTelegram: string;
          instagramUser: string;
          instagramKey: string;
          type: "waba" | "instagram" | "telegram" | "whatsapp";
          wabaBSP: string;
          tokenAPI: string;
          isDefault: boolean;
          pairingCodeEnabled: boolean;
          farewellMessage: string;
          chatFlowId: number;
          wppUser: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId } = request.user as any;
      const { pairingCodeEnabled } = request.body;
      const payload = {
        ...request.body,
        status: "DISCONNECTED",
        tenantId: tenantId,
        pairingCodeEnabled: pairingCodeEnabled ?? false,
      };
      try {
        const channel = await whatsappService.create(payload);
        return reply.code(200).send(channel);
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}

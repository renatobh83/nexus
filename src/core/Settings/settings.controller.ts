import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { AppError, handleServerError } from "../../errors/errors.helper";

export async function settignsController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  const setttingServices = fastify.services.settingsService;
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const settings = await setttingServices.findAllSettings();
      return reply.code(200).send(settings);
    } catch (error) {
      return handleServerError(reply, error);
    }
  });
  fastify.put(
    "/:settingKey",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId, profile } = request.user as any;
      if (profile !== "admin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
      }
      try {
        const { value, key } = request.body as any;
        const payload = { value, tenantId, key };

        return reply
          .code(200)
          .send(await setttingServices.updateSetting(key, payload));
      } catch (error) {
        return handleServerError(reply, error);
      }
    }
  );
}

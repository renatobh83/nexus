import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { handleServerError } from "../../errors/errors.helper";
import { redisClient } from "../../lib/redis";

export async function auxiliarController(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  fastify.get("/server-time", (req, res) => {
    return res.code(200).send({ serverTime: new Date().toISOString() });
  });
  fastify.get("/r/:code", async (request, reply) => {
    const { code } = request.params as any;
    try {
      const originalUrl = await redisClient.get(`short:${code}`);

      if (!originalUrl) {
        return reply.code(400).send("Link expirado ou inválido");
      }
      return reply.redirect(originalUrl);
    } catch (error) {
      return handleServerError(reply, error);
    }
  });
  fastify.get("/pdf/:cdPlano", async (request, reply) => {
    const { cdPlano } = request.params as any;
    const { token } = request.query as any;
    try {
      console.log(token);
      //   verify(
      //     token,
      //     "78591a1f59eda6e939d7a7752412b364a5218eef12a839616af49080860273c7"
      //   );
      const htmlContent = await redisClient.get(`Pdf:${cdPlano}`);
      if (!htmlContent) {
        return reply.status(200).send("PDF expirado ou não encontrado");
      }

      return reply
        .header("Content-Type", "text/html; charset=utf-8")
        .code(200)
        .send(htmlContent);
    } catch (error) {
      return handleServerError(reply, error);
    }
  });
}

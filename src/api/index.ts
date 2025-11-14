import Fastify, {
  FastifyServerOptions,
  FastifyInstance,
  FastifyError,
  FastifyRequest,
} from "fastify";
import fastifyEnv from "@fastify/env";
import jwt from "@fastify/jwt";
import { FastifyReply } from "fastify/types/reply";
import { redisPlugin } from "./plugins/redis";
import { prisma } from "../lib/prisma";

const isDevelopment = process.env.NODE_ENV !== "production";

/**
 * Funcao responsavel para construir o servidor
 *
 * @returns {Promise<FastifyInstance>} Uma Promise que resolve para o objeto do FastifyInstance
 */
async function buildServer(
  config: FastifyServerOptions = {}
): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: isDevelopment ? "info" : "error",
      transport: isDevelopment
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          }
        : undefined,
    },
    trustProxy: true,
  });
  server.get("/", async () => {
    return { message: "Bem-vindo ao Nexus!" };
  });
  //   await server.register(fastifyEnv, {
  //     dotenv: true,
  //   });
  server.log.info("🔌 Tentando conectar ao banco de dados...");
  await prisma.$connect();
  server.log.info("✅ Banco de dados conectado com sucesso!");
  await server.register(redisPlugin);
  server.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);

    if (error.code === "FST_CORS_ERROR") {
      return reply.status(400).send({ error: "CORS não permitido" });
    }

    reply.status(error.statusCode || 500).send({
      error: error.message || "Erro interno no servidor",
    });
    server.decorate(
      "authenticate",
      async function (request: FastifyRequest, reply: FastifyReply) {
        try {
          await request.jwtVerify(); // verifica o token
        } catch (err: any) {
          request.server.log.error("JWT ERROR:", err);
          reply.status(401).send({ error: "Token inválido", details: err });
        }
      }
    );
    server.setNotFoundHandler((request, reply) => {
      reply.status(404).send({
        error: "Not Found",
        message: `A rota ${request.url} não existe`,
      });
    });
  });
  return server;
}
/**
 * Funcao responsavel para iniciar o servidor
 *
 *
 */
export async function start() {
  const app = await buildServer();

  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
    app.log.info("Servidor rodando em http://localhost:3000");
    app.server.keepAliveTimeout = 5 * 60 * 1000;
    // await StartAllWhatsAppsSessions();
    // await scheduleOrUpdateDnsJob();
  } catch (err: any) {
    app.log.error(err);
    process.exit(1);
  }
}

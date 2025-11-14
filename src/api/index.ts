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
import fastifyModule from "./plugins/fastifyModules";

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
    disableRequestLogging: true,
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
  server.register(async (instance: FastifyInstance) => {
    instance.log.info("🔌 Tentando conectar ao banco de dados...");
    await prisma.$connect();
    instance.log.info("✅ Banco de dados conectado com sucesso!");

    // Registra outros plugins que dependem de conexões externas
    await instance.register(redisPlugin);
    await instance.register(fastifyModule);
  });
  server.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (err: any) {
        // Não precisa tipar 'err' como 'any' aqui, o catch já o trata.
        request.server.log.error("JWT ERROR:", err);
        // Retorna a resposta para parar a execução.
        return reply.status(401).send({ error: "Token inválido" });
      }
    }
  );
  server.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      request.log.error(error);

      if (error.code === "FST_CORS_ERROR") {
        return reply.status(400).send({ error: "CORS não permitido" });
      }

      // Resposta padrão para outros erros
      return reply.status(error.statusCode || 500).send({
        error: error.message || "Erro interno no servidor",
      });
    }
  );
  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: "Not Found",
      message: `A rota ${request.url} não existe`,
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
    if (app) {
      app.log.error(err, "❌ Falha ao iniciar o servidor.");
    } else {
      console.error("❌ Falha crítica antes da inicialização do logger:", err);
    }
    process.exit(1);
  }
}

import Fastify, {
  FastifyServerOptions,
  FastifyInstance,
  FastifyError,
  FastifyRequest,
} from "fastify";
import fastifyEnv from "@fastify/env";
import jwt from "@fastify/jwt";
import fastifySocketIO from "fastify-socket.io";
import { FastifyReply } from "fastify/types/reply";
import { redisPlugin } from "./plugins/redis";
import { prisma } from "../lib/prisma";
import fastifyModule from "./plugins/fastifyModules";
import routes from "./routes/Index";
import { initWbot } from "../lib/wbot";
import { setupSocket } from "../lib/socket";
import decodeTokenSocket from "../ultis/decodeTokenSocket";
import { JsonWebTokenError } from "jsonwebtoken";

import diContainerPlugin from "./plugins/di-container";
let fastifyApp: FastifyInstance;

const isDevelopment = process.env.NODE_ENV !== "production";

/**
 * Funcao responsavel para construir o servidor
 *
 * @returns {Promise<FastifyInstance>} Uma Promise que resolve para o objeto do FastifyInstance
 */
async function buildServer(): Promise<FastifyInstance> {
  // config: FastifyServerOptions = {}
  const server = Fastify({
    disableRequestLogging: true,
    logger: {
      // level: isDevelopment ? "info" : "error",
      level: "info",
      transport: isDevelopment
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          }
        : {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          },
    },
    trustProxy: true,
  });
  server.setSerializerCompiler(() => {
    return (data) =>
      JSON.stringify(data, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      );
  });
  await server.register(jwt, {
    secret: process.env.JWT_SECRET!,
  });

  server.register(diContainerPlugin);
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
  });
  await server.register(fastifyModule);
  await server.register(redisPlugin);
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
  await server.register(routes);

  await server.register(fastifySocketIO, {
    cors: {
      origin: ["http://localhost:5173", "*"],
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingTimeout: 180000,
    pingInterval: 60000,
  });

  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: "Not Found",
      message: `A rota ${request.url} não existe`,
    });
  });

  server.ready((err) => {
    if (err) throw err;

    // 3. APLICAR O MIDDLEWARE DE AUTENTICAÇÃO DO SOCKET.IO
    server.io.use(async (socket, next) => {
      try {
        const token =
          socket?.handshake?.auth?.token ||
          socket?.handshake?.headers?.authorization?.split(" ")[1];

        if (!token) {
          return next(new Error("token ausente"));
        }

        const verifyValid = decodeTokenSocket(token);
        if (!verifyValid.isValid) return next(new Error("invalid token"));
        const data = verifyValid.data;

        if (data.type === "chat-client") {
          socket.handshake.auth = {
            ...data,
            tenantId: String(verifyValid.data.tenantId),
          };
          return next();
        }

        const auth = socket?.handshake?.auth;
        socket.handshake.auth = {
          ...auth,
          ...verifyValid.data,
          id: String(verifyValid.data.id),
          tenantId: String(verifyValid.data.tenantId),
        };

        const user = await server.services.userService.findUserById(
          verifyValid.data.id as string
        );

        socket.handshake.auth.user = user;
        return next();
      } catch (err: any) {
        if (err instanceof JsonWebTokenError) {
          console.warn(`Token inválido no socket ${socket.id}: ${err.message}`);
        } else {
          console.error(`Erro inesperado no socket ${socket.id}:`, err);
        }
        socket.emit(`tokenInvalid:${socket.id}`);
        next(new Error("authentication error"));
      }
    });

    // 4. CONFIGURAR OS LISTENERS DE EVENTOS DO SOCKET.IO
    setupSocket(server.io);
  });

  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      try {
        await server.close();
        // await shutdown();
        server.log.error(`Closed application on ${signal}`);
        process.exit(0);
      } catch (err: any) {
        server.log.error(`Error closing application on ${signal}`, err);
        process.exit(1);
      }
    });
  });

  signals.forEach((signal) => {
    process.on(signal, async () => {
      try {
        await server.close();
        // await shutdown();
        server.log.error(`Closed application on ${signal}`);
        process.exit(0);
      } catch (err: any) {
        server.log.error(`Error closing application on ${signal}`, err);
        process.exit(1);
      }
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

  fastifyApp = app;
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
    app.log.info("Servidor rodando em http://localhost:3000");
    app.server.keepAliveTimeout = 5 * 60 * 1000;
      
    // await scheduleOrUpdateDnsJob();
    app.services.whatsappService.startAllReadySessions();
  } catch (err: any) {
    if (app) {
      app.log.error(err, "❌ Falha ao iniciar o servidor.");
    } else {
      console.error("❌ Falha crítica antes da inicialização do logger:", err);
    }
    process.exit(1);
  }
}

export const getFastifyApp = () => fastifyApp;

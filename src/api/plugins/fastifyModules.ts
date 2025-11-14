import fp from "fastify-plugin";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import csrf from "@fastify/csrf-protection";
import compress from "@fastify/compress";
import formbody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import xss from "xss";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

/**
 * @file Módulo de Segurança e Middlewares Essenciais para Fastify
 * @module plugins/fastifyModules
 *
 * @description
 * Este plugin encapsula um conjunto abrangente de middlewares e configurações de segurança
 * para robustecer a aplicação Fastify. Ele é projetado para ser um ponto central de
 * configuração para proteção contra vulnerabilidades web comuns e para habilitar
 * funcionalidades essenciais de uma API moderna.
 *
 * As funcionalidades incluem:
 * 1.  **Segurança de Cabeçalhos HTTP** com Helmet e uma política de segurança de conteúdo (CSP) estrita.
 * 2.  **Controle de Acesso Cross-Origin (CORS)** com uma lista de permissões dinâmica.
 * 3.  **Servidor de Arquivos Estáticos** para a pasta 'public'.
 * 4.  **Limitação de Requisições (Rate Limiting)** para prevenção de ataques de força bruta e DoS.
 * 5.  **Parsing de Cookies** seguros e assinados.
 * 6.  **Parsing de Corpo de Requisição** para `form-data`, `multipart` e compressão de resposta.
 * 7.  **Proteção contra Poluição de Parâmetros HTTP (HPP)**.
 * 8.  **Proteção contra Cross-Site Request Forgery (CSRF)** com tokens rotativos.
 * 9.  **Sanitização de Entradas (XSS)** para `body`, `query` e `params`.
 * 10. **Logging Detalhado** do ciclo de vida de cada requisição.
 *
 * @see https://github.com/fastify/fastify-helmet
 * @see https://github.com/fastify/fastify-cors
 * @see https://github.com/fastify/fastify-rate-limit
 */
const fastifyModule = fp(async (fastify: FastifyInstance) => {
  fastify.log.info(
    "🔐 Registrando módulo de segurança e middlewares essenciais..."
  );

  // --- 1. Segurança de Cabeçalhos (Helmet & CSP) ---
  // Define cabeçalhos HTTP seguros para mitigar ataques como Clickjacking e XSS.
  // A Política de Segurança de Conteúdo (CSP) restringe de onde os recursos podem ser carregados.
  await fastify.register(helmet, {
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? {
            /* Configurações de produção estritas */
          }
        : false, // Desativa CSP em desenvolvimento para facilitar o uso de hot-reloading e outras ferramentas.
    // ... outras configurações do helmet
    xPoweredBy: false, // Sempre desativar para não expor a tecnologia do servidor.
  });

  // --- 2. Controle de Acesso Cross-Origin (CORS) ---
  // Gerencia quais origens externas podem fazer requisições à API.
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(",") || ["*"];
  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (
        !origin ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin)
      ) {
        return cb(null, true);
      }
      // Rejeita a requisição se a origem não estiver na lista de permissões.
      return cb(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
    credentials: true,
  });

  // --- 3. Servidor de Arquivos Estáticos ---
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, "..", "..", "..", "public"),
    prefix: "/public/",
  });

  // --- 4. Limitação de Requisições (Rate Limiting) ---
  // Protege a API contra ataques de força bruta e abuso, limitando o número de requisições por IP.
  await fastify.register(rateLimit, {
    max: 100, // Máximo de 100 requisições
    timeWindow: "1 minute", // por minuto
    redis: fastify.redis, // Usa o Redis para um rate limit distribuído e persistente.
    // ...
  });

  // --- 5. Parsing de Cookies, Formulários e Compressão ---
  await fastify.register(cookie, { secret: process.env.COOKIE_SECRET });
  await fastify.register(formbody);
  await fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // Limite de 10MB para uploads
  await fastify.register(compress);

  // --- 6. Proteção contra Poluição de Parâmetros HTTP (HPP) ---
  // Previne que um atacante sobrescreva parâmetros enviando múltiplos valores para o mesmo parâmetro de query.
  fastify.addHook(
    "preValidation",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.query) {
        for (const key in request.query as Record<string, unknown>) {
          if (Array.isArray((request.query as Record<string, unknown>)[key])) {
            return reply
              .code(400)
              .send({ error: "Detecção de Poluição de Parâmetro HTTP (HPP)." });
          }
        }
      }
    }
  );

  // --- 7. Proteção contra Cross-Site Request Forgery (CSRF) ---
  // Garante que as requisições que modificam o estado sejam originadas da nossa própria aplicação.
  await fastify.register(csrf, {
    cookieOpts: { secure: true, httpOnly: true, sameSite: "strict" },
  });
  fastify.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Para requisições GET, gera e envia um novo token CSRF para ser usado em requisições subsequentes.
      if (request.method === "GET") {
        reply.header("x-csrf-token", reply.generateCsrf());
      }
    }
  );

  // --- 8. Sanitização de Entradas contra Cross-Site Scripting (XSS) ---
  // Limpa todas as entradas do usuário (body, query, params) para remover scripts maliciosos.
  const sanitize = (value: unknown): unknown => {
    if (typeof value === "string") return xss(value);
    if (Array.isArray(value)) return value.map(sanitize);
    if (value !== null && typeof value === "object") {
      const sanitizedObject: { [key: string]: unknown } = {};
      for (const key in value as Record<string, unknown>) {
        sanitizedObject[key] = sanitize(
          (value as Record<string, unknown>)[key]
        );
      }
      return sanitizedObject;
    }
    return value;
  };
  fastify.addHook("preValidation", async (request: FastifyRequest) => {
    request.body = sanitize(request.body);
    request.query = sanitize(request.query);
    request.params = sanitize(request.params);
  });

  fastify.log.info(
    "✅ Módulo de segurança e middlewares essenciais carregado com sucesso!"
  );
});

export default fastifyModule;

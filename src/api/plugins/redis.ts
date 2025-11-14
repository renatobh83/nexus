import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { redisClient } from "../../lib/redis";
import { registerBullMQ } from "./bullMq";

/**
 * Plugin de Conexão com o Redis para Fastify.
 *
 * Este plugin encapsula a lógica de conexão com o cliente Redis. Ele garante
 * que a aplicação só prossiga com o registro de outros plugins dependentes (como BullMQ)
 * após a conexão com o Redis ser estabelecida com sucesso.
 *
 * Ele também centraliza o tratamento de logs e erros de conexão, tornando o bootstrap
 * da aplicação mais limpo e resiliente.
 *
 * @see https://github.com/fastify/fastify-plugin
 *
 * @param fastify A instância do Fastify, que será usada para logar eventos e registrar outros plugins.
 *
 * @example
 * // No seu arquivo server.ts:
 * import { redisPlugin } from './api/plugins/redis';
 *
 * server.register(redisPlugin );
 * // O registro de plugins que dependem do Redis deve ocorrer DENTRO deste plugin.
 */
export const redisPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.log.info("🔌 Registrando plugin do Redis...");
  // Verificamos o status atual do cliente.
  if (redisClient.status === "ready") {
    // Se já estiver pronto, registramos o BullMQ imediatamente.
    fastify.log.info("Redis já está pronto. Registrando BullMQ.");
    fastify.register(registerBullMQ);
  } else {
    // Se ainda não estiver pronto (improvável, mas seguro), esperamos pelo evento 'ready'.
    redisClient.once("ready", () => {
      fastify.log.info("Redis ficou pronto. Registrando BullMQ.");
      fastify.register(registerBullMQ);
    });
  }
  // Decora a instância do Fastify para que o cliente seja acessível em outros lugares.
  fastify.decorate("redis", redisClient);

  // Adiciona o hook para fechar a conexão graciosamente.
  fastify.addHook("onClose", async (instance) => {
    await redisClient.quit();
    instance.log.info("Conexão com o Redis fechada graciosamente.");
  });
});

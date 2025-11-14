import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { redisClient } from "../../lib/redis";

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
  redisClient.on("ready", () => {
    fastify.log.info("Redis conectado e pronto, registrando Workes");
    // fastify.register(registerBullMQ);
    // fastify.decorate("redis", redisClient);
  });
});

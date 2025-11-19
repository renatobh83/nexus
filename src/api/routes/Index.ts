import { FastifyInstance } from "fastify";
import { userController } from "../../core/users/users.controller";
import { whatsappController } from "../../core/whatsapp/whatsapp.controller";
import { authController } from "../../core/Auth/auth.controller";
import { settignsController } from "../../core/Settings/settings.controller";
import { loadInicialController } from "../../core/LoadInicial/loadInicial.controller";
import { empresaController } from "../../core/Empresa/empresa.controller";
import { queueController } from "../../core/Queue/queue.controller";
import { fastReplyController } from "../../core/fastReply/fastReply.controller";

// Importe seus controllers

// Importe outros controllers...
// import { ticketController } from "../tickets/ticket.controller";

/**
 * Plugin principal que agrupa todas as rotas da API sob um prefixo comum.
 * @param {FastifyInstance} fastify - A instância do Fastify.
 */
async function apiV1Routes(fastify: FastifyInstance) {
  // =================================================================
  // ROTAS PÚBLICAS
  // =================================================================
  // Estas rotas não exigem autenticação.
  // O prefixo final será: /api/v1/whatsapp

  fastify.register(authController, { prefix: "/auth" });

  // Exemplo de outra rota pública
  // fastify.register(authController, { prefix: "/auth" });

  // =================================================================
  // ROTAS PRIVADAS (ESCOPO DE AUTENTICAÇÃO)
  // =================================================================
  // Registra um novo escopo para agrupar todas as rotas que precisam de autenticação.
  fastify.register(async (privateScope) => {
    // Aplica o hook de autenticação a TODAS as rotas registradas dentro deste escopo.
    privateScope.addHook("preHandler", fastify.authenticate);
    privateScope.register(loadInicialController, { prefix: "/loadInicial" });
    privateScope.register(whatsappController, { prefix: "/whatsapp" });
    privateScope.register(userController, { prefix: "/users" });
    privateScope.register(settignsController, { prefix: "/settings" });
    privateScope.register(empresaController, { prefix: "/empresas" });
    privateScope.register(queueController, { prefix: "/queue" });
    privateScope.register(fastReplyController, { prefix: "/fastreply" });
    // Registra os controllers privados dentro do escopo autenticado.
    // O prefixo final será: /api/v1/users
    // privateScope.register(userController, { prefix: "/users" });

    // Registre outros controllers privados aqui...
    // privateScope.register(ticketController, { prefix: "/tickets" });
    // privateScope.register(tenantController, { prefix: "/tenants" });
  });
}

/**
 * Registra o plugin principal da API com o prefixo global.
 * @param {FastifyInstance} fastify - A instância principal do Fastify.
 */
export async function routes(fastify: FastifyInstance) {
  // Registra nosso plugin de rotas com o prefixo base para a v1 da API.
  // Todas as rotas definidas em 'apiV1Routes' herdarão este prefixo.
  await fastify.register(apiV1Routes, { prefix: "/api/v1" });
}

// Exporta 'routes' como o plugin padrão a ser usado no seu 'server.ts'
export default routes;

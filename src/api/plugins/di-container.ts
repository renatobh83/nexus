// src/plugins/di-container.ts

import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin"; // Usado para garantir que o plugin funcione corretamente
import { UserService } from "../../core/users/users.service";
import { WhatsappService } from "../../core/whatsapp/whatsapp.service";
import { AuthService } from "../../core/Auth/auth.service";

// Defina uma interface para o objeto que será injetado
export interface AppServices {
  userService: UserService;
  whatsappService: WhatsappService;
  authService: AuthService;

  // ... outros serviços
}

// Estenda os tipos do Fastify para o TypeScript saber sobre o novo objeto
declare module "fastify" {
  export interface FastifyInstance {
    services: AppServices; // Agora você injeta TUDO em 'services'
  }
}

// O plugin que monta e decora todos os serviços
async function diContainerPlugin(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // 2. Instanciação dos serviços (injetando as dependências)
  const userService = new UserService();
  const whatsappService = new WhatsappService();
  const authService = new AuthService();

  // 3. Cria o objeto de serviços
  const services: AppServices = {
    userService,
    whatsappService,
    authService,
  };

  // 4. Decora a instância do Fastify com o objeto 'services'
  fastify.decorate("services", services);
}

// Exporta o plugin
export default fp(diContainerPlugin);

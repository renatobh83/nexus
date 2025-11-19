import { FastifyInstance } from "fastify";

export class LoadInicialService {
  constructor() {}
  async loadInicial(fastify: FastifyInstance) {
    const app = fastify.services;
    const channels = await app.whatsappService.findAll();
    const settings = await app.settingsService.findAllSettings();
    const usuarios = await app.userService.findAllUsers();
    const queues = await app.queueService.findAllQueue();
    const empresas = await app.empresaService.finalAllCompany({
      empresaContacts: {
        select: {
          contact: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      contratos: true,
    });

    return {
      channels,
      empresas,
      settings,
      usuarios,
      queues,
    };
  }
}

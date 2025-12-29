import { FastifyInstance } from "fastify";


export class LoadInicialService {
  constructor() { }
  async loadInicial(fastify: FastifyInstance) {
    const app = fastify.services;
    const channels = await app.whatsappService.findAll();
    const settings = await app.settingsService.findAllSettings();
    const usuarios = await app.userService.findAllUsers();
    const queues = await app.queueService.findAllQueue();
    const contatos = await app.contatoService.ListarContatos();
    const empresas = await app.empresaService.finalAllCompany();
    const chatFlow = await app.chatFlowService.listaAllChatFlow({
      isDeleted: false,
    });

    const data = {
      queues,
      settings,
      channels,
      empresas,
      usuarios,
      contatos,
      chatFlow,
    };

    return { payload: data };
  }
}

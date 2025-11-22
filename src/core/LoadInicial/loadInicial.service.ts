import { FastifyInstance } from "fastify";
import { encrypt } from "../../lib/crypto";

export class LoadInicialService {
  constructor() {}
  async loadInicial(fastify: FastifyInstance) {
    const app = fastify.services;
    const channels = await app.whatsappService.findAll();
    const settings = await app.settingsService.findAllSettings();
    const usuarios = await app.userService.findAllUsers();
    const queues = await app.queueService.findAllQueue();
    const contatos = await app.contatoService.ListarContatos()
    const empresas = await app.empresaService.finalAllCompany()



const data = { queues, settings, channels, empresas, usuarios, contatos };
const encryptedData = encrypt(JSON.stringify(data));

return { payload: encryptedData }; 

  }
}

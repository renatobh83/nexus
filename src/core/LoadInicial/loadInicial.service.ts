import { FastifyInstance } from "fastify";
import { encrypt } from "../../lib/crypto";

export class LoadInicialService {
  constructor() {}
  async loadInicial(fastify: FastifyInstance) {
    const app = fastify.services;
    const channels = await app.whatsappService.findAll();
    const settigns = await app.settingsService.findAllSettings();
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



const data = { queues, settigns, channels, empresas, usuarios };
const encryptedData = encrypt(JSON.stringify(data));

return { payload: encryptedData }; 

  }
}

import { FastifyRequest, FastifyReply } from "fastify";
import { WhatsappService } from "./whatsapp.service";

export class WppController {
  private whatsappService: WhatsappService;

  constructor() {
    this.whatsappService = new WhatsappService();
  }
  listaCanais = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Chama o Service
      const wpp = await this.whatsappService.findAll();

      // 2. Envia a resposta de sucesso
      return reply.status(200).send(wpp);
    } catch (error) {
      // 3. Em caso de erro inesperado no serviço, loga e envia um erro 500
      request.log.error(error, "❌ Erro ao buscar wpp no WppController");
      return reply.status(500).send({ error: "Erro interno ao buscar wpp." });
    }
  };
}

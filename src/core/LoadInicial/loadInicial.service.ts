import { WhatsappService } from "../whatsapp/whatsapp.service";

export class LoadInicialService {
  private whatsappService: WhatsappService;

  constructor() {
    this.whatsappService = new WhatsappService();
  }
  async loadInicial() {
    const channels = await this.whatsappService.findAll();

    return {
      channels,
    };
  }
}

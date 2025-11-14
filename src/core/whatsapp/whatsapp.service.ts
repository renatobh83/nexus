import { Prisma, Whatsapp } from "@prisma/client"; // Importa o tipo gerado pelo Prisma
import jwt from "jsonwebtoken";
import { WhatsappRepository } from "./whatsapp.repository";
import { AppError } from "../../errors/errors.helper";

export class WhatsappService {
  private whatsappRepository: WhatsappRepository;
  constructor() {
    this.whatsappRepository = new WhatsappRepository();
    // this.webhookService = new WebhookService();
  }
  /**
   * Orquestra a criação de uma nova conexão de WhatsApp.
   * Recebe o DTO, aplica a lógica de negócio e chama o repositório.
   * @param dto - O Data Transfer Object vindo do Controller.
   */
  async create(dto: CreateWhatsappDTO): Promise<Whatsapp> {
    let tokenHook: string | undefined = undefined;
    const secret = process.env.WEBHOOK_TOKEN;

    if (dto.type === "telegram" && !dto.tokenTelegram) {
      throw new AppError("Telegram: favor informar o Token.", 400);
    }
    let isDefault = dto.isDefault ?? false;

    // Busca o padrão atual usando findFirst
    const currentDefault = await this.whatsappRepository.findFirst({
      tenantId: dto.tenantId,
      isDefault: true,
    });
    // Se o novo deve ser padrão, e já existe um padrão, desativa o antigo.
    if (isDefault && currentDefault) {
      await this.whatsappRepository.update(currentDefault.id, {
        isDefault: false,
      });
    }
    // Se nenhum padrão existe no tenant, força o novo a ser o padrão.
    if (!currentDefault) {
      isDefault = true;
    }
    if (secret && (dto.type === "waba" || dto.type === "messenger")) {
      // Assumimos que o ID será gerado, então o JWT não pode depender dele aqui.
      // O ideal é gerar o token após a criação e fazer um update.
      // Ou, se o JWT não precisar do ID, pode ser gerado aqui.
      // Exemplo sem o ID:
      tokenHook = jwt.sign({ tenantId: dto.tenantId, name: dto.name }, secret, {
        expiresIn: "10000d",
      });
    }

    // 2. Monta o objeto de dados final no formato que o repositório espera.
    const dataForDb: Prisma.WhatsappCreateInput = {
      // Conecta as relações
      tenant: {
        connect: { id: dto.tenantId },
      },
      // Se houver um chatFlowId no DTO, conecta a relação
      ...(dto.chatFlowId && {
        chatFlow: {
          connect: { id: dto.chatFlowId },
        },
      }),

      // Mapeia os campos diretos
      name: dto.name,
      status: dto.status,
      type: dto.type,
      pairingCodeEnabled: dto.pairingCodeEnabled ?? false,
      wppUser: dto.wppUser,
      tokenTelegram: dto.tokenTelegram,
      farewellMessage: dto.farewellMessage,
      isDefault: isDefault,

      // Adiciona os campos gerados pela lógica de negócio
      tokenHook: tokenHook,
    };

    // =================================================================
    // 4. CRIAÇÃO DO REGISTRO
    // =================================================================
    const newWhatsapp = await this.whatsappRepository.create(dataForDb);
    return newWhatsapp;
  }

  /**
   *
   * @param data
   * @returns lista de canais
   */
  async findAll(): Promise<Whatsapp[]> {
    return await this.whatsappRepository.findAll();
  }

  /**
   * Gera um token de webhook se necessário.
   * Substitui a lógica do método estático 'CreateTokenWebHook'.
   */
  private generateWebhookToken<
    T extends {
      type?: string;
      tokenHook?: string | null;
      tenantId: number;
      id?: number;
    }
  >(data: T): T {
    const secret = process.env.WEBHOOK_TOKEN;
    if (!secret) return data;

    if (
      !data.tokenHook &&
      (data.type === "waba" || data.type === "messenger")
    ) {
      const tokenHook = jwt.sign(
        { tenantId: data.tenantId, whatsappId: data.id },
        secret,
        { expiresIn: "10000d" }
      );
      return { ...data, tokenHook };
    }
    return data;
  }
  /**
   * Envia um webhook com o status da conexão.
   * Substitui a lógica do método estático 'HookStatus'.
   */
  private async sendConnectionStatusWebhook(instance: Whatsapp): Promise<void> {
    const { status, name, number, tenantId, id: sessionId } = instance;
    const payload = {
      name,
      number,
      status,
      timestamp: Date.now(),
      type: "hookSessionStatus",
    };

    // A lógica de buscar ApiConfig e enviar o webhook iria aqui.
    // await this.webhookService.send(tenantId, sessionId, payload);
    console.log("Enviando webhook de status:", payload);
  }
}

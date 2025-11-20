import { Prisma, Whatsapp } from "@prisma/client"; // Importa o tipo gerado pelo Prisma
import jwt from "jsonwebtoken";
import { WhatsappRepository } from "./whatsapp.repository";
import { AppError } from "../../errors/errors.helper";
import { getIO } from "../../lib/socket";
import { initWbot, removeSession, removeWbot } from "../../lib/wbot";
import { StartConnectionSession } from "../../api/helpers/StartConnectionSession";

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

    // // Busca o padrão atual usando findFirst
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

    // // 2. Monta o objeto de dados final no formato que o repositório espera.
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
      pairingCodeEnabled: dto.pairingCodeEnabled,
      wppUser: dto.wppUser,
      tokenTelegram: dto.tokenTelegram,
      farewellMessage: dto.farewellMessage,
      isDefault: isDefault,
      tokenHook: tokenHook,
    };

    // // =================================================================
    // // 4. CRIAÇÃO DO REGISTRO
    // // =================================================================
    const newWhatsapp = await this.whatsappRepository.create(dataForDb);
    return newWhatsapp;
  }
  /**
   * Retorna uma lista de todas as conexões de WhatsApp.
   *
   * @returns {Promise<Whatsapp[]>} Um array com todas as conexões. Retorna um array vazio se não houver nenhuma.
   */
  async findAll(): Promise<Whatsapp[]> {
    const where: Prisma.WhatsappWhereInput = {
      isDeleted: false,
      isActive: true,
    };
    return this.whatsappRepository.findMany(where);
  }

  /**
   * Busca uma única conexão de WhatsApp pelo seu ID.
   *
   * Este método serve como um wrapper para o método do repositório,
   * garantindo que o ID seja convertido para um número antes da consulta.
   * É a forma padrão de recuperar os dados completos de uma conexão específica.
   *
   * @param {string} id - O ID da conexão de WhatsApp em formato de string (geralmente vindo de um parâmetro de rota da API).
   * @returns {Promise<Whatsapp | null>} Uma Promise que resolve para o objeto completo
   * da conexão de WhatsApp, ou `null` se nenhuma conexão for encontrada com o ID fornecido.
   */
  async findById(id: string, tenantId?: number): Promise<Whatsapp | null> {
    // Converte o ID de string para número, pois o banco de dados espera um inteiro.
    const wppId = parseInt(id, 10);
    // Validação para garantir que a conversão resultou em um número válido.
    if (isNaN(wppId)) {
      return null;
    }
    const where: Prisma.WhatsappWhereInput = { id: wppId };
    if (tenantId) {
      where.tenantId = tenantId; // Scoped to tenant
    }
    return this.whatsappRepository.findFirst(where, {
      apiConfigs: true,
      tenant: { select: { name: true } },
    });
  }

  /**
   * Atualiza uma conexão de WhatsApp existente.
   *
   * Esta função orquestra a atualização de um registro de WhatsApp. Ela contém
   * a lógica de negócio para garantir que apenas uma conexão por tenant seja
   * a padrão ('isDefault'). Se uma conexão é definida como padrão, qualquer
   * outra que anteriormente era padrão será desmarcada.
   *
   * @param {number} whatsappId - O ID da conexão de WhatsApp a ser atualizada.
   * @param {number} tenantId - O ID do tenant proprietário, para garantir o escopo de segurança.
   * @param {UpdateWhatsappDTO} dto - Um objeto contendo os dados a serem atualizados.
   * @returns {Promise<Whatsapp>} Uma Promise que resolve para o objeto Whatsapp completo e atualizado.
   * @throws {AppError} Lança um erro se a conexão de WhatsApp não for encontrada (ERR_NO_WAPP_FOUND).
   */
  async update(
    whatsappId: string,
    tenantId: number,
    dto: UpdateWhatsappDTO
  ): Promise<Whatsapp> {
    // =================================================================
    // 1. LÓGICA DE NEGÓCIO (isDefault)
    // =================================================================
    // Se a atualização está tentando definir esta conexão como a padrão...
    if (dto.isDefault) {
      // ...primeiro, busca por qualquer *outra* conexão que já seja a padrão neste tenant.
      const currentDefault = await this.whatsappRepository.findFirst({
        tenantId: tenantId,
        isDefault: true,
        id: { not: parseInt(whatsappId) }, // A mágica do Prisma: 'id' não é o 'whatsappId' que estamos atualizando.
      });

      // Se encontrou uma, a desmarca.
      if (currentDefault) {
        await this.whatsappRepository.update(currentDefault.id, {
          isDefault: false,
        });
      }
    }

    // =================================================================
    // 2. PREPARAÇÃO DOS DADOS PARA O BANCO (Tradução DTO -> Prisma)
    // =================================================================
    // O Prisma é inteligente com 'undefined'. Se um campo no DTO não for fornecido,
    // ele não será incluído no objeto 'data' e não será atualizado.
    const dataForDb: Prisma.WhatsappUpdateInput = {
      name: dto.name,
      status: dto.status,
      isDefault: dto.isDefault,
      session: dto.session,
      tokenTelegram: dto.tokenTelegram,
      isActive: dto.isActive,
      wppUser: dto.wppUser,
      type: dto.type,
      wabaBSP: dto.wabaBSP,
      tokenAPI: dto.tokenAPI,
      pairingCodeEnabled: dto.pairingCodeEnabled,
      qrcode: dto.qrcode,
      farewellMessage: dto.farewellMessage,
      // Lógica para conectar/desconectar o ChatFlow
      ...(dto.chatFlowId !== undefined && {
        chatFlow:
          dto.chatFlowId === null || dto.chatFlowId === 0
            ? { disconnect: true } // Desconecta se o ID for nulo ou 0
            : { connect: { id: dto.chatFlowId } }, // Conecta ao novo ID
      }),
    };

    // =================================================================
    // 3. EXECUÇÃO DA ATUALIZAÇÃO
    // =================================================================
    try {
      const updatedWhatsapp = await this.whatsappRepository.updateScoped(
        whatsappId,
        tenantId,
        dataForDb
      );

      // =================================================================
      // 4. EMISSÃO DE EVENTO (Efeito Colateral)
      // =================================================================
      const io = getIO();
      io.to(String(tenantId)).emit(`${tenantId}:whatsappSession`, {
        action: "update",
        session: updatedWhatsapp,
      });

      return updatedWhatsapp;
    } catch (error) {
      // O Prisma lança P2025 se o registro a ser atualizado não for encontrado.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new AppError("ERR_NO_WAPP_FOUND", 404);
      }
      // Se for outro erro, apenas o relançamos para ser tratado em uma camada superior.
      console.error("Erro ao atualizar WhatsApp:", error);
      throw new AppError("ERRO_AO_ATUALIZAR_WHATSAPP", 500);
    }
  }

  /**
   * Busca uma única conexão de WhatsApp pelo seu ID e delete a conexao.
   *
   * Este método serve como um wrapper para o método do repositório,
   * garantindo que o ID seja convertido para um número antes da consulta e apagar.
   * É a forma padrão de apagar uma conexao.
   *
   * @param {string} id - O ID da conexão de WhatsApp em formato de string (geralmente vindo de um parâmetro de rota da API).
   * @returns {Promise<void>} Uma Promise que resolve para o objeto completo
   * da conexão de WhatsApp, ou `null` se nenhuma conexão for encontrada com o ID fornecido.
   */
  async apagarCanal(id: string): Promise<void> {
    const wppId = parseInt(id, 10);

    // Validação para garantir que a conversão resultou em um número válido.
    if (isNaN(wppId)) {
      throw new AppError("ERR_NO_WAPP_ID_STRING", 404);
    }
    const conexao = await this.whatsappRepository.findFirst({ id: wppId });

    if (!conexao) {
      throw new AppError("ERR_NO_WAPP_FOUND", 404);
    }
    if (conexao.type === "whatsapp" && conexao.status === "CONNECTED") {
      removeSession(conexao.name);
    }
    await this.whatsappRepository.deleteWhasapp(wppId);
  }

  /**
   * Inicia as sessões de todas as conexões de WhatsApp ativas e prontas.
   *
   * Este método busca no banco de dados todas as conexões que estão em um
   * estado operacional (ativas, conectadas e não aguardando QR Code) e,
   * em seguida, itera sobre elas para iniciar suas respectivas sessões.
   * É ideal para ser chamado na inicialização do servidor ou em rotinas de
   * reconexão.
   *
   * @returns {Promise<void>} Uma Promise que resolve quando a tentativa de
   * iniciar todas as sessões for concluída.
   */
  async startAllReadySessions(): Promise<void> {
    // 1. CHAMA O MÉTODO DO REPOSITÓRIO
    // A complexidade da busca está totalmente encapsulada no repositório.
    // O serviço apenas consome o resultado.
    const readyWhatsapps = await this.whatsappRepository.findActiveAndReady();
    
    if (readyWhatsapps.length === 0) {
      console.log('INFO: Nenhuma conexão pronta para iniciar encontrada.');
      return;
    }

    // console.log(`INFO: Encontradas ${readyWhatsapps.length} conexões. Tentando iniciar as sessões...`);

    // 2. APLICA A LÓGICA DE NEGÓCIO SOBRE OS DADOS RETORNADOS
    // Itera sobre a lista de conexões retornadas.
    // Usamos Promise.all para processar as inicializações em paralelo, o que é mais eficiente.
    await Promise.all(
      readyWhatsapps.map(async (whatsapp) => {
        try {
          // Aqui você colocaria a sua lógica real para iniciar uma sessão.

          await StartConnectionSession(whatsapp);
        } catch (error) {
          console.error(
            `ERROR: Falha ao iniciar a sessão para '${whatsapp.name}' (ID: ${whatsapp.id}).`,
            error
          );
        }
      })
    );
  }
  async startChannelSession(channleId: number): Promise<void> {
    const whatsapp = await this.whatsappRepository.update(channleId, {
      status: "OPENING",
    });
    const io = getIO();
    io.emit(`${whatsapp.tenantId}:whatsappSession`, {
      action: "update",
      session: whatsapp,
    });
    try {
      if (whatsapp.type === "whatsapp") {
        await initWbot(whatsapp, this);
      }
      if (whatsapp.type === "telegram") {
        // StartTbotSession(whatsapp);
      }
    } catch (error) {}
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
  /**
   * Atualiza o estado de uma sessão para 'qrcode', salvando o QR Code.
   * Emite um evento de socket para notificar o frontend.
   */
  async handleQrCode(
    whatsappId: string,
    tenantId: number,
    qrcode: string,
    attempts: number
  ): Promise<void> {
    const updatedWhatsapp = await this.whatsappRepository.updateScoped(
      whatsappId,
      tenantId,
      {
        qrcode,
        status: "qrcode",
        retries: attempts,
      }
    );
    this.emitSessionUpdate(tenantId, updatedWhatsapp);
  }

  /**
   * Atualiza o estado de uma sessão para 'CONNECTED', limpando dados antigos.
   * Emite múltiplos eventos de socket para o frontend.
   */
  async handleConnected(
    whatsappId: string,
    tenantId: number,
    phoneInfo: any,
    sessionName: string
  ): Promise<void> {
    const updatedWhatsapp = await this.whatsappRepository.updateScoped(
      whatsappId,
      tenantId,
      {
        status: "CONNECTED",
        qrcode: "",
        retries: 0,
        phone: phoneInfo,
        session: sessionName,
        pairingCode: "",
      }
    );
    this.emitSessionUpdate(tenantId, updatedWhatsapp);
    this.emitSessionReady(tenantId, updatedWhatsapp);
  }
  /**
   * Atualiza o estado de uma sessão para 'DISCONNECTED' e limpa os dados da sessão.
   * Emite um evento de socket para notificar o frontend.
   */
  async handleDisconnected(
    whatsappId: string,
    tenantId: number
  ): Promise<void> {
    const updatedWhatsapp = await this.whatsappRepository.updateScoped(
      whatsappId,
      tenantId,
      {
        status: "DISCONNECTED",
        qrcode: "",
        session: "",
        pairingCode: "",
        phone: Prisma.JsonNull, // Limpa o campo JSON
      }
    );
    this.emitSessionUpdate(tenantId, updatedWhatsapp);
  }
  /**
   * Atualiza o código de pareamento (Pairing Code).
   */
  async handlePairingCode(
    whatsappId: string,
    tenantId: number,
    pairingCode: string
  ): Promise<void> {
    const updatedWhatsapp = await this.whatsappRepository.updateScoped(
      whatsappId,
      tenantId,
      {
        pairingCode,
        status: "qrcode", // O status também muda para qrcode neste caso
      }
    );
    this.emitSessionUpdate(tenantId, updatedWhatsapp);
  }
  // Métodos privados para emitir eventos, evitando repetição
  private emitSessionUpdate(tenantId: number, session: Whatsapp): void {
    const io = getIO();
    io.to(String(tenantId)).emit(`${tenantId}:whatsappSession`, {
      action: "update",
      session,
    });
  }
  private emitSessionReady(tenantId: number, session: Whatsapp): void {
    const io = getIO();
    io.to(String(tenantId)).emit(`${tenantId}:whatsappSession`, {
      action: "readySession",
      session,
    });
  }
}

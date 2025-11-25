import { Message, Prisma } from "@prisma/client";

import { encrypt, decrypt, isEncrypted } from "../../lib/crypto";
import { MessageRepository, ResponseMessages } from "./message.repository";
import { MessageDTO, RequestMessage } from "./message.type";
import { PaginationOptions } from "../users/users.repository";
import { pupa } from "../../ultis/pupa";
import { detectMediaType } from "../../ultis/detectMediaType";
import socketEmit from "../../api/helpers/socketEmit";
import SendMessageSystemProxy from "../../api/helpers/SendMessageSystemProxy";
import { AppError } from "../../errors/errors.helper";
import { getFastifyApp } from "../../api";
import { SendMessageForward } from "../../api/helpers/SendMessageForward";
import { MediaService } from "../../api/helpers/MediaService";
import { SendMessageReaction } from "../../api/helpers/SendMessageReaction";

export class MessageService {
  private messageRepository: MessageRepository;
  /**
   * Construtor da classe MessageService.
   * Inicializa o repositório de mensagens.
   */
  constructor() {
    this.messageRepository = new MessageRepository();
  }
  /**
   * Cria uma nova mensagem, aplicando a criptografia antes de salvar.
   *
   * @param {MessageDTO} dto - O objeto de transferência de dados (DTO) da mensagem.
   * @returns {Promise<Message>} A mensagem recém-criada.
   */
  async createMessage(dto: MessageDTO): Promise<Message> {
    // --- LÓGICA DO HOOK 'beforeCreate' ---
    let bodyToSave = dto.body.trim();
    if (bodyToSave === "") {
      bodyToSave = "Bot message - sem conteudo";
    }

    // Criptografa o corpo da mensagem se ainda não estiver criptografado.
    if (!isEncrypted(bodyToSave)) {
      bodyToSave = encrypt(bodyToSave);
    }
    const { ticketId, tenantId, contactId, ...restDto } = dto;

    const dataForDb = {
      ...restDto,
      body: bodyToSave,
      ticket: { connect: { id: ticketId as number } },
      contact: { connect: { id: contactId as number } },
      tenant: { connect: { id: tenantId as number } },
    };

    const updateInput: Prisma.MessageUpdateInput = {};

    const newMessage = await this.messageRepository.findOrCreateAndReload(
      { messageId: dto.messageId, tenantId: tenantId },
      dataForDb,
      updateInput
    );
    socketEmit({
      tenantId,
      type: "chat:create",
      payload: newMessage,
    });
    return newMessage;
  }

  /**
   * Busca uma mensagem pelo ID e a retorna com o corpo descriptografado
   * e a URL da mídia completa.
   *
   * @param {string} id - O ID da mensagem a ser buscada.
   * @returns {Promise<Message | null>} A mensagem processada ou `null` se não for encontrada.
   */
  async findByIdAndProcess(id: string): Promise<Message | null> {
    const message = await this.messageRepository.findMessageBy({ id });

    if (!message) {
      return null;
    }

    // --- LÓGICA DO GETTER 'mediaUrl' E DESCRIPTOGRAFIA ---

    // Descriptografa o corpo da mensagem
    const decryptedBody = decrypt(message.body);

    // Monta a URL completa da mídia
    let fullMediaUrl: string | null = null;
    if (message.mediaUrl) {
      const { BACKEND_URL, PROXY_PORT } = process.env;
      fullMediaUrl =
        process.env.NODE_ENV === "development" && PROXY_PORT
          ? `${BACKEND_URL}:${PROXY_PORT}/public/${message.mediaUrl}`
          : `${BACKEND_URL}/public/${message.mediaUrl}`;
    }

    return {
      ...message,
      body: decryptedBody,
      mediaUrl: fullMediaUrl,
    };
  }

  /**
   * Busca todas as mensagens de um ticket com opções de paginação.
   *
   * @param {Prisma.MessageWhereInput} where - Condições de filtro para a busca.
   * @param {PaginationOptions} [options] - Opções de paginação (limite, página).
   * @returns {Promise<ResponseMessages>} Um objeto contendo a lista de mensagens, a contagem total e se há mais mensagens.
   */
  async findAllMessageTicket(
    where: Prisma.MessageWhereInput,
    options?: PaginationOptions
  ): Promise<ResponseMessages> {
    const { messages, count, hasMore } =
      await this.messageRepository.findAllMessageTicket(where, options);

    return {
      count,
      hasMore,
      messages,
    };
  }

  /**
   * Busca uma única mensagem com base nas condições fornecidas.
   *
   * @param {Prisma.MessageWhereInput} where - Condições de filtro para a busca.
   * @returns {Promise<Message | null>} A mensagem encontrada ou `null` se não for encontrada.
   */
  async findMessageBy(
    where: Prisma.MessageWhereInput
  ): Promise<Message | null> {
    return await this.messageRepository.findMessageBy(where);
  }

  /**
   * Cria e envia uma mensagem de sistema (geralmente do bot) para um ticket.
   * Lida com a descriptografia, construção do corpo da mensagem (se for um template),
   * envio de mídia e persistência no banco de dados.
   *
   * @param {RequestMessage} params - Parâmetros da requisição da mensagem.
   * @param {Message} params.message - O objeto da mensagem a ser enviada.
   * @param {string} params.status - O status da mensagem.
   * @param {number} params.tenantId - O ID do tenant.
   * @param {Ticket} params.ticket - O objeto do ticket.
   * @param {any[]} [params.filesArray] - Array de arquivos de mídia a serem enviados.
   * @returns {Promise<void>}
   */
  async createMessageSystem({
    message,
    status,
    tenantId,
    ticket,
    filesArray,
  }: RequestMessage) {
    const decryptedMessage = decrypt(message.body);

    const messageData = {
      ticketId: ticket.id,
      body: decryptedMessage,
      contactId: ticket.contactId,
      fromMe: message.fromMe,
      read: true,
      sendType: "chat",
      mediaType: "chat",
      mediaUrl: "",
      mediaName: undefined,
      timestamp: Date.now(),
      quotedMsgId: message.quotedMsg?.messageId,
      quotedMsg: message.quotedMsg,
      scheduleDate: message.scheduleDate,
      status,
      tenantId,
      idFront: message.idFront,
      buffer: undefined,
    };

    if (decryptedMessage && !Array.isArray(decryptedMessage)) {
      messageData.body = this.buildMessageBody(decryptedMessage, ticket);
    }
    await Promise.all(
      (filesArray && filesArray.length ? filesArray : [null]).map(
        async (media) => {
          if (media) {
            messageData.mediaType = detectMediaType(media.mimetype);
            messageData.mediaName = media.filename;
            messageData.buffer = media.buffer;
            messageData.mediaUrl = await MediaService(media);
          }
          const {
            ticketId,
            contactId,
            tenantId,
            quotedMsg,
            quotedMsgId,
            ...restDto
          } = messageData;

          const messageSent = await SendMessageSystemProxy({
            ticket,
            messageData,
            media,
          });

          const dataForDb: any = {
            ...restDto,
            id: String(messageSent.id),
            ack: 2,
            messageId: String(messageSent.messageId),
            body: encrypt(messageData.body),
          };
          if (messageData.ticketId) {
            dataForDb.ticket = {
              connect: { id: messageData.ticketId as number },
            };
          }
          if (messageData.contactId) {
            dataForDb.contact = {
              connect: { id: messageData.contactId as number },
            };
          }
          if (messageData.tenantId) {
            dataForDb.tenant = {
              connect: { id: messageData.tenantId as number },
            };
          }
          if (messageData.quotedMsgId) {
            dataForDb.quotedMsg = {
              connect: { id: String(messageData.quotedMsgId) },
            };
          }

          const messagePending =
            await this.messageRepository.findOrCreateAndReload(
              { messageId: String(messageSent.id), tenantId: ticket.tenantId },
              dataForDb,
              {}
            );
          const messageToSocket = {
            ...messagePending,
            ticket: { id: messagePending.ticket!.id },
            contact: messagePending.contact!.id,
          };

          socketEmit({
            tenantId,
            type: "chat:create",
            payload: messageToSocket,
          });
        }
      )
    );
  }

  /**
   * Encaminha uma mensagem de um ticket de origem para um novo ticket (ou um existente)
   * com um contato específico.
   *
   * @param {object} params - Parâmetros para o encaminhamento da mensagem.
   * @param {number} params.userId - O ID do usuário que está realizando o encaminhamento.
   * @param {number} params.tenantId - O ID do tenant.
   * @param {any} params.message - O objeto da mensagem a ser encaminhada.
   * @param {any} params.contact - O objeto do contato para o qual a mensagem será encaminhada.
   * @param {number} params.ticketIdOrigin - O ID do ticket de origem.
   * @returns {Promise<void>}
   */
  async createForwardMessageService({
    userId,
    tenantId,
    message,
    contact,
    ticketIdOrigin,
  }: {
    userId: number;
    tenantId: number;
    message: any;
    contact: any;
    ticketIdOrigin: number;
  }): Promise<void> {
    const ticketService = getFastifyApp().services.ticketService;

    const ticket = await ticketService.findOrCreateTicketForward(
      parseInt(contact.id),
      {
        contact: contact,
        status: "open",
        isGroup: contact.isGroup,
        userId,
        tenantId,
        unreadMessages: 0,
        whatsappId: message.ticket.whatsappId,
        lastMessage:
          decrypt(message.body).length > 255
            ? decrypt(message.body).slice(0, 252) + "..."
            : decrypt(message.body),
        lastMessageAt: new Date().getTime(),
        answered: true,
      }
    );

    const messageForward = await SendMessageForward({
      ticket,
      messageData: message,
      ticketIdOrigin,
    });
    console.log(ticketIdOrigin);
  }

  /**
   * Atualiza uma mensagem existente pelo seu ID.
   *
   * @param {string} messageId - O ID da mensagem a ser atualizada.
   * @param {any} data - Os dados a serem atualizados.
   * @returns {Promise<Message>} A mensagem atualizada.
   */
  async updateMessageById(messageId: string, data: any): Promise<Message> {
    return await this.messageRepository.updateMessage(messageId, data);
  }

  /**
   * Envia uma reação a uma mensagem e atualiza o registro no banco de dados.
   *
   * @param {string} messageid - O ID da mensagem à qual a reação será aplicada.
   * @param {string} reaction - O emoji ou string da reação.
   * @returns {Promise<void>}
   * @throws {AppError} Se a mensagem não for encontrada ou se houver um erro ao enviar a reação.
   */
  async udpateMessageReaction(
    messageid: string,
    reaction: string
  ): Promise<void> {
    const message = (await this.messageRepository.findMessageBy(
      {
        messageId: messageid,
      },
      {
        contact: {
          select: { id: true, name: true, telegramId: true },
        },
        ticket: {
          select: { id: true, channel: true, whatsappId: true },
        },
      }
    )) as any;

    if (!message) throw new AppError("ERR_SENDING_REACTION_MSG_NO_FOUND", 404);

    const messageForUpdate = await SendMessageReaction(message, reaction);

    if (!messageForUpdate) throw new AppError("ERR_SENDING_REACTION_MSG", 404);

    const messageToSocket = await this.messageRepository.updateMessage(
      message.messageId,
      messageForUpdate
    );

    socketEmit({
      tenantId: message.tenantId,
      type: "chat:update",
      payload: messageToSocket,
    });
  }

  /**
   * Constrói o corpo da mensagem a partir de um template, substituindo placeholders
   * com dados do ticket (contato e usuário).
   *
   * @private
   * @param {string} template - O template da mensagem com placeholders.
   * @param {any} ticket - O objeto do ticket contendo dados do contato e do usuário.
   * @returns {string} O corpo da mensagem com os placeholders substituídos.
   */
  private buildMessageBody = (template: string, ticket: any): string => {
    return pupa(template || "", {
      name: ticket?.contact?.name ?? "",
      email: ticket?.contact?.email ?? "",
      phoneNumber: ticket?.contact?.number ?? "",
      user: ticket?.user?.name ?? "",
      userEmail: ticket?.user?.email ?? "",
    });
  };
}

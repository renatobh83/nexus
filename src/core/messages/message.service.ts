import { enum_Messages_sendType, Message, Prisma } from "@prisma/client";

import { encrypt, decrypt, isEncrypted } from "../../lib/crypto";
import { MessageRepository, ResponseMessages } from "./message.repository";
import { MessageDTO, RequestMessage } from "./message.type";
import { PaginationOptions } from "../users/users.repository";
import { detectMediaType } from "../../ultis/detectMediaType";
import socketEmit from "../../api/helpers/socketEmit";
import SendMessageSystemProxy from "../../api/helpers/SendMessageSystemProxy";
import { AppError } from "../../errors/errors.helper";
import { getFastifyApp } from "../../api";
import { SendMessageForward } from "../../api/helpers/SendMessageForward";
import { MediaService } from "../../api/helpers/MediaService";
import { SendMessageReaction } from "../../api/helpers/SendMessageReaction";
import { buildMessageBody } from "./message.utils";
import { eventBus } from "../../ultis/eventBus";

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

    const { ticketId, tenantId, contactId, id, messageId, ...restDto } = dto;

    const dataForDb: any = {
      ...restDto,
      messageId,
      body: bodyToSave,
      ticket: { connect: { id: ticketId as number } },
      tenant: { connect: { id: tenantId as number } },
    };
    if (contactId) {
      dataForDb.contact = {
        connect: { id: contactId as number },
      };
    }

    const forUpdated = await this.messageRepository.findMessageBy({
      messageId: messageId,
    });

    let savedMessage;

    if (forUpdated) {
      const updateInput: Prisma.MessageUpdateInput = {
        ...dataForDb,
      };
      savedMessage = await this.messageRepository.updateMessage(
        dto.messageId,
        updateInput
      );
    } else {
      savedMessage = await this.messageRepository.create(dataForDb);
    }

    let fullMediaUrl: string | null = null;
    if (savedMessage.mediaUrl) {
      const { MEDIA_URL, PROXY_PORT } = process.env;
      fullMediaUrl =
        process.env.NODE_ENV === "development" && PROXY_PORT
          ? `${MEDIA_URL}:${PROXY_PORT}/public/${savedMessage.mediaUrl}`
          : `${MEDIA_URL}/public/${savedMessage.mediaUrl}`;
    }
    const message = {
      ...savedMessage,
      mediaUrl: fullMediaUrl,
    };
  // eventBus.emit(`messageSaved:${savedMessage.messageId}`, message);
    socketEmit({
      tenantId,
      type: "chat:create",
      payload: message,
    });
    return message;
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
      const { MEDIA_URL, PROXY_PORT } = process.env;
      fullMediaUrl =
        process.env.NODE_ENV === "development" && PROXY_PORT
          ? `${MEDIA_URL}:${PROXY_PORT}/public/${message.mediaUrl}`
          : `${MEDIA_URL}/public/${message.mediaUrl}`;
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
    where: Prisma.MessageWhereInput,
    include?: Prisma.MessageInclude
  ): Promise<Message | null> {
    return await this.messageRepository.findMessageBy(where, include);
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
  }: RequestMessage): Promise<void> {
    const decryptedMessage = decrypt(message.body);

    const messageData = {
      ticketId: ticket.id,
      body: decryptedMessage,
      contactId: ticket.contactId,
      fromMe:
        typeof message.fromMe === "string"
          ? message.fromMe.toLowerCase() === "true"
          : Boolean(message.fromMe),
      read: true,
      sendType: "chat" as enum_Messages_sendType,
      mediaType: "chat",
      mediaUrl: "",
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
      messageData.body = buildMessageBody(decryptedMessage, ticket);
    }
    await Promise.all(
      (filesArray && filesArray.length ? filesArray : [null]).map(
        async (media) => {
          if (media) {
            messageData.mediaType = detectMediaType(media.mimetype);
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
        //  if (ticket.channel === "whatsapp") return;

          const dataForDb: any = {
            ...restDto,
            id: String(messageSent.id),
            ack: 2,
            messageId: String(messageSent.id),
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

          const forUpdated = await this.messageRepository.findMessageBy({
            messageId: dataForDb.messageId,
          });

          let savedMessage;

          if (forUpdated) {
            const updateInput: Prisma.MessageUpdateInput = {
              ...dataForDb,
            };
            savedMessage = await this.messageRepository.updateMessage(
              dataForDb.messageId,
              updateInput
            );
          } else {
            savedMessage = await this.messageRepository.create(dataForDb);
          }

          let fullMediaUrl: string | null = null;
          if (savedMessage.mediaUrl) {
            const { MEDIA_URL, PROXY_PORT } = process.env;
            fullMediaUrl =
              process.env.NODE_ENV === "development" && PROXY_PORT
                ? `${MEDIA_URL}:${PROXY_PORT}/public/${savedMessage.mediaUrl}`
                : `${MEDIA_URL}/public/${savedMessage.mediaUrl}`;
          }

          const messageToSocket = {
            ...savedMessage,
            mediaUrl: fullMediaUrl,
            ticket: { id: savedMessage.ticket!.id },
            contact: savedMessage.contact!.id,
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
        id: messageid,
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

  async findByMessageId(messageId: string) {
    return this.messageRepository.findMessageBy({ messageId });
  }
}

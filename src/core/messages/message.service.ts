import { Readable } from "node:stream";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Message, Prisma, Ticket } from "@prisma/client";

import { encrypt, decrypt, isEncrypted } from "../../lib/crypto"; // Importa as funções
import { MessageRepository, ResponseMessages } from "./message.repository";
import { MessageDTO, RequestMessage } from "./message.type";
import { PaginationOptions } from "../users/users.repository";
import CryptoJS from "crypto-js";
import { pupa } from "../../ultis/pupa";
import { detectMediaType } from "../../ultis/detectMediaType";
import socketEmit from "../../api/helpers/socketEmit";
import SendMessageSystemProxy from "../../api/helpers/SendMessageSystemProxy";
import { AppError } from "../../errors/errors.helper";
import { getWbot } from "../../lib/wbot";
import { getTbot } from "../../lib/tbot";
import { TelegramEmoji } from "telegraf/typings/core/types/typegram";
import { getFastifyApp } from "../../api";
import { SendMessageForward } from "../../api/helpers/SendMessageForward";
import { MediaService } from "../../api/helpers/MediaService";
import { SendMessageReaction } from "../../api/helpers/SendMessageReaction";

export class MessageService {
  private messageRepository: MessageRepository;


  constructor() {
    this.messageRepository = new MessageRepository();
  }

  /**
   * Cria uma nova mensagem, aplicando a criptografia antes de salvar.
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
      ticket: { connect: { id: dto.ticketId as number } },
      contact: { connect: { id: dto.contactId as number } },
      tenant: { connect: { id: dto.tenantId as number } },
    };

    const updateInput: Prisma.MessageUpdateInput = {};

    const newMessage = await this.messageRepository.findOrCreateAndReload(
      { messageId: dto.messageId!, tenantId: dto.tenantId! },
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

    // Retorna uma cópia do objeto da mensagem com os campos processados
    return {
      ...message,
      body: decryptedBody,
      mediaUrl: fullMediaUrl,
    };
  }
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

  async findMessageBy(
    where: Prisma.MessageWhereInput
  ): Promise<Message | null> {
    return await this.messageRepository.findMessageBy(where);
  }

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
  async createForwardMessageService({
    userId,
    tenantId,
    message,
    contact,
    ticketIdOrigin,
  }) {

    const ticketService = getFastifyApp().services.ticketService;

    const ticket = await ticketService.findOrCreateTicketForward(parseInt(contact.id),
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
      });


    const messageForward = await SendMessageForward({ ticket, messageData: message , ticketIdOrigin});
    console.log(ticketIdOrigin)

  }
  async updateMessageById(messageId: string, data: any) {
    return await this.messageRepository.updateMessage(messageId, data);
  }
  async udpateMessageReaction(messageid: string, reaction: string) {
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
    )) as any

    if (!message) throw new AppError("ERR_SENDING_REACTION_MSG_NO_FOUND", 404);

    const messageForUpdate = await SendMessageReaction(message, reaction)

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

  private buildMessageBody = (template: string, ticket: any) => {
    return pupa(template || "", {
      name: ticket?.contact?.name ?? "",
      email: ticket?.contact?.email ?? "",
      phoneNumber: ticket?.contact?.number ?? "",
      user: ticket?.user?.name ?? "",
      userEmail: ticket?.user?.email ?? "",
    });
  };
}

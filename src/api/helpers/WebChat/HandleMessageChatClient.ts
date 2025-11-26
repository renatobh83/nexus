import { v4 as uuidV4 } from "uuid";
import { AppError } from "../../../errors/errors.helper";
import { findOrCreateTicketSafe } from "../CreateTicketSafe";
import socketEmit from "../socketEmit";
import VerifyBusinessHoursFlow from "../VerifyBusinessHoursFlow";
import { getFastifyApp } from "../..";
import {
  MessageSendType,
  MessageStatus,
} from "../../../core/messages/message.type";
import { VerifyMessageChatClient } from "./VerifyMessageChatClient";
import { VerifyMessageMediaChatClient } from "./VerifyMessageMediaChatClient";
import { decrypt } from "../../../lib/crypto";
import { getFullMediaUrl } from "../../../ultis/getFullMediaUrl";

export const HandleMessageChatClient = async (socket: any) => {
  const { id } = socket;
  const { auth } = socket.handshake;
  const services = getFastifyApp().services;

  try {
    const channel = await services.whatsappService.findWhere({
      type: "web",
    });
    if (!channel) {
      throw new AppError("CHANNEL_NO_FOUND", 404);
    }
    const contact = await services.contatoService.findOrCreate(
      { email: auth.email },
      {
        name: auth.name,
        email: auth.email,
        isWAContact: false,
        pushname: auth.name,
        isGroup: false,
        isUser: true,
      }
    );
    const { ticket, isNew } = await findOrCreateTicketSafe({
      contact,
      whatsappId: channel.id,
      unreadMessages: 0,
      groupContact: false,
      tenantId: channel.tenantId,
      channel: channel.type,
      empresaId: parseInt(auth.empresaId),
      socketId: id,
    });
    if (isNew) {
      await services.logTicketService.createLogTicket({
        ticketId: ticket.id,
        chamadoId: null,
        queueId: null,
        userId: null,
        tenantId: auth.tenantId,
        type: "create",
      });
      socketEmit({
        tenantId: channel.tenantId,
        type: "ticket:create",
        payload: ticket,
      });
    }
    await services.ticketService.updateTicket(ticket.id, { socketId: id });
    socketEmit({
      tenantId: channel.tenantId,
      type: "ticket:update",
      payload: ticket,
    });
    socket.emit("chat:ready", { ticketId: ticket.id });
    socket.join(`chat-${id}`);
    if (isNew) {
      const isBusinessHours = await VerifyBusinessHoursFlow(ticket);
      if (isBusinessHours) {
        await services.messageService.createMessageSystem({
          message: {
            body: "👋 Oi! Que bom ter você por aqui. Em instantes, um de nossos atendentes vai te responder. Fique à vontade para enviar sua mensagem!",
            fromMe: true,
            sendType: "bot",
            read: true,
          },
          tenantId: ticket.tenantId,
          ticket,
          status: "pending",
        });
      } else {
        setTimeout(
          () =>
            socket.emit(
              "chat:closedTicket",
              "Seu ticket foi fechado. Obrigado!"
            ),
          20_000
        );
        const ticketUp = await services.ticketService.updateTicket(ticket.id, {
          status: "closed",
          lastMessage: "Fora do horario de atendimento",
          closedAt: new Date().getTime(),
        });
        socketEmit({
          tenantId: ticket.tenantId,
          type: "ticket:update",
          payload: ticketUp,
        });
      }
      socket.emit("chat:boasVindas");
    } else {
      socket.on("chat:getMessages", async (value: { offset: any }) => {
        const { offset } = value;
        const Oldmessages = await services.messageService.findAllMessageTicket(
          {
            ticketid: ticket.id,
          },
          {
            skip: offset,
            limit: 50,
          }
        );

        socket.emit(
          "chat:previousMessages",
          Oldmessages.messages
            .map((message) => {
              return {
                ...message,
                body: decrypt(message.body),
                mediaUrl: getFullMediaUrl(message.mediaUrl),
              };
            })
            .reverse()
        );
      });
    }
    socket.on("chat:message", async (msg: any) => {
      await VerifyMessageChatClient(msg, ticket);
    });
    socket.on("chat:image", async (media: any) => {
      await VerifyMessageMediaChatClient(media, ticket);
    });
  } catch (error) {
    console.log(error, "in handle chat client");
  }
};

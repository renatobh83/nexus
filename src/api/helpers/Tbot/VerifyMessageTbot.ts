import { Contact, Ticket } from "@prisma/client";
import { Context } from "telegraf";
import { AppServices } from "../../plugins/di-container";
import {
  MessageSendType,
  MessageStatus,
} from "../../../core/messages/message.type";
import { v4 as uuidV4 } from "uuid";
import { getIO } from "../../../lib/socket";
import socketEmit from "../socketEmit";

export const VerifyMessageTbot = async (
  ctx: Context | any,
  fromMe: boolean,
  ticket: Ticket,
  contact: Contact,
  app: AppServices
): Promise<void> => {
  let message;
  let updateMessage: any = {};

  message = ctx?.message || ctx.update.callback_query.message;
  updateMessage = ctx?.update;

  if (!message && updateMessage) {
    message = updateMessage?.edited_message;
  }

  let quotedMsgId;
  if (message?.reply_to_message?.message_id) {
    const messageQuoted = await app.messageService.findMessageBy({
      messageId: message.reply_to_message.message_id,
      tenantId: ticket.tenantId,
    });
    quotedMsgId = messageQuoted?.id || undefined;
  }

  const messageData = {
    id: String(message?.message_id),
    messageId: String(message?.message_id),
    ticketId: ticket.id,
    tenantId: ticket.tenantId,
    contactId: fromMe ? null : contact.id,
    body: ctx.update.callback_query
      ? ctx.update.callback_query.data
      : message.text,
    fromMe,
    read: fromMe,
    sendType: "chat" as MessageSendType,
    quotedMsgId,
    mediaType: "chat",
    timestamp: +message.date * 1000,
    status: "received" as MessageStatus,
    ack: 2,
    idFront: uuidV4(),
  };

  const updatedTicket = await app.ticketService.updateTicket(ticket.id, {
    lastMessage: reduzirString(message.text),
    lastMessageAt: new Date().getTime(),
    answered: fromMe || false,
  });
  //    VER SE NESSE PONTO VALE ENVIAR UM UPDATE NO TICKET PARA A BARRA ATUALIZAR O LASTMESSAG
  //   socketEmit({
  //     tenantId: ticket.tenantId,
  //     type: "ticket:update",
  //     payload: updatedTicket,
  //   });

  await app.messageService.createMessage(messageData);
};

function reduzirString(mensagem: any) {
  mensagem = String(mensagem); // Garantindo que seja uma string
  return mensagem.length > 255 ? mensagem.slice(0, 200) + "..." : mensagem;
}

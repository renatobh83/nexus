import { enum_Messages_sendType, Ticket } from "@prisma/client";
import { Contact } from "wbotconnect";
import { v4 as uuidV4 } from "uuid";
import VerifyQuotedMessage from "./VerifyQuotedMessage";
import { getFastifyApp } from "../..";
import socketEmit from "../socketEmit";
import { MessageDTO, MessageStatus } from "../../../core/messages/message.type";

const VerifyMessage = async (
  msg: any,
  ticket: Ticket,
  contact: Contact,
  authorGroupMessage?: number
) => {
  const app = getFastifyApp().services;
  // Definir o contactId de forma clara
  let contactId: number | undefined;

  if (msg.isGroupMsg) {
    if (msg.fromMe) {
      contactId = parseInt(contact.id, 10);
    } else {
      contactId = authorGroupMessage ? authorGroupMessage : undefined;
    }
  } else {
    contactId = msg.fromMe ? parseInt(contact.id) : parseInt(contact.id);
  }

  const body = msg.type === "list" ? msg.list.description : msg.content;
  // TODO ver essa parte
  // const quotedMsg = await VerifyQuotedMessage(msg);

  const messageData: MessageDTO = {
    id: msg.id,
    messageId: msg.id,
    ticketId: ticket.id,
    contactId: contactId!,
    ack: 2,
    fromMe: msg.fromMe,
    timestamp: msg.timestamp,
    body,
    mediaType: msg.type,
    read: msg.fromMe,
    quotedMsgId: undefined, //quotedMsg?.messageId,
    status: msg.fromMe
      ? ("sended" as MessageStatus)
      : ("received" as MessageStatus),
    tenantId: ticket.tenantId,
    sendType: "chat" as enum_Messages_sendType,
    idFront: uuidV4(),
  };

  await app.messageService.createMessage(messageData);

  // // Normalizar lastMessage
  let lastMessage: string;
  if (msg.type === "list") {
    lastMessage = "Atendimento Bot";
  } else {
    lastMessage =
      msg.content.length > 255
        ? msg.content.slice(0, 252) + "..."
        : msg.content;
  }

  const updatedTicket = await app.ticketService.updateTicket(ticket.id, {
    lastMessage: lastMessage,
    lastMessageAt: new Date().getTime(),
    answered: !!msg.fromMe,
  });

  //    VER SE NESSE PONTO VALE ENVIAR UM UPDATE NO TICKET PARA A BARRA ATUALIZAR O LASTMESSAG
  socketEmit({
    tenantId: ticket.tenantId,
    type: "ticket:update",
    payload: updatedTicket,
  });
  // await ticket.update({
  //   lastMessage,
  //   lastMessageAt: Date.now(),
  //   answered: !!msg.fromMe,
  // });
};

export default VerifyMessage;

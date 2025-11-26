import { Ticket } from "@prisma/client";
import socketEmit from "../../helpers/socketEmit";
import { v4 as uuidV4 } from "uuid";

import { getFastifyApp } from "../..";
import { getIO } from "../../../lib/socket";

export const SendMessageChatClient = async (
  messageData: any,
  ticket: Ticket
) => {
  const io = getIO();
  const socket = io.sockets.sockets.get(ticket.socketId!);

  if (socket && socket.connected) {
    socket.emit("chat:reply", messageData.body);

    await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
      lastMessage:
        messageData.body.length > 255
          ? messageData.body.slice(0, 252) + "..."
          : messageData.body,
      lastMessageAt: new Date().getTime(),
    });
  } else {
    socketEmit({
      tenantId: ticket.tenantId,
      type: "ChatClientDesconectado",
      payload: ticket,
    });
  }

  return {
    id: uuidV4(),
    ...messageData,
    messageId: uuidV4(),
    idFront: uuidV4(),
    mediaUrl: null,
  };
};

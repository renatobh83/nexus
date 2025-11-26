import { Ticket } from "@prisma/client";
import socketEmit from "../../helpers/socketEmit";
import { v4 as uuidV4 } from "uuid";
import { getFastifyApp } from "../..";
import { getIO } from "../../../lib/socket";

export const SendMessageMediaChatClient = async (
  media: any,
  ticket: Ticket
) => {
  const io = getIO();
  const socket = io.sockets.sockets.get(ticket.socketId!);

  const link = `${process.env.MEDIA_URL}/public/${media.filename}`;

  if (socket && socket.connected) {
    socket.emit("chat:image", { url: link });
    await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
      lastMessage:
        media.filename.length > 255
          ? media.filename.slice(0, 252) + "..."
          : media.filename,
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
    messageId: uuidV4(),
    idFront: uuidV4(),
    mediaType: "image",
    mediaUrl: media.filename,
  };
};

import { getFastifyApp } from "../..";
import socketEmit from "../socketEmit";

export async function HandleMsgReaction(msg: any) {
  try {
    const MessageService = getFastifyApp().services.messageService;
    const messageToUpdate = await MessageService.findByMessageId(
      msg.msgId._serialized
    );

    if (messageToUpdate) {
      const updateData = msg.id.fromMe
        ? { reactionFromMe: msg.reactionText }
        : { reaction: msg.reactionText };

      const socket = await MessageService.updateMessageById(
        msg.msgId._serialized,
        updateData
      );

      socketEmit({
        tenantId: socket.tenantId!,
        type: "chat:update",
        payload: socket,
      });
    }
  } catch (_error) {}
}

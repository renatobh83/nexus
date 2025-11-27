import { Telegraf } from "telegraf";
import socketEmit from "../socketEmit";
import { getTbot } from "../../../lib/tbot";
import { logger } from "../../../ultis/logger";
import { getFastifyApp } from "../..";

interface Session extends Telegraf {
  id: number;
}
export const HandleReactionTelegram = async (
  ctx: any,
  tbot: Session
): Promise<void> => {
  const channel = getTbot(tbot.id);
  if (!channel) {
    logger.error(`[Telegram] Canal ${tbot.id} não encontrado.`);
    return;
  }
  const me = ctx.telegram.getMe();
  const fromMe =
    me.id ===
    (ctx.message?.from?.id ||
      ctx.update?.callback_query?.from?.id ||
      ctx.update?.edited_message?.from?.id);

  const messageReaction = ctx.update.message_reaction;
  const messageToUpdate =
    await getFastifyApp().services.messageService.findMessageBy({
      messageId: String(messageReaction.message_id),
    });

  if (messageToUpdate) {
    // 💡 Captura as reações antigas e novas
    const newEmoji = messageReaction.new_reaction?.[0]?.emoji || null;
    const oldEmoji = messageReaction.old_reaction?.[0]?.emoji || null;

    // 💬 Decide o que atualizar
    let updateData: any = {};

    if (fromMe) {
      if (newEmoji) {
        updateData = { reactionFromMe: newEmoji }; // adicionou reação
      } else if (oldEmoji) {
        updateData = { reactionFromMe: null }; // removeu reação
      }
    } else {
      if (newEmoji) {
        updateData = { reaction: newEmoji };
      } else if (oldEmoji) {
        updateData = { reaction: null };
      }
    }
    // se não há nada para atualizar, sai
    if (Object.keys(updateData).length === 0) return;
    // await messageToUpdate.update(updateData);
    const updatedMessage =
      await getFastifyApp().services.messageService.updateMessageById(
        messageToUpdate.messageId!,
        updateData
      );

    socketEmit({
      tenantId: updatedMessage.tenantId!,
      type: "chat:update",
      payload: updatedMessage,
    });
  }
};

import { logger } from "../../../ultis/logger";
import HandleMessageTelegram from "./HandleMessageTelegram";
import { Session } from "../../../lib/tbot";
import { HandleReactionTelegram } from "./HandleReactionTelegram";
import { redisClient } from "../../../lib/redis";
import { getCache, REDIS_KEYS } from "../../../ultis/redisCache";

function escapeMarkdownV2(text: string) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\") // 1) escapa backslashes primeiro
    .replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1"); // 2) escapa todos os reservados
}
const esc = escapeMarkdownV2;

const tbotMessageListener = (tbot: Session): void => {
  tbot.on("message", async (ctx) => {
    logger.info("Message Telegram listener");

    await HandleMessageTelegram(ctx, tbot);
  });

  tbot.on("message_reaction", async (ctx: any) => {
    await HandleReactionTelegram(ctx, tbot);
    // console.log(`Received a reaction on message ${JSON.stringify(messageId, null,2)} in chat ${chatId}`);
  });

  tbot.on("callback_query", async (ctx: any) => {
    const data = ctx.update.callback_query.data;
    // TODO Completar Codigo

    if (data.startsWith("selecEmpresa_")) {
      const empresaId = parseInt(data.split("_")[1]);
      const unidadesRedis = await getCache(REDIS_KEYS.unidades()) as any


      const empresa = unidadesRedis.find(
        (e: { cd_empresa: number }) => e.cd_empresa === empresaId
      );

      if (!empresa) {
        await ctx.reply("❌ Empresa não encontrada.");
        return;
      }
      const mensagem =
        `🏢 *${esc(empresa.ds_empresa)}*` +
        "\n" +
        `📍 Local: ${esc(empresa.ds_endereco || "Endereço não informado")}` +
        "\n" +
        `⏰ Atendimento: ${esc(
          empresa.ds_horario || "Horário não informado"
        )}` +
        "\n" +
        `📞 Contato: ${esc(empresa.nr_telefone || "Não informado")}`;
      await ctx.telegram.sendMessage(ctx.chat.id, mensagem, {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Agendar Atendimento",
                callback_data: `empresa_${empresa.cd_empresa}`,
              },
            ],
            [{ text: "⬅️ Voltar", callback_data: "voltar_unidades" }],
          ],
        },
      });
      return;
    }

    ctx.reply(" 🤖 Só um momento que estamos processando a sua solicitação!");

    await HandleMessageTelegram(ctx, tbot);
  });

  tbot.on("edited_message", async (ctx) => {
    // await HandleMessageTelegram(ctx, tbot);
  });
};

export { tbotMessageListener };

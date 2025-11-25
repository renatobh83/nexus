import { Message, Prisma } from "@prisma/client";
import { TelegramEmoji } from "telegraf/typings/core/types/typegram";
import { getTbot } from "../../lib/tbot";
import { getWbot } from "../../lib/wbot";
import socketEmit from "./socketEmit";

const VALID_REACTIONS_TBOT = [
    "👍",
    "👎",
    "❤",
    "🔥",
    "🥰",
    "👏",
    "😁",
    "🤔",
    "🤯",
    "😱",
    "🤬",
    "😢",
    "🎉",
    "🤩",
    "🤮",
    "💩",
    "🙏",
    "👌",
    "🕊",
    "🤡",
    "🥱",
    "🥴",
    "😍",
    "🐳",
    "❤‍🔥",
    "🌚",
    "🌭",
    "💯",
    "🤣",
    "⚡",
    "🍌",
    "🏆",
    "💔",
    "🤨",
    "😐",
    "🍓",
    "🍾",
    "💋",
    "🖕",
    "😈",
    "😴",
    "😭",
    "🤓",
    "👻",
    "👨‍💻",
    "👀",
    "🎃",
    "🙈",
    "😇",
    "😨",
    "🤝",
    "✍",
    "🤗",
    "🫡",
    "🎅",
    "🎄",
    "☃",
    "💅",
    "🤪",
    "🗿",
    "🆒",
    "💘",
    "🙉",
    "🦄",
    "😘",
    "💊",
    "🙊",
    "😎",
    "👾",
    "🤷‍♂",
    "🤷",
    "🤷‍♀",
    "😡",
];
export const SendMessageReaction = async (message: any, reaction: string): Promise<{ reactionFromMe: string } | void > => {
   
    if (message.ticket.channel === "whatsapp") {
        const wbot = getWbot(message.ticket.whatsappId);
        await wbot.sendReactionToMessage(message.messageid, reaction);
    } 
    else if (message.ticket.channel === "telegram") {
        const chatId = message.contact.telegramId as string;
        const tbot = getTbot(message.ticket.whatsappId);
        
        if (!VALID_REACTIONS_TBOT.includes(reaction)) {
            console.warn(
                `Emoji ${reaction} não é suportado pelo Telegram como reação`
            );
            return
        }
        await tbot.telegram.callApi("setMessageReaction", {
            chat_id: chatId,
            message_id: +message.messageId,
            reaction: [
                { type: "emoji", emoji: reaction as unknown as TelegramEmoji },
            ],
        });
        const updateData = { reactionFromMe: reaction };
        return updateData
      
    }
}
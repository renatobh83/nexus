import { AppServices } from "../../plugins/di-container";
import { Session } from "../../../lib/tbot";
import { REDIS_KEYS } from "../../../ultis/redisCache";
import { redisClient } from "../../../lib/redis";
import { AppError } from "../../../errors/errors.helper";
import { Context } from "telegraf";



export const verifyContactTbot = async (ctx: Context, app: AppServices, tbot: Session) => {
 
  const chatInfo: any = await ctx.getChat();

  try {

    const key = REDIS_KEYS.contact(tbot.id, chatInfo.id);

    const cached = await redisClient.get(key);


     const contactData = {
    name:
      `${chatInfo.first_name} ${chatInfo.last_name}` || chatInfo.username || "",
    number: `${chatInfo.id}`,
    pushname: chatInfo.username || "",
    isUser: true,
    isWAContact: false,
    isGroup: false,
    telegramId: chatInfo.id,
  };
    if (cached) return JSON.parse(cached);
    
    const contact = await app.contatoService.findOrCreate({ telegramId: chatInfo.id }, contactData)
    if (contact) {
      await redisClient.set(key, JSON.stringify(contact), "EX", 60);
    }
    return contact
  } catch (error) {
    throw new AppError("erro create contato", 500)
  }

}
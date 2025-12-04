import { Contact as WbotContact, Message } from "wbotconnect";
import { AppError } from "../../../errors/errors.helper";
import { redisClient } from "../../../lib/redis";
import { REDIS_KEYS } from "../../../ultis/redisCache";
import { AppServices } from "../../plugins/di-container";
import { Session } from "../../../lib/wbot";

interface ContatoId {
  user: string;
  _serialized: string;
}
interface Contato extends Omit<WbotContact, "id"> {
  id: ContatoId;
}
export const verifyContactWbot = async (
  message: Message,
  app: AppServices,
  wbot: Session
) => {
  let msgContact: Contato;
  try {
    if (message.fromMe) {
      if (
        !message.mediaData &&
        message.type !== "chat" &&
        message.type !== "vcard"
      )
        return;
      msgContact = await wbot.getContact(message.to);
    } else {
      msgContact = await wbot.getContact(message.from);
    }

    const key = REDIS_KEYS.contact(wbot.id, msgContact.id._serialized);

    const cached = await redisClient.get(key);

    const contactData: any = {
      name:
        msgContact?.name ||
        msgContact?.pushname ||
        msgContact?.shortName ||
        null,
      number: msgContact.id.user.replace("55", ""),
      pushname: msgContact.pushname,
      isUser: msgContact.isUser,
      isWAContact: msgContact.isWAContact,
      isGroup: !msgContact.isUser,
      profilePicUrl: msgContact.profilePicThumbObj.eurl,
      serializednumber: msgContact.id._serialized,
    };
    if (cached) return JSON.parse(cached);

    const contact = await app.contatoService.findOrCreate(
      { serializednumber: msgContact.id._serialized },
      contactData
    );
    if (contact) {
      await redisClient.set(key, JSON.stringify(contact), "EX", 60);
    }
    return contact;
  } catch (error) {
    throw new AppError("erro create contato", 500);
  }
};

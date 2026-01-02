import { Contact as WbotContact, Message } from "wbotconnect";
import { AppError } from "../../../errors/errors.helper";
import { redisClient } from "../../../lib/redis";
import { REDIS_KEYS } from "../../../ultis/redisCache";
import { AppServices } from "../../plugins/di-container";
import { Session } from "../../../lib/wbot";

export const verifyContactWbot = async (
  message: Message,
  app: AppServices,
  wbot: Session
) => {
  let msgContact: any;
  let contactId: string;
  
  try {
    if (message.fromMe) {
      if (
        !message.mediaData &&
        message.type !== "chat" &&
        message.type !== "vcard"
      )
        return;
      contactId = message.to as string;

      if (contactId.includes("@g.us")) {
        
        const dadosGrupo = await wbot.getContact(message.to)
        msgContact = {
          phoneNumber: {
            id: dadosGrupo.id.user,
            server: dadosGrupo.id.server,
            _serialized: dadosGrupo.id._serialized
          },
          contact: {
            pushname: dadosGrupo.name,
            type: 'in',
            syncToAddressbook: false,
            isContactSyncCompleted: 1
          }
        }
      } else {

        msgContact = await wbot.getPnLidEntry(contactId);
      }
    } else if (message.isGroupMsg) {

      const dadosGrupo = await wbot.getContact(message.from)
      msgContact = {
        phoneNumber: {
          id: dadosGrupo.id.user,
          server: dadosGrupo.id.server,
          _serialized: dadosGrupo.id._serialized
        },
        contact: {
          pushname: dadosGrupo.name,
          type: 'in',
          syncToAddressbook: false,
          isContactSyncCompleted: 1
        }
      }

    } else {
      contactId = message.from;
      msgContact = await wbot.getPnLidEntry(contactId);
    }


    const key = REDIS_KEYS.contact(wbot.id, msgContact.phoneNumber._serialized);
    const cached = await redisClient.get(key);
    const profilePicUrl = await wbot.getProfilePicFromServer(
      msgContact.phoneNumber._serialized
    );

    const contactData: any = {
      name:
        msgContact?.contact.name ||
        msgContact?.contact.pushname ||
        msgContact?.contact.shortName ||
        null,
      number: msgContact.phoneNumber.id.replace("55", ""),
      pushname: msgContact.contact.pushname,
      isWAContact: msgContact.isWAContact,
      isGroup: msgContact.contact.isBusiness,
      profilePicUrl: profilePicUrl.eurl,
      serializednumber: msgContact.phoneNumber._serialized,
    };
    
    if (cached) return JSON.parse(cached);

    const contact = await app.contatoService.findOrCreate(
      { serializednumber: msgContact.phoneNumber._serialized },
      contactData
    );

    if (contact) {
      await redisClient.set(key, JSON.stringify(contact), "EX", 60);
    }
    return contact;
  } catch (error) {
    console.log(error)
    throw new AppError("erro create contato", 500);
  }
};

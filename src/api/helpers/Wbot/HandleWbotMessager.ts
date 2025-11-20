import { Chat, Message } from "wbotconnect";
import { Session } from "./wbotMessageListener";
import { Contact } from "@prisma/client";
import { getFastifyApp } from "../..";

export const HandleMessageSend = async (
  message: Message,
  wbot: Session
): Promise<void> => {
    const app = getFastifyApp().services
    const msgFromMe = message.fromMe
    
    let contact: Contact
    
    if(msgFromMe) {
      // contact = await app.contatoService.findOrCreate(message.sender.id, )
    }
  
}
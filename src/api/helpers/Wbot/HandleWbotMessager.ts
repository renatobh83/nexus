import { Chat, Message } from "wbotconnect";
import { Session } from "./wbotMessageListener";
import { Contact } from "@prisma/client";
import { getFastifyApp } from "../..";
import { verifyContactWbot } from "./Helpers/verifycontactWbot";
import { REDIS_KEYS } from "../../../ultis/redisCache";
import { findOrCreateTicketSafe } from "../CreateTicketSafe";



export const HandleMessageSend = async (
  message: Message,
  wbot: Session
): Promise<void> => {
  const app = getFastifyApp().services


  const chat = await wbot.getChatById(message.chatId)
  const contact = await verifyContactWbot(message, app, wbot)
  let authorGrupMessage: any = "";

  if (message.isGroupMsg && !message.fromMe) {
    const numberContato = await wbot.getContactLid(message.author);
    const contato = await app.contatoService.findContato({ serializednumber: numberContato })
    authorGrupMessage = contato;
  }

  const ticket = await findOrCreateTicketSafe({
    contact,
    whatsappId: wbot.id,
    unreadMessages: message.fromMe ? 0 : chat.unreadCount,
    groupContact: chat.isGroup,
    msg: message,
    channel: "whatsapp",
  })
  console.log(ticket)




}
// {
//   id: {
//     server: 'c.us',
//     user: '553185683733',
//     _serialized: '553185683733@c.us'
//   },
//   pushname: 'Renato',
//   type: 'in',
//   statusMute: false,
//   labels: [],
//   isContactSyncCompleted: 1,
//   textStatusLastUpdateTime: -1,
//   syncToAddressbook: false,
//   formattedName: '+55 31 8568-3733',
//   isMe: false,
//   isMyContact: false,
//   isPSA: false,
//   isUser: true,
//   isWAContact: true,
//   profilePicThumbObj: {
//     eurl: 'https://pps.whatsapp.net/v/t61.24694-24/55462098_2120559661570838_9195481867854282752_n.jpg?ccb=11-4&oh=01_Q5Aa3AH1l9xs8EZlWge1fsu8NYVTat5t7SAVzl-SYu2trEbFZg&oe=692C1509&_nc_sid=5e03e0&_nc_cat=109',
//     id: {
//       server: 'c.us',
//       user: '553185683733',
//       _serialized: '553185683733@c.us'
//     },
//     img: 'https://media-gru2-1.cdn.whatsapp.net/v/t61.24694-24/55462098_2120559661570838_9195481867854282752_n.jpg?stp=dst-jpg_s96x96_tt6&ccb=11-4&oh=01_Q5Aa3AGfXB_IVGa65JfRTFi0gkPTQeSDpezR7HQ4l6aQeIBrJQ&oe=692C1509&_nc_sid=5e03e0&_nc_cat=109',
//     imgFull: 'https://media-gru2-1.cdn.whatsapp.net/v/t61.24694-24/55462098_2120559661570838_9195481867854282752_n.jpg?ccb=11-4&oh=01_Q5Aa3AH1l9xs8EZlWge1fsu8NYVTat5t7SAVzl-SYu2trEbFZg&oe=692C1509&_nc_sid=5e03e0&_nc_cat=109',
//     tag: '1064161424'
//   },
//   msgs: null
// }
// {
//   id: {
//     server: 'c.us',
//     user: '553184251692',
//     _serialized: '553184251692@c.us'
//   },
//   name: 'Renato Serviço',
//   shortName: 'Renato Serviço',
//   pushname: 'Renato Expert',
//   type: 'in',
//   verifiedName: 'Renato Expert',
//   isBusiness: true,
//   isEnterprise: false,
//   isSmb: true,
//   verifiedLevel: 0,
//   privacyMode: null,
//   statusMute: false,
//   labels: [],
//   isContactSyncCompleted: 1,
//   textStatusLastUpdateTime: -1,
//   syncToAddressbook: true,
//   formattedName: 'You',
//   isMe: true,
//   isMyContact: true,
//   isPSA: false,
//   isUser: true,
//   isWAContact: true,
//   profilePicThumbObj: null,
//   msgs: null
// }
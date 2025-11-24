import { TbotSendForwardMesssage } from "./Tbot/TbotSendForwardMesssage";

export const SendMessageForward = async ({
  ticket,
  messageData,
}): Promise<any> => {
  let message: any | null = null;
  switch (ticket.channel) {
    case "telegram":
      message = await TbotSendForwardMesssage(ticket, messageData);
      break;
    case "whatsapp":
      //   const wbot = getWbot(ticket.whatsappId)
      break;
    default:
      break;
  }
  return message;
};

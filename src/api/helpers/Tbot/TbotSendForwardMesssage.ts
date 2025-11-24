import { getTbot } from "../../../lib/tbot";

export const TbotSendForwardMesssage = async (
  ticket: any,
  messageData: any
) => {
  const ctx = getTbot(ticket.whatsappId);
  const message = await ctx.telegram.forwardMessage(
    ticket.contact.number,
    ticket.contact.number,
    messageData.messageId
  );
  return message;
};

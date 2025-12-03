import { Ticket } from "@prisma/client";
import type { Chat, Message as WbotMessage } from "wbotconnect";
import { getWbot } from "../../../lib/wbot";
import { AppError } from "../../../errors/errors.helper";
import { logger } from "../../../ultis/logger";
import VerifyMessage from "./VerifyMessage";

interface Request {
  options: any;
  ticket: Ticket | any;
}
export const SendWhatsMessageList = async ({
  options,
  ticket,
}: Request): Promise<WbotMessage> => {
  const wbot = getWbot(ticket.whatsappId!);

  try {
    const sendedMessage = await wbot.sendListMessage(
      ticket.contact.serializednumber!,
      options
    );

    // const chat: Chat = await wbot.getChatById(sendedMessage.to);
    // const contact = await VerifyContact(chat, ticket.tenantId);
    await VerifyMessage(sendedMessage, ticket, ticket.contact);

    return sendedMessage;
  } catch (err: any) {
    logger.error(`SendWhatsMessageList | Error: ${err}`);
    // await StartWhatsAppSessionVerify(ticket.whatsappId, err);
    throw new AppError("ERR_SENDING_WAPP_MSG", 501);
  }
};

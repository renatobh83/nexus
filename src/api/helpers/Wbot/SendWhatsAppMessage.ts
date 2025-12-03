import type { Message as WbotMessage } from "wbotconnect";

import { AppError } from "../../../errors/errors.helper";
import { Message, Ticket } from "@prisma/client";
import { getWbot } from "../../../lib/wbot";
import { logger } from "../../../ultis/logger";
import { getFastifyApp } from "../..";

interface Request {
  body: string;
  ticket: Ticket | any;
  quotedMsg?: Message;
  userId?: number;
}

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg,
  userId,
}: Request): Promise<WbotMessage> => {
  let quotedMsgSerializedId: string | undefined;

  if (quotedMsg) {
    quotedMsgSerializedId = quotedMsg.messageId!;
  }

  const wbot = getWbot(ticket.whatsappId!);
  try {
    const sendMessage = await wbot.sendText(
      ticket.contact.serializednumber!,
      body,
      {
        quotedMsg: quotedMsgSerializedId,
      }
    );
    await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
      lastMessage: body.length > 255 ? body.slice(0, 252) + "..." : body,
      lastMessageAt: new Date().getTime(),
    });

    try {
      if (userId) {
        // TODO criar userLog
        // await UserMessagesLog.create({
        //   messageId: sendMessage.id,
        //   userId,
        //   ticketId: ticket.id,
        // } as UserMessagesLog);
      }
    } catch (error) {
      logger.error(`Error criar log mensagem ${error}`);
    }
    return sendMessage;
  } catch (err) {
    logger.error(`SendWhatsAppMessage | Error: ${err}`);
    throw new AppError("ERR_SENDING_WAPP_MSG", 501);
  }
};

export default SendWhatsAppMessage;

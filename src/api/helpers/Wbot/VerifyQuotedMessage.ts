import { Message } from "@prisma/client";
import type { Message as WbotMessage } from "wbotconnect";
import { getFastifyApp } from "../..";

const VerifyQuotedMessage = async (
  msg: WbotMessage
): Promise<Message | null> => {
  let quotedMsg: Message | null = null;

  if (msg.quotedMsgId) {
    quotedMsg = await getFastifyApp().services.messageService.findMessageBy({
      messageId: msg.quotedMsgId,
    });
  }

  return quotedMsg;
};

export default VerifyQuotedMessage;

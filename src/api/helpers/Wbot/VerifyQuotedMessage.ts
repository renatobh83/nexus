import { Message } from "@prisma/client";
import type { Message as WbotMessage } from "wbotconnect";
import { getFastifyApp } from "../..";

const VerifyQuotedMessage = async (
  msg: WbotMessage
): Promise<Message | null> => {
  let quotedMsg: Message | null = null;

  const wbotQuotedMsg = msg.quotedMsgId;

  if (!wbotQuotedMsg) return null;

  if (wbotQuotedMsg) {
    // quotedMsg = await getFastifyApp().services.messageService.findMessageBy({messageId: quotedMsg.id})
  }

  return quotedMsg;
};

export default VerifyQuotedMessage;

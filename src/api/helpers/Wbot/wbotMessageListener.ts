import { IncomingCall, Message } from "wbotconnect";

import { Session } from "../../../lib/wbot";
import { isValidMsg } from "./isValidMsg";
import { HandleMessage } from "./HandleWbotMessager";
import { blockedMessages } from "./BlockedMessages";
import { logger } from "../../../ultis/logger";
import { HandleMessageReceived } from "./HandleMessageReceived";

export interface MessageReaction {
  id: string;
  msgId: string;
  reactionText: string;
  read: boolean;
  orphan: number;
  orphanReason: any;
  timestamp: number;
}
let isSyncing = true;
export const wbotMessageListener = async (wbot: Session): Promise<void> => {
  setTimeout(() => {
    isSyncing = false;
    logger.warn(`Sync ${new Date().toLocaleTimeString()}`);
  }, 5000);
  wbot.onAnyMessage(async (msg: Message) => {
    if (isSyncing) {
      return;
    }
    if (msg.chatId === "status@broadcast") return;
    if (!msg.fromMe) return;
    if (msg.type === "list") return;
    const messageContent = msg.body || msg.caption || "";
    const isBlocked = blockedMessages.some((blocked) => {
      return messageContent.includes(blocked);
    });
    if (isBlocked) return;
    if (!isValidMsg(msg)) return;
    await HandleMessage(msg, wbot);
  });
  wbot.onMessage(async (msg: Message) => {
    if (isSyncing) {
      return;
    }

    await HandleMessageReceived(msg, wbot);
  });
  wbot.onIncomingCall(async (call: IncomingCall) => {});

  wbot.onReactionMessage(async (msg: MessageReaction) => {
    console.log(msg);
  });
};

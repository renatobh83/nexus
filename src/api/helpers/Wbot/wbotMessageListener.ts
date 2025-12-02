import { IncomingCall, Message } from "wbotconnect";

import { Session } from "../../../lib/wbot";
import { isValidMsg } from "./isValidMsg";
import { HandleMessage } from "./HandleWbotMessager";
import { blockedMessages } from "./BlockedMessages";

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
setTimeout(() => {
  isSyncing = false;
}, 5000);
export const wbotMessageListener = async (wbot: Session): Promise<void> => {
  wbot.onAnyMessage(async (msg: Message) => {
    if (isSyncing) {
      return;
    }
    if (msg.chatId === "status@broadcast") return;
    if (msg.type === "list") return;
    const messageContent = msg.body || msg.caption || "";
    const isBlocked = blockedMessages.some((blocked) => {
      return messageContent.includes(blocked);
    });
    if (isBlocked) return;
    if (!isValidMsg(msg)) return;
    await HandleMessage(msg, wbot);
  });
  wbot.onIncomingCall(async (call: IncomingCall) => {});

  wbot.onReactionMessage(async (msg: MessageReaction) => {
    console.log(msg);
  });
};

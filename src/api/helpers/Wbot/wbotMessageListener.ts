
import { IncomingCall, Message, Whatsapp } from "wbotconnect";
import { HandleMessageSend } from "./HandleWbotMessager";
import { isValidMsg } from "./Helpers/isValidMsg";
import { Session } from "../../../lib/wbot";


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

        if (!isValidMsg(msg)) return
        await HandleMessageSend(msg, wbot)

    })
    wbot.onIncomingCall(async (call: IncomingCall) => {

    });

    wbot.onReactionMessage(async (msg: MessageReaction) => {
        console.log(msg)
    });
}

import { IncomingCall, Message, Whatsapp } from "wbotconnect";
import { HandleMessageSend } from "./HandleWbotMessager";
import { isValidMsg } from "./Helpers/isValidMsg";

export interface Session extends Whatsapp {
    id: number;
}
export interface MessageReaction {
    id: string;
    msgId: string;
    reactionText: string;
    read: boolean;
    orphan: number;
    orphanReason: any;
    timestamp: number;
}
export const wbotMessageListener = async (wbot: Session): Promise<void> => {
    wbot.onAnyMessage(async (msg: Message) => {
        if(!isValidMsg(msg)) return
        await HandleMessageSend(msg,wbot)

    })
    wbot.onIncomingCall(async (call: IncomingCall) => {

    });

    wbot.onReactionMessage(async (msg: MessageReaction) => {
        console.log(msg)
    });
}
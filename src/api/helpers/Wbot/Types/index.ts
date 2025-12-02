import {
  MessageSendType,
  MessageStatus,
} from "../../../../core/messages/message.type";
import { MessageType } from "../../BuildSendMessage";

export interface MessagaToCreate {
  id: string;
  messageId: string;
  ticketId: number;
  ack: number;
  contactId: number;
  fromMe: boolean;
  body: any;
  mediaType: string;
  mediaUrl?: string;
  read: boolean;
  reaction?: string;
  reactionFromMe?: string;
  quotedMsgId?: string;
  status: MessageStatus;
  tenantId: number;
  sendType: MessageSendType;
  idFront: string;
  timestamp: number;
}

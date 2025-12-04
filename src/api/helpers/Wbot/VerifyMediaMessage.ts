import { enum_Messages_sendType, Message, Ticket } from "@prisma/client";
import { writeFile } from "node:fs";
import path, { join } from "node:path";
import { promisify } from "node:util";
import { v4 as uuidV4 } from "uuid";
import type { Contact, Message as WbotMessage, Whatsapp } from "wbotconnect";
import { logger } from "../../../ultis/logger";
import { getSafeExtension } from "../Tbot/VerifyMediaMessageTbot";
import VerifyQuotedMessage from "./VerifyQuotedMessage";
import { MessageDTO, MessageStatus } from "../../../core/messages/message.type";
import { getFastifyApp } from "../..";

const writeFileAsync = promisify(writeFile);
interface msg extends WbotMessage {
  filename?: string;
}
const VerifyMediaMessage = async (
  msg: msg,
  ticket: Ticket,
  contact: Contact,
  wbot: Whatsapp,
  authorGroupMessage?: Contact
): Promise<Message | void> => {
  const quotedMsg = await VerifyQuotedMessage(msg);

  // Baixar e tratar mídia
  const media = await wbot.downloadMedia(msg);
  const matches = media.match(/^data:(.+);base64,(.+)$/);
  const base64Data = matches ? matches[2] : media;

  if (!base64Data) {
    logger.error(`ERR_WAPP_DOWNLOAD_MEDIA:: ID: ${msg.id}`);
    return;
  }

  const fileData = Buffer.from(base64Data, "base64");

  let ext = getSafeExtension(msg.filename!, msg.mimetype);

  if (ext === "octet-stream" && msg.caption?.includes(".")) {
    ext = msg.caption.split(".").pop()?.trim() ?? "bin";
  }

  const filename = buildFilename(msg, ext);

  try {
    await writeFileAsync(
      join(__dirname, "..", "..", "..", "..", "public", filename),
      fileData
    );
  } catch (err) {
    logger.error("Erro ao salvar mídia:", err);
  }

  // === Regras de contactId (otimizado e legível) ===
  let contactId: number | undefined;

  if (msg.isGroupMsg) {
    if (msg.fromMe) {
      contactId = parseInt(contact.id, 10);
    } else {
      contactId = authorGroupMessage ? +authorGroupMessage.id : undefined;
    }
  } else {
    contactId = msg.fromMe ? parseInt(contact.id) : parseInt(contact.id);
  }

  const messageData: MessageDTO = {
    id: msg.id,
    ack: msg.ack,
    messageId: msg.id,
    timestamp: msg.timestamp,
    ticketId: ticket.id,
    fromMe: msg.fromMe,
    contactId: contactId!,
    body: msg.caption || filename,
    read: msg.fromMe,
    mediaUrl: filename,
    mediaType: msg.mimetype.split("/")[0],
    quotedMsgId: quotedMsg?.messageId,
    status: msg.fromMe
      ? ("sended" as MessageStatus)
      : ("received" as MessageStatus),
    isForwarded: msg.isForwarded,
    sendType: "chat" as enum_Messages_sendType,
    idFront: uuidV4(),
    tenantId: ticket.tenantId,
  };
  const message = await getFastifyApp().services.messageService.createMessage(
    messageData
  );
  await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
    lastMessage: msg.caption?.slice(0, 250) + "..." || filename,
    lastMessageAt: Date.now(),
    answered: !!msg.fromMe,
  });
  return message;
};

function buildFilename(msg: any, ext: any) {
  const baseName = msg.filename || `media-${new Date().getTime()}`;
  // Remove extensão duplicada se já existir no nome original
  const nameWithoutExt = path.basename(baseName, path.extname(baseName));
  const finalName = `${nameWithoutExt}${ext}`;

  return finalName;
}
export default VerifyMediaMessage;

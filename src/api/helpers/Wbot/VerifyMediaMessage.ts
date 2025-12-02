import { Ticket } from "@prisma/client";
import { writeFile } from "node:fs";
import path, { join } from "node:path";
import { promisify } from "node:util";
import type {
  Contact,
  Message,
  Message as WbotMessage,
  Whatsapp,
} from "wbotconnect";
import { logger } from "../../../ultis/logger";
import { getSafeExtension } from "../Tbot/VerifyMediaMessageTbot";
import VerifyQuotedMessage from "./VerifyQuotedMessage";

const writeFileAsync = promisify(writeFile);
interface msg extends WbotMessage {
  filename?: string;
}
const VerifyMediaMessage = async (
  msg: msg,
  ticket: Ticket,
  contact: Contact,
  wbot: Whatsapp,
  authorGroupMessage?: string
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

  // if (msg.isGroupMsg) {
  //   if (msg.fromMe) {
  //     contactId = contact.id; // eu mandei no grupo → meu contato
  //   } else {
  //     contactId = authorGroupMessage ? Number(authorGroupMessage) : undefined; // outro participante → id dele
  //   }
  // } else {
  //   contactId = msg.fromMe ? contact.id : contact.id; // conversa privada → sempre o contato
  // }

  // const messageData = {
  //   ...msg,
  //   messageId: msg.id,
  //   ticketId: ticket.id,
  //   contactId,
  //   body: msg.caption || filename,
  //   read: msg.fromMe,
  //   mediaUrl: filename,
  //   mediaType: msg.mimetype.split("/")[0],
  //   quotedMsgId: quotedMsg?.messageId,
  //   status: msg.fromMe ? "sended" : "received",
  //   isForwarded: msg.isForwarded,
  // };

  // await ticket.update({
  //   lastMessage: msg.caption?.slice(0, 250) + "..." || filename,
  //   lastMessageAt: Date.now(),
  //   answered: !!msg.fromMe,
  // });

  // return await CreateMessageService({
  //   messageData,
  //   tenantId: ticket.tenantId,
  // });
};

function buildFilename(msg: any, ext: any) {
  const baseName = msg.filename || `media-${new Date().getTime()}`;
  // Remove extensão duplicada se já existir no nome original
  const nameWithoutExt = path.basename(baseName, path.extname(baseName));
  const finalName = `${nameWithoutExt}${ext}`;

  return finalName;
}
export default VerifyMediaMessage;

import path, { join } from "path";

import { promisify } from "util";
import { writeFile, createWriteStream } from "fs";
import { v4 as uuidV4 } from "uuid";
import { Context } from "telegraf";
import axios from "axios";
import { Contact, Message, Ticket } from "@prisma/client";
import { logger } from "../../../ultis/logger";

import { AppServices } from "../../plugins/di-container";
import {
  MessageSendType,
  MessageStatus,
} from "../../../core/Messages/message.type";

const writeFileAsync = promisify(writeFile);

const getMediaInfo = (msg: any) => {
  // eslint-disable-next-line prettier/prettier
  const mediaType = msg.photo
    ? "photo"
    : msg.video
    ? "video"
    : msg.audio
    ? "audio"
    : msg.voice
    ? "voice"
    : msg.sticker && !msg.sticker.is_animated
    ? "sticker"
    : "document";
  const mediaObj = msg[mediaType];
  // eslint-disable-next-line prettier/prettier
  const [type, mimeType, SAD, fileName, fileId, caption, SAV] = [
    mediaType,
    mediaObj.mime_type ? mediaObj.mime_type : "",
    false,
    null,
    mediaObj.file_id ? mediaObj.file_id : mediaObj[mediaObj.length - 1].file_id,
    msg.caption ? msg.caption : "",
    mediaType == "voice",
  ];
  switch (mediaType) {
    case "photo":
      return {
        type,
        mimeType: "image/png",
        SAD,
        fileName,
        fileId,
        caption,
        SAV,
      };
      break;
    case "video":
      return { type, mimeType, SAD, fileName, fileId, caption, SAV };
      break;
    case "audio":
      return { type, mimeType, SAD, fileName, fileId, caption, SAV };
      break;
    case "voice":
      return { type, mimeType, SAD, fileName, fileId, caption, SAV };
      break;
    case "sticker":
      return {
        type,
        mimeType: "image/webp",
        SAD,
        fileName,
        fileId,
        caption,
        SAV,
        SAS: true,
      };
      break;
    default:
      return {
        type,
        mimeType,
        SAD: true,
        fileName: mediaObj.file_name ? mediaObj.file_name : null,
        fileId,
        caption,
        SAV,
      };
      break;
  }
};

const downloadFile = async (url: any, pathFile: string): Promise<void> => {
  const request = await axios({
    url: url.toString(),
    method: "GET",
    responseType: "stream",
  });

  await new Promise((resolve, reject) => {
    request.data
      .pipe(createWriteStream(pathFile))
      .on("finish", async () => resolve(true))
      .on("error", (error: any) => {
        console.error("ERROR DONWLOAD", error);
        reject(new Error(error));
      });
  });
};

const VerifyMediaMessageTbot = async (
  ctx: Context | any,
  fromMe: boolean,
  ticket: Ticket,
  contact: Contact,
  app: AppServices
): Promise<Message | void> => {
  let message: {
    message_id: any;
    reply_to_message: { message_id: any };
    text: any;
    caption: any;
    date: string | number;
  };
  let updateMessage: any = {};
  message = ctx?.message;
  updateMessage = ctx?.update;

  // Verificar se mensagem foi editada.
  if (!message && updateMessage) {
    message = updateMessage?.edited_message;
  }

  const mediaInfo = getMediaInfo(message);
  const media = await ctx.telegram.getFile(mediaInfo.fileId);

  if (!media) {
    logger.error(`ERR_DOWNLOAD_MEDIA:: ID: ${message.message_id}`);
    return;
  }
  const ext = getSafeExtension(mediaInfo.fileName, mediaInfo.mimeType);

  const filename = buildFilename(mediaInfo, ext);
  const pathFile = join(__dirname, "..", "..", "..", "..", "public", filename);

  const linkDownload = await ctx.telegram.getFileLink(mediaInfo.fileId);

  await downloadFile(linkDownload, pathFile);

  let quotedMsgId;
  if (message?.reply_to_message?.message_id) {
    // const messageQuoted = await getQuotedForMessageId(
    //   message.reply_to_message.message_id,
    //   ticket.tenantId
    // );
    const messageQuoted = await app.messageService.findMessageBy({
      messageId: message.reply_to_message.message_id,
      tenantId: ticket.tenantId,
    });
    quotedMsgId = messageQuoted?.id || undefined;
  }

  const messageData = {
    id: String(message?.message_id),
    messageId: String(message?.message_id),
    ticketId: ticket.id,
    tenantId: ticket.tenantId,
    contactId: fromMe ? null : contact.id,
    body: message.text || message.caption || filename,
    fromMe,
    sendType: "chat" as MessageSendType,
    read: fromMe,
    mediaUrl: filename,
    mediaType: mediaInfo.mimeType.split("/")[0],
    quotedMsgId,
    timestamp: +message.date * 1000, // compatibilizar JS
    status: (fromMe ? "sended" : "received") as MessageStatus,
    ack: 0,
    idFront: uuidV4(),
  };

  // await ticket.update({
  //   lastMessage: "MEDIA FILE",
  //   lastMessageAt: new Date().getTime(),
  //   answered: fromMe || false,
  // });
  const newMessage = await app.messageService.createMessage(messageData);
  await app.ticketService.updateTicket(ticket.id, {
    lastMessage: "MEDIA FILE",
    lastMessageAt: new Date().getTime(),
    answered: fromMe || false,
  });
  return newMessage;
};

export function getSafeExtension(filename: string, mimetype: any) {
  // 1️⃣ tenta extrair da extensão original (ex: ".jpg", ".xlsx")
  const ext = filename ? path.extname(filename) : "";
  if (ext) return ext;

  // 2️⃣ se não tiver, tenta deduzir do mimetype
  const mimeMap = {
    // 🖼️ Imagens
    "image/jpeg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
    "image/svg+xml": ".svg",
    "image/x-icon": ".ico",
    "image/heic": ".heic",
    "image/heif": ".heif",

    // 📄 Documentos Office / LibreOffice / PDF
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      ".pptx",
    "application/vnd.oasis.opendocument.text": ".odt",
    "application/vnd.oasis.opendocument.spreadsheet": ".ods",
    "application/vnd.oasis.opendocument.presentation": ".odp",
    "application/rtf": ".rtf",
    "text/plain": ".txt",
    "text/csv": ".csv",
    "text/html": ".html",
    "text/xml": ".xml",
    "application/xml": ".xml",
    "application/json": ".json",

    // 🎵 Áudios
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/x-m4a": ".m4a",
    "audio/mp4": ".m4a",
    "audio/aac": ".aac",
    "audio/flac": ".flac",
    "audio/x-ms-wma": ".wma",
    "audio/amr": ".amr",

    // 🎥 Vídeos
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/ogg": ".ogv",
    "video/3gpp": ".3gp",
    "video/x-msvideo": ".avi",
    "video/x-ms-wmv": ".wmv",
    "video/mpeg": ".mpeg",
    "video/quicktime": ".mov",
    "video/x-flv": ".flv",
    "video/x-matroska": ".mkv",

    // 📦 Compactados / Arquivos de sistema
    "application/zip": ".zip",
    "application/x-zip-compressed": ".zip",
    "application/x-7z-compressed": ".7z",
    "application/x-rar-compressed": ".rar",
    "application/gzip": ".gz",
    "application/x-tar": ".tar",
    "application/x-bzip2": ".bz2",
    "application/octet-stream": ".bin",
  } as any;

  return mimeMap[mimetype] || "";
}

function buildFilename(msg: any, ext: any) {
  const baseName = msg.fileName || `media-${new Date().getTime()}`;
  // Remove extensão duplicada se já existir no nome original
  const nameWithoutExt = path.basename(baseName, path.extname(baseName));
  const finalName = `${nameWithoutExt}${ext}`;

  return finalName;
}
export default VerifyMediaMessageTbot;

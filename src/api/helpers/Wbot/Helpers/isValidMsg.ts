import { Message } from "wbotconnect";

export const isValidMsg = (msg: Message): boolean => {
  if (msg.from === "status@broadcast") return false;
  if (
    msg.type === "chat" ||
    msg.type === "audio" ||
    msg.type === "ptt" ||
    msg.type === "video" ||
    msg.type === "image" ||
    msg.type === "document" ||
    msg.type === "vcard" ||
    msg.type === "sticker" ||
    msg.type === "list" ||
    msg.type === "list_response"
  )
    return true;

  return false;
};

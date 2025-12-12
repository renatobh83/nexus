import { join } from "node:path";
import { v4 as uuidV4 } from "uuid";
import SendMessageSystemProxy from "./SendMessageSystemProxy";
import { AppError } from "../../errors/errors.helper";
import socketEmit from "./socketEmit";
import { pupa } from "../../ultis/pupa";
import { getFastifyApp } from "..";
import { sendBotMessage } from "./SendBotMessage";
import { SendWhatsMessageList } from "./Wbot/SendWhatsAppMessageList";
import { MessageStatus } from "../../core/messages/message.type";
import { actionsIntegracaoGenesis } from "../../core/ChatFlow/FlowIntegracao/genesis/actionsIGenesis";
import { decrypt } from "../../lib/crypto";

export interface MessageData {
  id?: string;
  ticketId?: number;
  body?: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  timestamp?: number;
  internalId?: string;
  userId?: number;
  tenantId?: number;
  quotedMsgId?: string;
  scheduleDate?: Date;
  sendType?: string;
  status?: string;
}

interface WebhookProps {
  apiId: string;
  acao: string;
}

export enum MessageType {
  MessageField = "MessageField",
  MessageOptionsField = "MessageOptionsField",
  MediaField = "MediaField",
  WebhookField = "WebhookField",
}

interface MessageRequest {
  data: {
    message?: any;
    values?: string[];
    caption?: string;
    ext?: string;
    mediaUrl?: string;
    name?: string;
    type?: string;
    webhook?: WebhookProps;
  };
  id: string;
  type: "MessageField" | "MessageOptionsField" | "MediaField" | "WebhookField";
}

interface Request {
  msg: MessageRequest;
  tenantId: number;
  ticket: any;
  userId?: number;
}

const BuildSendMessageService = async ({
  msg,
  tenantId,
  ticket,
  userId,
}: Request): Promise<void> => {
  try {
    console.log(msg.type);
    const messageData: MessageData = {
      ticketId: ticket.id,
      body: "",
      contactId: ticket.contactId,
      fromMe: true,
      read: true,
      mediaType: "chat",
      mediaUrl: undefined,
      timestamp: Date.now(),
      userId,
      sendType: "bot",
      status: "pending" as MessageStatus,
      tenantId,
    };

    // ------------------------------------------------------------
    // 🧩 1. MEDIA FIELD
    // ------------------------------------------------------------
    if (msg.type === "MediaField" && msg.data.mediaUrl) {
      // TODO Falta BuildSendMessageService MediaField
      const isAbsolutePath =
        msg.data.mediaUrl.includes(":\\") || msg.data.mediaUrl.includes(":/");

      const urlSplit = isAbsolutePath
        ? msg.data.mediaUrl.split("\\")
        : msg.data.mediaUrl.split("/");

      // const message = {
      //   ...messageData,
      //   body: msg.data.name,
      //   mediaName: urlSplit.at(-1),
      //   mediaUrl: urlSplit.at(-1),
      //   mediaType: msg.data.message?.mediaType || "chat",
      // };

      // const customPath = join(__dirname, "..", "..", "..", "public");
      // const mediaPath = join(customPath, message.mediaUrl || "");
      // const media = { path: mediaPath, filename: message.mediaName };

      // const messageSent = await SendMessageSystemProxy({
      //   ticket,
      //   messageData: message,
      //   media,
      //   userId,
      // });

      // const rawMessageId = messageSent?.id ?? messageSent?.messageId ?? "";
      // const messageId = String(rawMessageId || uuidV4());

      // const [existingMessage] = await Message.findOrCreate({
      //   where: { messageId },
      //   defaults: filterValidAttributes({
      //     ...message,
      //     ...messageSent,
      //     id: messageId,
      //   }),
      // });

      // const messageCreated = await reloadMessageWithIncludes(
      //   existingMessage.id,
      //   tenantId
      // );
      // if (!messageCreated)
      //   throw new AppError("ERR_CREATING_MESSAGE_SYSTEM", 422);

      //    await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
      //   lastMessage:
      //     decrypt(message.body).length > 255
      //       ? decrypt(message.body).slice(0, 252) + "..."
      //       : decrypt(message.body),
      //   lastMessageAt: Date.now(),
      //   answered: true,
      // });

      // socketEmit({ tenantId, type: "chat:create", payload: messageCreated });
      return;
    }

    // ------------------------------------------------------------
    // 🌐 2. WEBHOOK FIELD
    // ------------------------------------------------------------
    if (msg.type === "WebhookField") {
      let options: any;
      const integracao = msg.data.webhook?.apiId;

      if (!integracao) {
        options = await getFastifyApp().services.chatFlowService.actionsFlow(
          msg,
          ticket
        );
      } else {
        const integracaoService =
          await getFastifyApp().services.integracaoService.findOne({
            tenantId: tenantId,
            id: +integracao,
          });
        if (integracaoService!.name.toLowerCase().trim() === "genesis") {
          options = await actionsIntegracaoGenesis(
            integracaoService,
            ticket,
            msg
          );
        }
      }
      console.log("OPT", options);
      if (!options) return;

      let messageSent: any;
      if (typeof options === "object") {
        messageSent =
          ticket.channel === "telegram"
            ? await sendBotMessage(ticket.tenantId, ticket, options)
            : await SendWhatsMessageList({ options, ticket });
      } else {
        messageSent = await SendMessageSystemProxy({
          ticket,
          messageData: { ...messageData, body: options },
          media: null,
          userId: null,
        });
      }

      const messageId = String(
        messageSent?.id ?? messageSent?.messageId ?? uuidV4()
      );

      const message =
        await getFastifyApp().services.messageService.createMessage({
          ...messageData,
          ...messageSent,
          id: messageId,
          idFront: uuidV4(),
          messageId,
          ack: 2,
        });

      await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
        lastMessage:
          decrypt(message.body).length > 255
            ? decrypt(message.body).slice(0, 252) + "..."
            : decrypt(message.body),
        lastMessageAt: Date.now(),
        answered: true,
      });

      socketEmit({ tenantId, type: "chat:create", payload: message });
      return;
    }

    // ------------------------------------------------------------
    // 💬 3. MENSAGEM DE TEXTO (DEFAULT)
    // ------------------------------------------------------------
    msg.data.message = pupa(msg.data.message || "", {
      protocol: ticket.id,
      name: ticket.contact.name,
    });

    const messageSent = (await SendMessageSystemProxy({
      ticket,
      messageData: { ...messageData, body: msg.data.message },
      media: null,
      userId: null,
    })) as any;

    const messageId = String(
      messageSent?.id ?? messageSent?.messageId ?? uuidV4()
    );
    const message = await getFastifyApp().services.messageService.createMessage(
      {
        ...messageData,
        ...messageSent,
        id: messageId,
        idFront: uuidV4(),
        messageId,
        ack: 2,
      }
    );
    console.log(decrypt(message.body));
    await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
      lastMessage:
        decrypt(message.body).length > 255
          ? decrypt(message.body).slice(0, 252) + "..."
          : decrypt(message.body),
      lastMessageAt: Date.now(),
      answered: true,
    });

    socketEmit({
      tenantId,
      type: "chat:create",
      payload: message,
    });
  } catch (error) {
    console.error(error);
    throw new AppError("ERR_BUILD_SEND_MESSAGE_SERVICE", 502);
  }
};

export default BuildSendMessageService;

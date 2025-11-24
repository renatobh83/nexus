import { getIO } from "../../lib/socket";

type Events =
  | "chat:create"
  | "chat:delete"
  | "chat:update"
  | "chat:ack"
  | "ticket:update"
  | "ticket:create"
  | "contact:update"
  | "contact:delete"
  | "contact:create"
  | "notification:new"
  | "campaign:update"
  | "user:update"
  | "ticket:update_chatflow"
  | "campaign:send"
  | "ChatClientDesconectado"
  | "chamado:create"
  | "chamado:delete"
  | "chamado:update"
  | "message:create";

interface ObjEvent {
  tenantId: number | string;
  type: Events;
  payload: object;
}

const emitEvent = ({ tenantId, type, payload }: ObjEvent): void => {
  const io = getIO();
  let eventChannel = `${tenantId}:ticketList`;

  if (type.indexOf("contact:") !== -1) {
    eventChannel = `${tenantId}:contactList`;
  }

  io.to(tenantId.toString()).emit(eventChannel, {
    type,
    payload,
  });
};

export default emitEvent;

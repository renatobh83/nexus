import { getFullMediaUrl } from "../../ultis/getFullMediaUrl";
import { TicketWithStandardIncludes, TicketWithMessages } from "./tickets.type";

type TicketInput = TicketWithStandardIncludes | TicketWithStandardIncludes[];
type TicketOutput = TicketWithMessages | TicketWithMessages[];

function _transformSingleTicket(
  ticket: TicketWithStandardIncludes
): TicketWithMessages {
  // if (!ticket || !ticket.messages) {
  //   return ticket as TicketWithMessages;
  // }

  const MessageForResponse = ticket.messages.map((message) => {
    const newQuot = message.quotedMsg
      ? {
          ...message.quotedMsg,
          mediaUrl: message.quotedMsg.mediaUrl
            ? getFullMediaUrl(message.quotedMsg.mediaUrl)
            : null,
        }
      : null;

    return {
      ...message,
      mediaUrl: getFullMediaUrl(message.mediaUrl),
      quotedMsg: newQuot,
      isGroup: ticket.isGroup,
      channel: ticket.channel,
    };
  });

  return {
    ...ticket,
    messages: MessageForResponse,
    username: ticket.user?.name,
    contactId: ticket.contactId,
    empresanome: ticket.empresa?.name,
    name: ticket.contact.name,
    profilePicUrl: ticket.contact.profilePicUrl,
  } as TicketWithMessages;
}

// Função principal flexível
export function transformTickets(tickets: TicketInput): TicketOutput {
  // Verifica se a entrada é um array
  if (Array.isArray(tickets)) {
    // Se for um array, mapeia e aplica a transformação em cada item
    return tickets.map(_transformSingleTicket);
  }

  // Se for um objeto único, aplica a transformação diretamente
  return _transformSingleTicket(tickets);
}

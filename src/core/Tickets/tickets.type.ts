import { Prisma, Ticket } from "@prisma/client";

// 1. Defina o tipo de inclusão (o mesmo objeto que você passa para o 'include')
const ticketWithMessagesInclude = Prisma.validator<Prisma.TicketInclude>()({
  messages: {
    include: {
      quotedMsg: true,
    },
    orderBy: {
      updatedAt: "asc",
    },
  },
});

// 2. Crie o tipo de retorno exato
export type TicketWithMessages = Prisma.TicketGetPayload<{
  include: typeof ticketWithMessagesInclude;
}>;
// 1. Definição do objeto de include reutilizável
export const TICKET_INCLUDE_CONFIG = {
  contact: {
    select: {
      id: true,
      name: true,
      email: true,
      number: true,
      telegramId: true,
      profilePicUrl: true,
      serializednumber: true,
    },
  },
  user: {
    select: {
      name: true,
      id: true,
      email: true,
    },
  },
  whatsapp: {
    select: {
      name: true,
      id: true,
    },
  },
  chamado: true,
  chatFlow: true,
  empresa: {
    select: {
      id: true,
      name: true,
    },
  },
  messages: {
    include: {
      // ticket: true,
      quotedMsg: true,
    },
    orderBy: {
      updatedAt: "asc",
    },
  },
  queue: {
    select: {
      id: true,
      queue: true,
    },
  },
  tenant: { select: { id: true } },
} satisfies Prisma.TicketInclude;

export type TicketWithStandardIncludes = Prisma.TicketGetPayload<{
  include: typeof TICKET_INCLUDE_CONFIG;
}>;

export type TicketMessageUsername = Ticket &
  TicketWithMessages & {
    username: string | undefined;
    empresanome: string | undefined;
    name: string | undefined;
    profilePicUrl: string | null;
  };

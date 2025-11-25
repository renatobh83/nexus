import { Prisma } from "@prisma/client";

// 1. Defina o tipo de inclusão (o mesmo objeto que você passa para o 'include')
const ticketWithMessagesInclude = Prisma.validator<Prisma.TicketInclude>()({
  messages: {
    include: {
      ticket: true,
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

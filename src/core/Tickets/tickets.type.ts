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

export interface Step {
  id: string;
  data: {
    conditions: StepCondition[];
    interactions: any[]; // Melhorar tipagem aqui se possível
  };
  type?: string; // Ex: 'boasVindas', 'configurations'
}
export interface StepCondition {
  action: ChatFlowAction;
  nextStepId?: string;
  queueId?: string;
  userIdDestination?: string;
  closeTicket?: string;
  type: ConditionType;
  condition?: string[];
}
export interface FlowConfig {
  type: "configurations";
  data: {
    autoDistributeTickets?: boolean;
    maxRetryBotMessage?: {
      number: number;
      type: RetryDestinyType;
      destiny: string; // queueId ou userId
    };
    notOptionsSelectMessage?: {
      message: string;
    };
    welcomeMessage?: {
      message: string;
    };
    notResponseMessage?: {
      message: string;
    };
    answerCloseTicket?: string[];
  };
}
export enum ChatFlowAction {
  NextStep = 0,
  QueueDefine = 1,
  UserDefine = 2,
  CloseTicket = 3,
  AdvancedStep = 4,
}

export enum ConditionType {
  UserSelection = "US",
  Automatic = "A",
}
export enum RetryDestinyType {
  Queue = 1,
  User = 2,
  Close = 3,
}

export interface MessageData {
  body: string;
  fromMe: boolean;
  read: boolean;
  mediaType: "chat";
  sendType: "bot" | "chat";
}

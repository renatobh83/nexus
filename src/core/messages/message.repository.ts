import { Message, Prisma } from "@prisma/client";
import { MessageDTO } from "./message.type";
import { prisma } from "../../lib/prisma";
import { PaginationOptions } from "../users/users.repository";

export interface ResponseMessages {
  messages: Message[];
  count: number;
  hasMore: boolean;
}
// --- Tipos Auxiliares ---

// 1. Defina o tipo de inclusão (include) que você sempre quer carregar
// Isso garante que a assinatura do método seja clara e consistente.
const messageInclude = {
  ticket: {
    include: {
      contact: true,
    },
  },
  quotedMsg: {
    include: {
      contact: true,
    },
  },
  contact: true,
} satisfies Prisma.MessageInclude;

// 2. Defina o tipo de retorno do seu método (a mensagem com as relações)
// O tipo 'Awaited' é usado para extrair o tipo de retorno da promessa.
type MessageWithRelations = Prisma.MessageGetPayload<{
  include: typeof messageInclude;
}>;

export class MessageRepository {
  create(dto: MessageDTO) {
    return Promise<null>;
  }

  /**
   * Encontra uma mensagem pelo messageId e tenantId, ou a cria se não existir.
   * Sempre retorna a mensagem com as relações especificadas.
   *
   * @param where - Condição única para busca (messageId e tenantId).
   * @param createData - Dados completos para criação da mensagem.
   * @param updateData - Dados para atualização se a mensagem for encontrada.
   * @returns A mensagem encontrada ou criada, com as relações carregadas.
   */
  async findOrCreateAndReload(
    where: { messageId: string; tenantId: number },
    createData: Prisma.MessageCreateInput,
    updateData: Prisma.MessageUpdateInput
  ): Promise<MessageWithRelations> {
    // O Prisma requer que o 'where' do upsert seja um campo único.
    // Assumindo que você tem um índice único composto: @@unique([messageId, tenantId])
    const whereClause: Prisma.MessageWhereUniqueInput = {
      messageId_tenantId: where,
    };
    try {
      const message = await prisma.message.upsert({
        where: whereClause,
        update: updateData,
        create: createData,
        include: messageInclude,
      });

      return message;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async findMessageBy(
    where: Prisma.MessageWhereInput,
    include?: Prisma.MessageInclude
  ): Promise<Message | null> {
    return await prisma.message.findFirst({ where, include });
  }
  async findAllMessageTicket(
    where: Prisma.MessageWhereInput,
    options?: PaginationOptions
  ): Promise<ResponseMessages> {
    const DEFAULT_LIMIT = 40;
    const DEFAULT_SKIP = 0;
    const { limit = DEFAULT_LIMIT, skip = DEFAULT_SKIP } = options || {};

    const messages = await prisma.message.findMany({
      take: limit,
      skip: skip,
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        ticket: true,
      },
    });
    const count = messages.length;
    const hasMore = count > skip + messages.length;

    return {
      messages: messages.reverse(),
      hasMore,
      count,
    };
  }

  async updateMessage(messageId: string, data: Prisma.MessageUpdateInput) {
    return await prisma.message.update({
      where: {
        messageId: messageId,
      },
      data,
      include: messageInclude,
    });
  }
}

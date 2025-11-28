import { Prisma, Ticket } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  TICKET_INCLUDE_CONFIG,
  TicketMessageUsername,
  TicketWithMessages,
  TicketWithStandardIncludes,
} from "./tickets.type";
import { getFullMediaUrl } from "../../ultis/getFullMediaUrl";
import { transformTickets } from "./tickets.utils";

export interface ITicketRepository {
  // findTickets(params: {
  //   tenantId: number;
  //   status: string[];
  //   queuesIdsUser: number[];
  //   userId: number;
  //   isUnread: boolean;
  //   isNotAssigned: boolean;
  //   isNotViewAssignedTickets: boolean;
  //   isSearchParam: boolean;
  //   searchParam: string;
  //   limit: number;
  //   offset: number;
  //   profile: string;
  //   isExistsQueueTenant: boolean;
  //   NotQueueDefinedTicket: boolean;
  // }): Promise<{ tickets: Ticket[]; count: number }>;

  countQueuesByTenant(tenantId: number): Promise<number>;

  findUserQueues(userId: number): Promise<{ queueId: number }[]>;
}

export class TicketRepository {
  /**
   * Conta o número de filas ativas para um determinado tenant.
   * @param tenantId O ID do tenant.
   * @returns O número de filas ativas.
   */
  async countQueuesByTenant(tenantId: number): Promise<number> {
    return prisma.queue.count({
      where: {
        tenantId,
        isActive: true,
      },
    });
  }
  /**
   * Encontra as filas associadas a um usuário.
   * @param userId O ID do usuário.
   * @returns Uma lista de objetos contendo o ID da fila.
   */
  async findUserQueues(userId: number): Promise<{ queueId: number }[]> {
    // Assumindo que 'UsersQueues' no código original mapeia para uma tabela
    // de relacionamento no Prisma, ou uma tabela 'UserQueue'
    // Aqui, assumimos uma tabela 'UserQueue' com campos 'userId' e 'queueId'.
    const userQueues = await prisma.usersQueues.findMany({
      where: {
        userId,
      },
      select: {
        queueId: true,
      },
    });

    // Mapeia para o formato esperado pelo Service
    return userQueues.map((uq) => ({ queueId: uq.queueId }));
  }
  /**
   * Executa a consulta complexa de listagem de tickets.
   * NOTA: Devido à complexidade da query SQL original, e a dificuldade
   * de replicar toda a lógica de JOINs e condições complexas no Prisma ORM
   * de forma performática e legível, mantemos a abordagem de raw query
   * (agora via Prisma.$queryRaw) DENTRO DO REPOSITORY, que é o local
   * apropriado para a lógica de acesso a dados.
   * Em um cenário ideal, tentaríamos usar o `prisma.ticket.findMany`
   * com o máximo de filtros possível.
   *
   * @param params Os parâmetros de filtragem e paginação.
   * @returns Uma promessa que resolve para a lista de tickets e a contagem total.
   */

  async findById(id: number): Promise<TicketWithMessages | null> {
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: id,
      },
      include: TICKET_INCLUDE_CONFIG,
    });
    if (!ticket) return null;

    return transformTickets(
      ticket as TicketWithStandardIncludes
    ) as TicketWithMessages;
  }
  async findTicketForward(contatoId: number, data: Prisma.TicketCreateInput) {
    let ticket: Ticket | null;

    ticket = await prisma.ticket.findFirst({
      where: {
        contactId: contatoId,
        OR: [
          {
            status: {
              in: ["open", "pending"],
            },
          },
        ],
      },
      include: TICKET_INCLUDE_CONFIG,
    });
    if (!ticket) {
      ticket = await prisma.ticket.create({ data: data });
    }
    return transformTickets(
      ticket as TicketWithStandardIncludes
    ) as TicketWithMessages;
  }
  async findOne(where: Prisma.TicketWhereInput): Promise<any | null> {
    const ticket = await prisma.ticket.findFirst({
      where,
      include: TICKET_INCLUDE_CONFIG,
      orderBy: {
        createdAt: "desc", // Ordena do mais recente para o mais antigo
      },
    });
    if (!ticket) return null;

    return transformTickets(
      ticket as TicketWithStandardIncludes
    ) as TicketWithMessages;
  }

  async create(data: Prisma.TicketCreateInput): Promise<any> {
    const ticket = await prisma.ticket.create({
      data: data,
      include: TICKET_INCLUDE_CONFIG,
    });
    return transformTickets(
      ticket as TicketWithStandardIncludes
    ) as TicketWithMessages;
  }

  async findTickets(params: {
    tenantId: number;
    status: string[];
    queuesIdsUser: number[];
    userId: number;
    isUnread: boolean;
    isNotAssigned: boolean;
    isNotViewAssignedTickets: boolean;
    isSearchParam: boolean;
    searchParam: string;
    limit: number;
    offset: number;
    profile: string;
    isExistsQueueTenant: boolean;
    NotQueueDefinedTicket: boolean;
  }) {
    const {
      tenantId,
      status,
      queuesIdsUser,
      userId,
      isUnread,
      isNotAssigned,
      isNotViewAssignedTickets,
      isSearchParam,
      searchParam,
      limit,
      offset,
      profile,
      isExistsQueueTenant,
      NotQueueDefinedTicket,
    } = params;

    // 1. Construção da Cláusula WHERE
    const whereConditions: Prisma.TicketWhereInput[] = [
      // Filtro principal por tenantId
      { tenantId },
      // Filtro para tickets sem chatFlowId
      { chatFlowId: null },
      // Filtro por status
      { status: { in: status } },
    ];
    // 1.1. Condição de Mensagens Não Lidas (isUnread)
    if (isUnread) {
      whereConditions.push({ unreadMessages: { gt: 0 } });
    }

    // 1.2. Condição de Não Atribuído (isNotAssigned)
    if (isNotAssigned) {
      whereConditions.push({ userId: null });
    }

    // 1.3. Condição de Filas (queuesIdsUser, profile, NotQueueDefinedTicket, isExistsQueueTenant)
    // Esta é a lógica mais complexa, traduzindo o OR do SQL para o Prisma.
    const queueFilter: Prisma.TicketWhereInput[] = [];

    if (profile === "admin") {
      // Admin vê tudo, então não adicionamos restrição de fila
    } else {
      // Condição OR para usuários não-admin
      const userQueueOrConditions: Prisma.TicketWhereInput[] = [];

      // Condição 1: Se houver filas cadastradas E o ticket estiver em uma das filas do usuário
      if (isExistsQueueTenant) {
        userQueueOrConditions.push({ queueId: { in: queuesIdsUser } });
      }

      // Condição 2: Se a flag NotQueueDefinedTicket estiver ativa (tickets sem fila)
      if (NotQueueDefinedTicket) {
        userQueueOrConditions.push({ queueId: null });
      }

      // Condição 3: Tickets atribuídos ao próprio usuário
      userQueueOrConditions.push({ userId });

      // Condição 5: Tickets de grupo
      userQueueOrConditions.push({ isGroup: true });

      // Condição 6: Se não houver filas cadastradas (isExistsQueueTenant = false)
      if (!isExistsQueueTenant) {
        userQueueOrConditions.push({}); // Adiciona uma condição vazia para incluir todos
      }

      // Adiciona a condição OR ao filtro principal
      if (userQueueOrConditions.length > 0) {
        queueFilter.push({ OR: userQueueOrConditions });
      }
    }

    if (queueFilter.length > 0) {
      whereConditions.push({ AND: queueFilter });
    }

    // 1.4. Condição de Pesquisa (isSearchParam)
    if (isSearchParam) {
      const searchFilter: Prisma.TicketWhereInput = {
        OR: [
          // Pesquisa por ID do ticket
          {
            id: {
              equals: parseInt(searchParam.replace(/%/g, "")) || undefined,
            },
          },
          // Pesquisa por nome ou número do contato
          {
            contact: {
              OR: [
                {
                  name: {
                    contains: searchParam.replace(/%/g, ""),
                    mode: "insensitive",
                  },
                },
                { number: { contains: searchParam.replace(/%/g, "") } },
              ],
            },
          },
        ],
      };
      whereConditions.push(searchFilter);
    }

    // 1.5. Condição de Visualização de Tickets Atribuídos (isNotViewAssignedTickets)
    if (isNotViewAssignedTickets && profile !== "admin") {
      whereConditions.push({
        OR: [
          { userId }, // Vê os seus
          { userId: null }, // Vê os não atribuídos
        ],
      });
    }

    // 2. Execução da Consulta
    const where: Prisma.TicketWhereInput = { AND: whereConditions };

    // 2.1. Contagem Total
    const count = await prisma.ticket.count({ where });

    // 2.2. Busca dos Tickets
    const tickets = await prisma.ticket.findMany({
      where,
      include: TICKET_INCLUDE_CONFIG,
      orderBy: [
        // Ordenação por status (replicando o CASE WHEN)
        { status: "asc" }, // Prisma não tem um CASE WHEN direto, mas 'asc' ou 'desc' pode ser usado se o status for um ENUM ordenado.
        // Se 'pending', 'open', 'closed' for a ordem, o Prisma não consegue replicar o CASE WHEN
        // sem um campo auxiliar. Vamos manter a ordenação por 'updatedAt' como principal.
        { updatedAt: "desc" },
      ],
      skip: offset,
      take: limit,
    });
    return {
      tickets: transformTickets(
        tickets as TicketWithStandardIncludes[]
      ) as TicketWithMessages,
      count,
    };
  }
  async update(
    id: number,
    data: Prisma.TicketUpdateInput
  ): Promise<TicketWithMessages> {
    const ticket = await prisma.ticket.update({
      where: { id },
      data,
      include: TICKET_INCLUDE_CONFIG,
    });
    return transformTickets(
      ticket as TicketWithStandardIncludes
    ) as TicketWithMessages;
  }
}

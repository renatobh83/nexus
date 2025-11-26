import { Prisma, Ticket } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { TicketWithMessages } from "./tickets.type";
import { getFullMediaUrl } from "../../ultis/getFullMediaUrl";

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
  // async findTicketsRaw(params: {
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
  // }): Promise<{ tickets: Ticket[]; count: number }> {
  //   const {
  //     tenantId,
  //     status,
  //     queuesIdsUser,
  //     userId,
  //     isUnread,
  //     isNotAssigned,
  //     isNotViewAssignedTickets,
  //     isSearchParam,
  //     searchParam,
  //     limit,
  //     offset,
  //     profile,
  //     isExistsQueueTenant,
  //     NotQueueDefinedTicket,
  //   } = params;

  //   // A query original é muito complexa e usa recursos específicos do PostgreSQL
  //   // como jsonb_build_object e count(*) OVER ().
  //   // Para manter a funcionalidade exata, usamos $queryRaw.
  //   // Os nomes das tabelas e colunas foram ajustados para o padrão do Prisma (PascalCase para tabelas, camelCase para colunas)
  //   // e para corresponder ao SQL original (entre aspas duplas).

  //   // NOTA: O Prisma.$queryRaw não suporta substituição de parâmetros nomeados (:paramName)
  //   // como o Sequelize. É necessário usar interpolação de tags de template (Prisma.sql)
  //   // ou passar os parâmetros na ordem correta para $queryRawUnsafe.
  //   // Usaremos a tag de template Prisma.sql para segurança e legibilidade.

  //   // Prepara as condições dinâmicas para a cláusula WHERE
  //   const statusCondition = Prisma.sql`t.status IN (${Prisma.join(status)})`;

  //   const queueCondition = Prisma.sql`
  //     (
  //       (${profile} = 'admin')
  //       OR
  //       (${isExistsQueueTenant} = true AND t."queueId" IN (${Prisma.join(
  //     queuesIdsUser
  //   )}))
  //       OR
  //       (${NotQueueDefinedTicket} = true)
  //       OR
  //       (t."userId" = ${userId})
  //       OR
  //       (t."isGroup" = true)
  //       OR
  //       (${isExistsQueueTenant} = false)
  //     )
  //   `;

  //   const unreadCondition = isUnread
  //     ? Prisma.sql`t."unreadMessages" > 0`
  //     : Prisma.sql`TRUE`;

  //   const notAssignedCondition = isNotAssigned
  //     ? Prisma.sql`t."userId" IS NULL`
  //     : Prisma.sql`TRUE`;

  //   const searchCondition = isSearchParam
  //     ? Prisma.sql`
  //       (
  //         (t.id::text LIKE ${searchParam}) OR
  //         (EXISTS (
  //           SELECT 1 FROM "Contact" c
  //           WHERE c.id = t."contactId" AND
  //           (UPPER(c."name") LIKE UPPER(${searchParam}) OR c."number" LIKE ${searchParam})
  //         ))
  //       )
  //     `
  //     : Prisma.sql`TRUE`;

  //   const viewAssignedCondition = isNotViewAssignedTickets
  //     ? Prisma.sql`
  //       (
  //         (${profile} = 'admin')
  //         OR
  //         (t."userId" = ${userId} OR t."userId" IS NULL)
  //       )
  //     `
  //     : Prisma.sql`TRUE`; // Se a config estiver desligada, não restringe

  //   // Reconstruindo a query com Prisma.sql
  //   const query = Prisma.sql`
  //     SELECT
  //       COUNT(*) OVER () AS count,
  //       c."profilePicUrl",
  //       c."name",
  //       u."name" AS username,
  //       q.queue,
  //       em."name" AS empresaNome,
  //       jsonb_build_object('id', w.id, 'name', w."name") AS whatsapp,
  //       t.*
  //     FROM "Tickets" t
  //     INNER JOIN "Whatsapp" w ON (w.id = t."whatsappId")
  //     LEFT JOIN "Contacts" c ON (t."contactId" = c.id)
  //     LEFT JOIN "Empresas" em ON (t."empresaId" = em.id)
  //     LEFT JOIN "Users" u ON (u.id = t."userId")
  //     LEFT JOIN "Queues" q ON (t."queueId" = q.id)

  //     WHERE t."tenantId" = ${tenantId}
  //     AND c."tenantId" = ${tenantId}
  //     AND t."chatFlowId" IS NULL
  //     AND ${statusCondition}
  //     AND ${queueCondition}
  //     AND ${unreadCondition}
  //     AND ${notAssignedCondition}
  //     AND ${searchCondition}
  //     AND ${viewAssignedCondition}
  //     ORDER BY
  //       CASE t.status
  //         WHEN 'pending' THEN 0
  //         WHEN 'open' THEN 1
  //         WHEN 'closed' THEN 2
  //         ELSE 3
  //       END,
  //       t."updatedAt" DESC
  //     LIMIT ${limit} OFFSET ${offset};
  //   `;

  //   // Executa a query
  //   const ticketsRaw: any[] = await prisma.$queryRaw(query);

  //   // O Prisma.$queryRaw retorna um array de objetos.
  //   // O campo 'count' vem de 'COUNT(*) OVER ()' e está em cada objeto.
  //   const count = ticketsRaw.length > 0 ? Number(ticketsRaw[0].count) : 0;

  //   // Remove o campo 'count' dos tickets para retornar apenas os dados do ticket
  //   const tickets = ticketsRaw.map(({ count, ...ticket }) => ticket as Ticket);

  //   return { tickets, count };
  // }
  async findById(id: number): Promise<TicketWithMessages | null> {
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: id,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            number: true,
            telegramId: true,
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
        empresa: true,
        messages: {
          include: {
            ticket: true,
            quotedMsg: true,
          },
          orderBy: {
            updatedAt: "asc",
          },
        },
        queue: true,
        tenant: { select: { id: true } },
      },
    });
    if (!ticket) return null;
    const MessageForResponse = ticket.messages.map((message) => {
      const newQuot = {
        ...message.quotedMsg,
        mediaUrl: message.quotedMsg?.mediaUrl
          ? getFullMediaUrl(message.quotedMsg?.mediaUrl)
          : null,
      };
      return {
        ...message,
        mediaUrl: getFullMediaUrl(message.mediaUrl),
        quotedMsg: newQuot,
      };
    });
    return {
      ...ticket,
      messages: MessageForResponse,
    };
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
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            number: true,
            telegramId: true,
          },
        },
      },
    });
    if (!ticket) {
      ticket = await prisma.ticket.create({ data: data });
    }
    return ticket;
  }
  async findOne(where: Prisma.TicketWhereInput): Promise<any | null> {
    const ticket = await prisma.ticket.findFirst({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            number: true,
            email: true,
            profilePicUrl: true,
          },
        },
        user: {
          select: {
            name: true,
            id: true,
          },
        },
        whatsapp: {
          select: {
            name: true,
            id: true,
          },
        },
        chamado: {
          select: {
            id: true,
          },
        },
        chatFlow: {
          select: {
            id: true,
          },
        },
        empresa: {
          select: {
            id: true,
            name: true,
          },
        },
        messages: {
          include: {
            ticket: true,
            quotedMsg: true,
          },
          orderBy: {
            updatedAt: "asc",
          },
        },
        queue: true,
        tenant: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc", // Ordena do mais recente para o mais antigo
      },
    });
    if (!ticket) return null;

    const MessageForResponse = ticket.messages.map((message) => {
      const newQuot = {
        ...message.quotedMsg,
        mediaUrl: message.quotedMsg?.mediaUrl
          ? getFullMediaUrl(message.quotedMsg?.mediaUrl)
          : null,
      };
      return {
        ...message,
        mediaUrl: getFullMediaUrl(message.mediaUrl),
        quotedMsg: newQuot,
      };
    });

    return {
      ...ticket,
      messages: MessageForResponse,
      username: ticket.user?.name,
      contactId: ticket.contact.id,
      empresanome: ticket.empresa?.name,
      name: ticket.contact.name,
      profilePicUrl: ticket.contact.profilePicUrl,
    };
  }
  // async findAll(): Promise<Ticket[]> {
  //   return await prisma.ticket.findMany({
  //     include: {
  //       contact: {
  //         select: {
  //           id: true,
  //           name: true,
  //           email: true,
  //           number: true,
  //         },
  //       },
  //       user: {
  //         select: {
  //           name: true,
  //           id: true,
  //         },
  //       },
  //       chamado: true,
  //       chatFlow: {
  //         select: {
  //           id: true,
  //         },
  //       },
  //       empresa: true,
  //       messages: true,
  //       queue: true,
  //       tenant: {
  //         select: {
  //           id: true,
  //         },
  //       },
  //       whatsapp: {
  //         select: {
  //           id: true,
  //           name: true,
  //         },
  //       },
  //     },
  //   });
  // }
  async create(data: Prisma.TicketCreateInput): Promise<any> {
    const ticket = await prisma.ticket.create({
      data: data,
      include: {
        contact: true,
        empresa: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return {
      ...ticket,
      username: ticket.user?.name,
      contactId: ticket.contact.id,
      empresanome: ticket.empresa,
      name: ticket.contact.name,
      profilePicUrl: ticket.contact.profilePicUrl,
    };
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
      include: {
        // Inclui as relações necessárias para replicar o SELECT da raw query
        contact: { select: { profilePicUrl: true, name: true, id: true } },
        user: { select: { name: true } },
        queue: { select: { queue: true } },
        whatsapp: { select: { id: true, name: true } },
        empresa: { select: { name: true } },
        messages: {
          include: {
            ticket: true,
            quotedMsg: true,
          },

          orderBy: {
            updatedAt: "asc",
          },
        },
      },
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
    const tickeInline = tickets.map((ticket) => {
      const message = ticket.messages.map((message) => {
        const newQuot = {
          ...message.quotedMsg,
          mediaUrl: message.quotedMsg?.mediaUrl
            ? getFullMediaUrl(message.quotedMsg?.mediaUrl)
            : null,
        };console.log(message.mediaUrl)
        return {
          ...message,
          mediaUrl: getFullMediaUrl(message.mediaUrl),
          quotedMsg: newQuot,
        };
      });

      return {
        ...ticket,
        messages: message,
        username: ticket.user?.name,
        contactId: ticket.contact.id,
        empresanome: ticket.empresa,
        name: ticket.contact.name,
        profilePicUrl: ticket.contact.profilePicUrl,
      };
    });

    // NOTA SOBRE A ORDENAÇÃO: A ordenação original com CASE WHEN (pending -> open -> closed)
    // não pode ser replicada diretamente no Prisma ORM sem um campo auxiliar no banco de dados
    // ou sem voltar para o $queryRaw. Para fins de demonstração do findMany,
    // a ordenação principal será por 'updatedAt' descendente.

    return { tickets: tickeInline, count };
  }
  async update(id: number, data: Prisma.TicketUpdateInput): Promise<any> {
    const ticket = await prisma.ticket.update({
      where: { id },
      data,
      include: {
        messages: {
          include: {
            ticket: true,
            quotedMsg: true,
          },
          orderBy: {
            updatedAt: "asc",
          },
        },
        user: {
          select: {
            name: true,
            id: true,
          },
        },
        empresa: {
          select: {
            id: true,
            name: true,
          },
        },
        contact: {
          select: {
            id: true,
            name: true,
            number: true,
            email: true,
            profilePicUrl: true,
          },
        },
      },
    });
    const MessageForResponse = ticket.messages.map((message) => {
      const newQuot = {
        ...message.quotedMsg,
        mediaUrl: message.quotedMsg?.mediaUrl
          ? getFullMediaUrl(message.quotedMsg?.mediaUrl)
          : null,
      };
      return {
        ...message,
        mediaUrl: getFullMediaUrl(message.mediaUrl),
        quotedMsg: newQuot,
      };
    });

    return {
      ...ticket,
      messages: MessageForResponse,
      username: ticket.user?.name,
      contactId: ticket.contact.id,
      empresanome: ticket.empresa,
      name: ticket.contact.name,
      profilePicUrl: ticket.contact.profilePicUrl,
    };
  }

  //   delete(id: string): Promise<void>;
}

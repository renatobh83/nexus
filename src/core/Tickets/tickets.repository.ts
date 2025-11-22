import { Prisma, Ticket } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export interface ITicketRepository {
    findTickets(params: {
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
    }): Promise<{ tickets: Ticket[]; count: number }>;

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
        return userQueues.map(uq => ({ queueId: uq.queueId }));
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
    }): Promise<{ tickets: Ticket[]; count: number }> {

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

        // A query original é muito complexa e usa recursos específicos do PostgreSQL
        // como jsonb_build_object e count(*) OVER ().
        // Para manter a funcionalidade exata, usamos $queryRaw.
        // Os nomes das tabelas e colunas foram ajustados para o padrão do Prisma (PascalCase para tabelas, camelCase para colunas)
        // e para corresponder ao SQL original (entre aspas duplas).

        // NOTA: O Prisma.$queryRaw não suporta substituição de parâmetros nomeados (:paramName)
        // como o Sequelize. É necessário usar interpolação de tags de template (Prisma.sql)
        // ou passar os parâmetros na ordem correta para $queryRawUnsafe.
        // Usaremos a tag de template Prisma.sql para segurança e legibilidade.

        // Prepara as condições dinâmicas para a cláusula WHERE
        const statusCondition = Prisma.sql`t.status IN (${Prisma.join(status)})`;

        const queueCondition = Prisma.sql`
      (
        (${profile} = 'admin')
        OR
        (${isExistsQueueTenant} = true AND t."queueId" IN (${Prisma.join(queuesIdsUser)}))
        OR
        (${NotQueueDefinedTicket} = true)
        OR
        (t."userId" = ${userId})
        OR
        (t."isGroup" = true)
        OR
        (${isExistsQueueTenant} = false)
      )
    `;

        const unreadCondition = isUnread
            ? Prisma.sql`t."unreadMessages" > 0`
            : Prisma.sql`TRUE`;

        const notAssignedCondition = isNotAssigned
            ? Prisma.sql`t."userId" IS NULL`
            : Prisma.sql`TRUE`;

        const searchCondition = isSearchParam
            ? Prisma.sql`
        (
          (t.id::text LIKE ${searchParam}) OR
          (EXISTS (
            SELECT 1 FROM "Contact" c
            WHERE c.id = t."contactId" AND
            (UPPER(c."name") LIKE UPPER(${searchParam}) OR c."number" LIKE ${searchParam})
          ))
        )
      `
            : Prisma.sql`TRUE`;

        const viewAssignedCondition = isNotViewAssignedTickets
            ? Prisma.sql`
        (
          (${profile} = 'admin')
          OR
          (t."userId" = ${userId} OR t."userId" IS NULL)
        )
      `
            : Prisma.sql`TRUE`; // Se a config estiver desligada, não restringe

        // Reconstruindo a query com Prisma.sql
        const query = Prisma.sql`
      SELECT
        COUNT(*) OVER () AS count,
        c."profilePicUrl",
        c."name",
        u."name" AS username,
        q.queue,
        em."name" AS empresaNome,
        jsonb_build_object('id', w.id, 'name', w."name") AS whatsapp,
        t.*,
        m.*
      FROM "Tickets" t
      INNER JOIN "Whatsapp" w ON (w.id = t."whatsappId")
      LEFT JOIN "Contacts" c ON (t."contactId" = c.id)
      LEFT JOIN "Empresas" em ON (t."empresaId" = em.id)
      LEFT JOIN "Users" u ON (u.id = t."userId")
      LEFT JOIN "Queues" q ON (t."queueId" = q.id)
      LEFT JOIN "Messages" m On (t."id" = m.ticketid)
      WHERE t."tenantId" = ${tenantId}
      AND c."tenantId" = ${tenantId}
      AND t."chatFlowId" IS NULL
      AND ${statusCondition}
      AND ${queueCondition}
      AND ${unreadCondition}
      AND ${notAssignedCondition}
      AND ${searchCondition}
      AND ${viewAssignedCondition}
      ORDER BY
        CASE t.status
          WHEN 'pending' THEN 0
          WHEN 'open' THEN 1
          WHEN 'closed' THEN 2
          ELSE 3
        END,
        t."updatedAt" DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

        // Executa a query
        const ticketsRaw: any[] = await prisma.$queryRaw(query);

        // O Prisma.$queryRaw retorna um array de objetos.
        // O campo 'count' vem de 'COUNT(*) OVER ()' e está em cada objeto.
        const count = ticketsRaw.length > 0 ? Number(ticketsRaw[0].count) : 0;

        // Remove o campo 'count' dos tickets para retornar apenas os dados do ticket
        const tickets = ticketsRaw.map(({ count, ...ticket }) => ticket as Ticket);

        return { tickets, count };
    }
    async findById(id: number): Promise<Ticket | null> {
        return await prisma.ticket.findUnique({
            where: {
                id:
                    id
            }, include: {
                contact: true,
                user: {
                    select: {
                        name: true,
                        id: true
                    }
                },
                whatsapp: {
                    select: {
                        name: true,
                        id: true
                    }
                },
                chamado: true,
                chatFlow: true,
                empresa: true,
                messages: true,
                queue: true,
                tenant: true

            }
        })
    }
    async findOne(where: Prisma.TicketWhereInput): Promise<Ticket | null> {
        return await prisma.ticket.findFirst({
            where, include: {
                contact: true,
                user: {
                    select: {
                        name: true,
                        id: true
                    }
                },
                whatsapp: {
                    select: {
                        name: true,
                        id: true
                    }
                },
                chamado: true,
                chatFlow: true,
                empresa: true,
                messages: true,
                queue: true,
                tenant: true
            }
        })
    }
    async findAll(): Promise<Ticket[]> {
        return await prisma.ticket.findMany({
            include: {
                contact: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        number: true
                    }
                },
                user: {
                    select: {
                        name: true,
                        id: true
                    }
                },
                chamado: true,
                chatFlow: {
                    select: {
                        id: true,

                    }
                },
                empresa: true,
                messages: true,
                queue: true,
                tenant: {
                    select: {
                        id: true
                    }
                },
                whatsapp: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })
    }
    async create(data: Prisma.TicketCreateInput): Promise<Ticket> {
        return await prisma.ticket.create({ data: data })
    }
    //   update(id: string, data: Partial<MinhaEntidade>): Promise<MinhaEntidade>;
    //   delete(id: string): Promise<void>;

}
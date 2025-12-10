import { Prisma } from "@prisma/client";
import { StatistiscRepository } from "./statistics.respository";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import { prisma } from "../../lib/prisma";
import { TICKET_INCLUDE_CONFIG } from "../Tickets/tickets.type";

export class StatisticsServices {
  private staticRepository: StatistiscRepository;
  constructor() {
    this.staticRepository = new StatistiscRepository();
  }

  async chamadosByPeriodo(dataPesquisa: string) {
    return this.staticRepository.gerarRelatorioComPrisma(dataPesquisa);
  }
  async donwloadRelatorio(empresaId: number, period: string) {
    return this.staticRepository.generateAndDownloadPDF(empresaId, period);
  }

  async ticketsQueues(data: any) {
    const {
      dateEnd,
      dateStart,
      status,
      queuesIds,
      tenantId,
      userId,
      profile,
      showAll,
    } = data;
    const isAdmin = profile === "admin";

    let whereCondition: Prisma.TicketWhereInput = {};

    if (!isAdmin && showAll !== true) {
      whereCondition = {
        ...whereCondition,
        OR: [{ userId }],
      };
    }
    if (showAll === true) {
      whereCondition = {
        ...whereCondition,
        tenantId,
      };
    }
    if (status) {
      whereCondition = {
        ...whereCondition,
        status,
      };
    }
    if (dateStart && dateEnd) {
      whereCondition = {
        ...whereCondition,
        OR: [
          {
            createdAt: {
              gte: startOfDay(parseISO(dateStart)),
              lte: endOfDay(parseISO(dateEnd)),
            },
          },
        ],
      };
    }

    const tickets = await prisma.ticket.findMany({
      where: whereCondition,
      include: TICKET_INCLUDE_CONFIG,
      orderBy: {
        updatedAt: "desc",
      },
    });
    return tickets;
  }
}

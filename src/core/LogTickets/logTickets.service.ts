import { LogTicketRepository } from "./logTickets.repository";

export class LogTicketService {
  private logTicketRepository: LogTicketRepository;

  constructor() {
    this.logTicketRepository = new LogTicketRepository();
  }
  private toNumber(value: string) {
    return parseInt(value, 10);
  }
  async createLogTicket({
    userId,
    ticketId,
    type,
    queueId,
    tenantId,
    chamadoId,
  }) {
    let dataForPrisma: any = {
      type,
    };

    if (tenantId) {
      dataForPrisma.tenant = {
        connect: { id: this.toNumber(tenantId) },
      };
    }
    if (ticketId) {
      dataForPrisma.ticket = {
        connect: { id: this.toNumber(ticketId) },
      };
    }

    if (queueId) {
      dataForPrisma.queue = {
        connect: { id: this.toNumber(queueId) },
      };
    }

    if (userId) {
      dataForPrisma.user = {
        connect: { id: this.toNumber(userId) },
      };
    }
    if (chamadoId) {
      dataForPrisma.chamado = {
        connect: { id: this.toNumber(chamadoId) },
      };
    }

    await this.logTicketRepository.create(dataForPrisma);
  }
}

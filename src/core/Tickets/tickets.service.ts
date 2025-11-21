import { Prisma, Ticket } from "@prisma/client";
import { TicketRepository } from "./tickets.repository";


export class TicketService {
    private ticketRepository: TicketRepository

    constructor() {
        this.ticketRepository = new TicketRepository()
    }

    async findTicketId(id: number) {
        return this.ticketRepository.findById(id)
    }
    async findTicketBy(where: Prisma.TicketWhereInput): Promise<Ticket | null> {
        return this.ticketRepository.findOne(where)
    }
    async createTicket(data: any): Promise<Ticket> {
        const { contact, whatsappId,groupContact,tenantId, msg, ...restData } = data
        const dataForPrisma = {
            ...restData,
        };
        dataForPrisma.contact = {
            connect: { id: contact.id },
        }
        dataForPrisma.whatsapp = {
            connect: { id: whatsappId }
        }
        dataForPrisma.tenant = {
            connect: {id: tenantId}
        }
        dataForPrisma.isGroup = groupContact
        dataForPrisma.chatFlowStatus = "not_started"

        const ticket = await this.ticketRepository.create(dataForPrisma)
        return ticket

    }
}
import { Prisma, Ticket } from "@prisma/client";
import { TicketRepository } from "./tickets.repository";
import { AppError } from "../../errors/errors.helper";
import { SettingsRepository } from "../Settings/settings.repository";



interface Request {
    searchParam?: string;
    pageNumber?: string;
    status?: string[];
    date?: string;
    showAll?: string;
    userId: string;
    withUnreadMessages?: string;
    isNotAssignedUser?: string;
    queuesIds?: string[];
    includeNotQueueDefined?: string;
    tenantId: string | number;
    profile: string;
}
export class TicketService {
    private ticketRepository: TicketRepository

    private settingsRepositoy: SettingsRepository
    constructor() {
        this.ticketRepository = new TicketRepository()
        this.settingsRepositoy = new SettingsRepository()
    }

    async findTicketId(id: number) {
        return this.ticketRepository.findById(id)
    }
    async findTicketBy(where: Prisma.TicketWhereInput): Promise<Ticket | null> {
        return this.ticketRepository.findOne(where)
    }
    async teste(){
        return this.ticketRepository.findAll()
    }
    async findAll(
        {
            searchParam = "",
            pageNumber = "1",
            status,
            showAll,
            userId: userIdStr,
            withUnreadMessages,
            queuesIds,
            isNotAssignedUser,
            includeNotQueueDefined,
            tenantId: tenantIdStr,
            profile,
        }: Request
    ) {
        const tenantId = +tenantIdStr;
        const userId = +userIdStr;
        const limit = 50;
        const offset = limit * (+pageNumber - 1);

        // 1. Lógica de tratamento de parâmetros
        const isAdminShowAll = showAll == "true" && profile === "admin";
        const isUnread =  withUnreadMessages == "true";
        const isNotAssigned =  isNotAssignedUser == "true";
        
        const NotQueueDefinedTicket = includeNotQueueDefined === "true";
        const isSearchParam = !!searchParam;

        // 2. Tratamento das configurações do sistema (ListSettingsService)
        const settings = await this.settingsRepositoy.findFirst({ tenantId: tenantId})
       
        // const isNotViewAssignedTickets =
        //     settings?.find((s) => s.key === "NotViewAssignedTickets")?.value === "enabled";

        // 3. Validação de Status
        let finalStatus = status;
        if (!finalStatus && !isAdminShowAll) {
            throw new AppError("ERR_NO_STATUS_SELECTED", 404);
        }

        if (isAdminShowAll) {
            finalStatus = ["open", "pending", "closed"];
        }

        // 4. Lógica de Filas (Queues)
        const queueCount = await this.ticketRepository.countQueuesByTenant(tenantId);
        const isExistsQueueTenant = queueCount > 0;

        const userQueues = await this.ticketRepository.findUserQueues(userId);
        let queuesIdsUser = userQueues.map((q) => q.queueId);

        // Aplica filtro de filas se houver
        if (queuesIds) {
            const newArray: number[] = [];
            const userQueueIdsSet = new Set(queuesIdsUser);

            queuesIds.forEach((i) => {
                const queueId = +i;
                // Verifica se a fila solicitada está entre as filas do usuário
                if (userQueueIdsSet.has(queueId)) {
                    newArray.push(queueId);
                }
            });
            queuesIdsUser = newArray.length ? newArray : [0];
        }

        // Se não houver filas para o usuário, ajusta para [0] para o SQL
        if (!queuesIdsUser.length) {
            queuesIdsUser = [0];
        }
        const tickets = await this.ticketRepository.findAll()
        console.log(tickets)
        // return this.ticketRepository.findTickets({
        //     tenantId,
        //     status: finalStatus!,
        //     queuesIdsUser,
        //     userId,
        //     isUnread,
        //     isNotAssigned ,
        //     isNotViewAssignedTickets: true,
        //     isSearchParam,
        //     searchParam: `%${searchParam}%`,
        //     limit,
        //     offset,
        //     profile,
        //     isExistsQueueTenant,
        //     NotQueueDefinedTicket,
        // })
    }
    async createTicket(data: any): Promise<Ticket> {
        const { contact, whatsappId, chatFlowId, groupContact, tenantId, msg, ...restData } = data

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
            connect: { id: tenantId }
        }
        dataForPrisma.chatFlow = {
            connect: { id: chatFlowId }
        }
        dataForPrisma.isGroup = groupContact
        dataForPrisma.chatFlowStatus = "not_started"

        const ticket = await this.ticketRepository.create(dataForPrisma)
        return ticket

    }
}
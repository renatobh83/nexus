import { Prisma, Ticket } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class TicketRepository {
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
                }
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
                }
            }
        })
    }
    //   findAll(): Promise<MinhaEntidade[]>;
     async create(data: Prisma.TicketCreateInput): Promise<Ticket>{
        // try {
            
            return await prisma.ticket.create({data: data})
        // } catch (error) {
        //     console.log(JSON.stringify(error,null, 2))
        // }
     }
    //   update(id: string, data: Partial<MinhaEntidade>): Promise<MinhaEntidade>;
    //   delete(id: string): Promise<void>;

}